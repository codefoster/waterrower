import { Observable, Subject } from 'rxjs/Rx';
import * as serialport from 'serialport';
import * as ayb from 'all-your-base';
import * as _ from 'lodash';
import * as events from 'events';
import datapoints from './datapoints';
import types from './types';

export class WaterRower extends events.EventEmitter {
    private REFRESH_RATE = 200;
    private DEFAULT_BAUD_RATE = 19200;
    private port: serialport.SerialPort;

    // reads$ is all serial messages from the WR
    // datapoints$ isonly the reads that are a report of a memory location's value 
    reads$ = new Subject<{ type: string, pattern: RegExp, data: string }>();
    datapoints$: Observable<DataPoint>;

    constructor(options: WaterRowerOptions = {}) {
        super();
        if (options.simulationMode) {
            //simulate Waterrower initialization
            let h = _.find(types, t => t.type == 'hardwaretype');
            this.reads$.next({ type: h.type, pattern: h.pattern, data: null });

            //start sending datapoints
            let d = _.find(types, t => t.type == 'datapoint');
            //create temp state structure (since the rower actually uses its own state)
            //create document with simulated rowing data, iterate it here and send the data
            let dp;
            Observable.interval(1000).subscribe(() => {
                this.reads$.next({ type: d.type, pattern: d.pattern, data: dp });
            })
        }
        else {
            if (!options.portName) {
                console.log('No port configured. Attempting to discover...');
                this.discoverPort((name) => {
                    console.log('Discovered a WaterRower on ' + name + '...');
                    options.portName = name;
                    this.setupSerialPort(options);
                })
            }
            else {
                console.log('Setting up serial port on ' + options.portName + '...');
                this.setupSerialPort(options);
            }

        }

        // this is the important stream for reading memory locations from the rower
        // IDS is a single, IDD is a double, and IDT is a triple byte memory location
        this.datapoints$ = this.reads$.filter(d => d.type === 'datapoint')
            .map(d => {
                let m = d.pattern.exec(d.data);
                return {
                    name: _.find(datapoints, point => point.address == m[2]).name,
                    length: { 'S': 1, 'D': 2, 'T': 3 }[m[1]],
                    address: m[2],
                    value: m[3]
                };
            });

        this.datapoints$.subscribe(d => {
            this.emit('data', d);
            _.find(datapoints, d2 => d2.address == d.address).value = ayb.hexToDec(d.value);
        })

        // when the WR comes back with _WR_ then consider the WR initialized
        this.reads$.filter(d => d.type == 'hardwaretype').subscribe(d => {
            this.emit('initialized');
        });
    }

    private discoverPort(callback) {
        serialport.list((err, ports) => {
            let p = _.find(ports, p => p.manufacturer === 'Microchip Technology, Inc.');
            if (p) callback(p.comName);
        });
    }

    private setupSerialPort(options) {
        // setup the serial port
        this.port = new serialport.SerialPort(options.portName, {
            baudrate: options.baudRate || this.DEFAULT_BAUD_RATE,
            disconnectedCallback: function () { console.log('disconnected'); },
            parser: serialport.parsers.readline("\n")
        });

        // setup port events
        this.port.on('open', () => {
            console.log(`A connection to the WaterRower has been established on ${options.portName}`);
            this.initialize(); //start things off
            if (options.refreshRate !== 0) setInterval(() => this.requestAll(), options.refreshRate || this.REFRESH_RATE); //have to put requestAll in a fat arrow function for correct function binding
        });
        this.port.on('data', d => {
            let type = _.find(types, t => t.pattern.test(d));
            this.reads$.next({ type: (type ? type.type : 'other'), pattern: type.pattern, data: d })
        });
        this.port.on('closed', () => console.log('connection closed'));
        this.port.on('error', err => console.log('Please plug in your WaterRower and start again...'));
    }

    /// send a serial message
    private send(value): void {
        this.port.write(value + '\r\n');
    }

    /// initialize the connection    
    private initialize(): void {
        console.log('Initializing port...');
        this.send('USB');
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
    simulationMode?: boolean;
}

export interface DataPoint {
    name?: string,
    address: string,
    length: string,
    value: any
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