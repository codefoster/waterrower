import { Subject } from 'rxjs/Rx';
import * as serialport from 'serialport';

export class WaterRower {
    portName = '/dev/ttyACM0';
    baudRate = '19200';
    refreshRate = 200;
    port;
    actions;
    data: Subject<string> = new Subject<string>();
    distance_l = 0;
    distance_h = 0;
    strokeRate = 0;
    speed_l = 0;
    speed_h = 0;
    clock = 0;

    constructor() {
        this.port = new serialport.SerialPort(this.portName, {
            baudrate: this.baudRate,
            disconnectedCallback: function () { console.log('disconnected'); },
            parser: serialport.parsers.readline("\n")
        });

        this.port.on('open', function () {
            console.log('connection open');

            this.send('USB'); //start things off
            this.send('DDME'); //change the display to meters
            this.send('RESET'); //reset the waterrower 

            // port.write('IV?\r\n'); //ask the waterrower for its model

            setInterval(function () {
                //request distance data
                this.send('IRS055');
                this.send('IRS056');

                //request speed data
                this.send('IRS14A');
                this.send('IRS14B');

                //request clock data
                this.send('IRS1E1');

            }, this.refreshRate);
        });

        //when a message is received, apply the appropriate action
        this.port.on('data', function (data) {
            this.actions.forEach(function (a) {
                var matches = a.pattern.exec(data);
                if (matches && a.action) a.action(matches);
            });
        });

        this.port.on('closed', function () { console.log('connection closed'); });
        this.port.on('error', function (err) { console.log('Please plug in your WaterRower and start again...'); });

        //this is the declarative list of things to do when the waterrower sends us a message
        this.actions = [
            {
                name: 'distance (low byte)',
                pattern: /IDS055([\dA-F]+)/,
                action: function (matches) {
                    if (this.distance_l != matches[1]) {
                        this.distance_l = matches[1];
                        this.data.next();
                    }
                }
            },
            {
                name: 'distance (high byte)',
                pattern: /IDS056([\dA-F]+)/,
                action: function (matches) { this.distance_h = matches[1]; }
            },
            {
                name: 'speed (low byte)',
                pattern: /IDS14A([\dA-F]+)/,
                action: function (matches) {
                    if (this.speed_l != matches[1])
                        this.speed_l = matches[1];
                }
            },
            {
                name: 'speed (high byte)',
                pattern: /IDS14B([\dA-F]+)/,
                action: function (matches) {
                    if (this.speed_h != matches[1]) {
                        this.speed_h = matches[1];
                        this.data.next();
                    }
                }
            },
            {
                name: 'stroke rate',
                pattern: /IDS142([\dA-F]+)/,
                action: function (matches) {
                    if (this.strokeRate != matches[1]) {
                        this.strokeRate = matches[1];
                        this.data.next();
                    }
                }
            },
            {
                name: 'clock (seconds)',
                pattern: /IDS1E1([\dA-F]+)/,
                action: function (matches) {
                    if (this.clock != matches[1]) {
                        this.clock = matches[1];
                        this.data.next();
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
    send(value) {
        // console.log('Sending: ' + value);
        this.port.write(value + '\r\n');
    }

    hexToDec(input) {
        var value;
        var total = 0;
        for (var i = 0; i < input.length; i++) {
            total = total * 16;
            value = input.charCodeAt(i) - 48;
            if (value > 9) {
                value = value - 7;
            }
            total = total + value;
        }
        return (total);
    }

    decToHex(input) {
        var value;
        var total = 0;
        for (var i = input.length - 1; i >= 0; i--) {
            total = total * 16;
            value = input.charCodeAt(i) - 48;
            if (value > 9) {
                value = value - 7;
            }
            total = total + value;
        }
        return (total);
    }

    getData = function () {
        return {
            distance: this.hexToDec(this.distance_h + '' + this.distance_l),
            strokeRate: this.hexToDec(this.strokeRate),
            speed: this.hexToDec(this.speed_h + '' + this.speed_l),
            clock: this.hexToDec(this.clock),
        }
    }

    reset = function () {
        this.send('RESET'); //reset the waterrower 
    }

    startRace = function (options) {
        console.log('options.distance: ' + options.distance);
        //set up new race using options.distance
        this.send('WSI1' + this.decToHex(options.distance));
    }

}