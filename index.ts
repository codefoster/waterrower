import { Subject } from 'rxjs/Rx';
import * as serialport from 'serialport';
import * as ayb from 'all-your-base';
import actions from './actions';

export default class WaterRower {
    port: serialport.SerialPort;
    data$: Subject<string> = new Subject<string>();

    private distance_l = 0;
    private distance_h = 0;
    private strokeRate = 0;
    private speed_l = 0;
    private speed_h = 0;
    private clock = 0;

    constructor(options?: WaterRowerOptions) {
        let portName = options.portName;
        let baudRate = options.baudRate || 19200;
        let refreshRate = options.refreshRate || 200;


        if (options.simulationMode) {
            //TODO: implement simulation mode
        }
        else {
            if (!portName) throw "A port name is required";

            // setup the serial port
            this.port = new serialport.SerialPort(portName, {
                baudrate: baudRate,
                disconnectedCallback: function () { console.log('disconnected'); },
                parser: serialport.parsers.readline("\n")
            });

            // setup port events
        this.port.on('open', () => {
                console.log(`A connection to the WaterRower has been established on ${portName}`);

                this.initialize(); //start things off
                this.setDisplayUnits(); //change the display to meters
                this.reset(); //reset the waterrower 

            setInterval(() => {
                    this.requestDistance();
                    this.requestSpeed();
                    this.requestClock();
                }, refreshRate);
            });

            this.port.on('data', d => this.data$.next(d));
            this.port.on('closed', () => console.log('connection closed'));
            this.port.on('error', err => console.log('Please plug in your WaterRower and start again...'));

        }

        //when a message is received, apply the appropriate action
        this.data$.subscribe(d => {
            actions.forEach(function (a) {
                var matches = a.pattern.exec(d);
                if (matches && a.action) a.action(matches);
            });
        })
    }

    /// initialize the connection    
    initialize() {
        this.send('USB');
    }

    /// send a serial message
    private send(value) {
        this.port.write(value + '\r\n');
    }

    /// get current data
    get data() {
        return {
            distance: ayb.hexToDec(this.distance_h + '' + this.distance_l),
            strokeRate: ayb.hexToDec(this.strokeRate.toString()),
            speed: ayb.hexToDec(this.speed_h + '' + this.speed_l),
            clock: ayb.hexToDec(this.clock.toString()),
        }
    }

    /// reset console
    reset() {
        this.send('RESET'); //reset the waterrower 
    }

    /// set up new workout session on the WR with set distance
    startWorkout(options: StartWorkoutOptions) {
        this.send('WSI1' + ayb.decToHex(options.distance));
    }

    /// request distance data
    requestDistance() {
        this.send('IRS055'); //low byte of distance (m)
        this.send('IRS056'); //hi byte of distance (m)
    }

    /// request speed data
    requestSpeed() {
        this.send('IRS14A'); //low byte of average speed (m/s)
        this.send('IRS14B'); //hi byte of average speed (m/s)
    }

    /// request clock data
    requestClock() {
        this.send('IRS1E1'); //clock seconds
    }

    /// change the display to meters
    private setDisplayUnits() {
        this.send('DDME');
    }

}

export interface WaterRowerOptions {
    portName: string;
    baudRate?: number;
    refreshRate?: number;
    simulationMode?: boolean;
}

export interface StartWorkoutOptions {
    distance: number;
}