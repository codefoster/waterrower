import { Subject } from 'rxjs/Rx';
import * as serialport from 'serialport';
import * as ayb from 'all-your-base';
import config from './config';

export default class WaterRower {
    port: serialport.SerialPort;
    data$: Subject<string> = new Subject<string>();
    
    private actions;
    private distance_l = 0;
    private distance_h = 0;
    private strokeRate = 0;
    private speed_l = 0;
    private speed_h = 0;
    private clock = 0;

    constructor(options?:WaterRowerOptions) {
        let portName = options.portName || config.portName;
        let baudRate = options.baudRate || config.baudRate || 19200;
        let refreshRate = options.refreshRate || config.refreshRate || 200;

        if(!portName) throw "A port name is required";
        
        // setup the serial port
        this.port = new serialport.SerialPort(portName, {
            baudrate: baudRate,
            disconnectedCallback: function () { console.log('disconnected'); },
            parser: serialport.parsers.readline("\n")
        });

        // when the port opens, initialize it
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

        //when data comes in from the serial port, push it into our Rx Subject
        this.port.on('data', d => this.data$.next(d));

        //when a message is received, apply the appropriate action
        this.data$.subscribe(d => {
            this.actions.forEach(function (a) {
                var matches = a.pattern.exec(d);
                if (matches && a.action) a.action(matches);
            });
        })

        this.port.on('closed', () => console.log('connection closed'));
        this.port.on('error', err => console.log('Please plug in your WaterRower and start again...'));

        // this is the declarative list of things to do when the
        // waterrower sends us a data message
        // it uses regular expressions to respond to certain message patterns
        // m is the matches array and m[1] is the value of the primary regex match
        this.actions = [
            {
                name: 'distance (low byte)',
                pattern: /IDS055([\dA-F]+)/,
                action: m => {
                    if (this.distance_l != m[1]) {
                        this.distance_l = m[1];
                        this.data$.next(null);
                    }
                }
            },
            {
                name: 'distance (high byte)',
                pattern: /IDS056([\dA-F]+)/,
                action: m => this.distance_h = m[1]
            },
            {
                name: 'speed (low byte)',
                pattern: /IDS14A([\dA-F]+)/,
                action: m => {
                    if (this.speed_l != m[1])
                        this.speed_l = m[1];
                }
            },
            {
                name: 'speed (high byte)',
                pattern: /IDS14B([\dA-F]+)/,
                action: m => {
                    if (this.speed_h != m[1]) {
                        this.speed_h = m[1];
                        this.data$.next(null);
                    }
                }
            },
            {
                name: 'stroke rate',
                pattern: /IDS142([\dA-F]+)/,
                action: m => {
                    if (this.strokeRate != m[1]) {
                        this.strokeRate = m[1];
                        this.data$.next(null);
                    }
                }
            },
            {
                name: 'clock (seconds)',
                pattern: /IDS1E1([\dA-F]+)/,
                action: m => {
                    if (this.clock != m[1]) {
                        this.clock = m[1];
                        this.data$.next(null);
                    }
                }
            },
            {
                name: 'pulse',
                pattern: /P(\d+)/,
                action: null
            }
        ];

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
    startWorkout(options:StartWorkoutOptions) {
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
    portName:string;
    baudRate:number;
    refreshRate:number;
}

export interface StartWorkoutOptions {
    distance:number;
}