import { Observable, Subject } from 'rxjs/Rx';
import * as serialport from 'serialport';
import * as ayb from 'all-your-base';
import * as _ from 'lodash';
import * as events from 'events';
import datapoints from './datapoints';
import types from './types';
import * as fs from 'fs';
import * as readline from 'readline';
import * as moment from 'moment';
import * as path from 'path';

export class WaterRower extends events.EventEmitter {
    private refreshRate = 200;
    private baudRate = 19200;
    private port: serialport.SerialPort;
    private dataDirectory: string = 'data';
    private recordingSubscription;

    // reads$ is all serial messages from the WR
    // datapoints$ isonly the reads that are a report of a memory location's value 
    reads$ = new Subject<ReadValue>();
    datapoints$: Observable<DataPoint>;

    constructor(options: WaterRowerOptions = {}) {
        super();

        if (options.dataDirectory) this.dataDirectory = options.dataDirectory;

        if (!options.portName) {
            console.log('No port configured. Attempting to discover...');
            this.discoverPort(name => {
                if (name) {
                    console.log('Discovered a WaterRower on ' + name + '...');
                    options.portName = name;
                    this.setupSerialPort(options);
                }
                else
                    console.log('We didn\'t find any connected WaterRowers');
            })
        }
        else {
            console.log('Setting up serial port on ' + options.portName + '...');
            this.setupSerialPort(options);
        }

        this.setupStreams();

        process.on('SIGINT', () => {
            this.close();
        });

    }

    private discoverPort(callback) {
        serialport.list((err, ports) => {
            let p = _.find(ports, p => p.manufacturer === 'Microchip Technology, Inc.');
            if (p) callback(p.comName);
            else callback();
        });
    }

    private setupSerialPort(options) {
        // setup the serial port
        this.port = new serialport(options.portName, {
            baudrate: options.baudRate || this.baudRate,
            disconnectedCallback: function () { console.log('disconnected'); },
            parser: serialport.parsers.readline("\n")
        });

        // setup port events
        this.port.on('open', () => {
            console.log(`A connection to the WaterRower has been established on ${options.portName}`);
            this.initialize(); //start things off
            if (options.refreshRate !== 0) setInterval(() => this.requestAll(), options.refreshRate || this.refreshRate); //have to put requestAll in a fat arrow function for correct function binding
        });
        this.port.on('data', d => {
            let type = _.find(types, t => t.pattern.test(d));
            this.reads$.next({ time: Date.now(), type: (type ? type.type : 'other'), data: d })
        });
        this.port.on('closed', () => this.close);
        this.port.on('disconnect', () => this.close)
        this.port.on('error', err => {
            this.emit('error', err);
            this.close();
        });
    }

    private setupStreams() {
        // this is the important stream for reading memory locations from the rower
        // IDS is a single, IDD is a double, and IDT is a triple byte memory location
        this.datapoints$ = this.reads$.filter(d => d.type === 'datapoint')
            .map(d => {

                let pattern = _.find(types, t => t.type == 'datapoint').pattern;
                let m = pattern.exec(d.data);
                return {
                    name: _.find(datapoints, point => point.address == m[2]).name,
                    length: { 'S': 1, 'D': 2, 'T': 3 }[m[1]],
                    address: m[2],
                    value: m[3]
                };
            });

        //emit the data event
        this.datapoints$.subscribe(d => {
            let datapoint = _.find(datapoints, d2 => d2.address == d.address);
            datapoint.value = ayb.hexToDec(d.value);
            this.emit('data', datapoint);
        })

        // when the WR comes back with _WR_ then consider the WR initialized
        this.reads$.filter(d => d.type == 'hardwaretype').subscribe(d => {
            this.emit('initialized');
        });
    }

    /// send a serial message
    private send(value): void {
        if (this.port) this.port.write(value + '\r\n');
    }

    /// initialize the connection    
    private initialize(): void {
        console.log('Initializing port...');
        this.send('USB');
    }

    private close(): void {
        console.log('Closing WaterRower...');
        this.emit('close');
        this.reads$.complete();
        if (this.port) {
            this.port.close(err => console.log(err));
            this.port = null;
        }
        process.exit();
    }

    /// reset console
    reset(): void {
        console.log('Resetting WaterRower...');
        this.send('RESET'); //reset the waterrower 
    }

    /// Issues a request for a specific data point.
    /// There is no return value. Data point values can be read very
    /// shortly after the request is made 
    requestDataPoint(name: string): void {
        let dataPoint = _.find(datapoints, d => d.name == name);
        this.send(`IR${dataPoint.length}${dataPoint.address}`)
    }

    /// requestAll calls requestDataPoint on all of the datapoints
    requestAll(): void {
        datapoints.forEach(d => this.requestDataPoint(d.name));
    }

    /// find the value of a single datapoint
    readDataPoint(name: string): any {
        console.log('reading ' + name);
        return _.find(datapoints, d => d.name == name).value;
    }

    readAll(): Object {
        /// test, but I think this sets an initial value of {} and then iterates the
        /// datapoints adding the names/values as properties
        return datapoints.reduce((p, c) => p[c.name] = c.value, {})
    }

    startRecording(name?: string) {
        name = name || moment().format('YYYY-MM-DD-HH-mm-ss');
        this.recordingSubscription = this.reads$
            .filter(r => r.type != 'pulse') //pulses are noisy
            .subscribe(r => fs.appendFileSync(path.join(this.dataDirectory, name), JSON.stringify(r) + '\n'));
    }

    stopRecording() {
        this.recordingSubscription.unsubscribe();
    }

    getRecordings() {
        return fs.readdirSync(this.dataDirectory);
    }

    playRecording(name?: string) {
        name = name || 'simulationdata';
        let lineReader = readline.createInterface({ input: fs.createReadStream(path.join(this.dataDirectory, name), { encoding: 'utf-8' }) });
        let simdata$: Observable<ReadValue> = Observable.fromEvent<ReadValue>(lineReader, 'line').map(value => JSON.parse(value.toString()));
        let firstrow;
        simdata$.subscribe(row => {
            if (!firstrow) firstrow = row;
            let delta = row.time - firstrow.time;
            setTimeout(() => { this.reads$.next({ time: row.time, type: row.type, data: row.data }) }, delta);
        });
    }

    startSimulation() {
        this.playRecording();
    }

    /// set up new workout session on the WR with set distance
    defineDistanceWorkout(distance: number, units: Units = Units.Meters): void {
        this.send(`WSI${units}${ayb.decToHex(distance)}`);
    }

    /// set up new workout session on the WR with set duration
    defineDurationWorkout(seconds: number): void {
        this.send('WSU${ayb.decToHex(seconds)}');
    }

    /// change the display to meters, miles, kilometers, or strokes
    displaySetDistance(units: Units): void {
        let value = 'DD';
        switch (units) {
            case Units.Meters: value += 'ME'; break;
            case Units.Miles: value += 'MI'; break;
            case Units.Kilometers: value += 'KM'; break;
            case Units.Strokes: value += 'ST'; break;
            default: throw 'units must be meters, miles, kilometers, or strokes';
        }
        this.send(value);
    }

    /// change the intensity display
    displaySetIntensity(option: IntensityDisplayOptions): void {
        let value = 'DD';
        switch (option) {
            case IntensityDisplayOptions.MetersPerSecond: value += 'MS'; break;
            case IntensityDisplayOptions.MPH: value += 'MPH'; break;
            case IntensityDisplayOptions._500m: value += '500'; break;
            case IntensityDisplayOptions._2km: value += '2KM'; break;
            case IntensityDisplayOptions.Watts: value += 'WA'; break;
            case IntensityDisplayOptions.CaloriesPerHour: value += 'CH'; break;
        }
        this.send(value);
    }

    /// change the average intensity display
    displaySetAverageIntensity(option: AverageIntensityDisplayOptions): void {
        let value = 'DD';
        switch (option) {
            case AverageIntensityDisplayOptions.AverageMetersPerSecond: value += 'MS'; break;
            case AverageIntensityDisplayOptions.AverageMPH: value += 'MPH'; break;
            case AverageIntensityDisplayOptions._500m: value += '500'; break;
            case AverageIntensityDisplayOptions._2km: value += '2KM'; break;
            default: throw 'units must be meters, miles, kilometers, or strokes';
        }
        this.send(value);
    }
}


export interface WaterRowerOptions {
    portName?: string;
    baudRate?: number;
    refreshRate?: number;
    dataDirectory?: string;
}

export interface DataPoint {
    name?: string,
    address: string,
    length: string,
    value: any
}

export interface ReadValue {
    time: number
    type: string
    data: string
}

export enum IntensityDisplayOptions {
    MetersPerSecond,
    MPH,
    _500m,
    _2km,
    Watts,
    CaloriesPerHour
}

export enum AverageIntensityDisplayOptions {
    AverageMetersPerSecond,
    AverageMPH,
    _500m,
    _2km
}

export enum Units {
    Meters = 1,
    Miles = 2,
    Kilometers = 3,
    Strokes = 4
}