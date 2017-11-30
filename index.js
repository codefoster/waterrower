"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Rx_1 = require("rxjs/Rx");
var SerialPort = require("serialport");
var ayb = require("all-your-base");
var _ = require("lodash");
var events = require("events");
var datapoints_1 = require("./datapoints");
var types_1 = require("./types");
var fs = require("fs");
var readline = require("readline");
var moment = require("moment");
var path = require("path");
var WaterRower = /** @class */ (function (_super) {
    __extends(WaterRower, _super);
    function WaterRower(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this) || this;
        _this.refreshRate = 200;
        _this.baudRate = 19200;
        _this.dataDirectory = 'data';
        // reads$ is all serial messages from the WR
        // datapoints$ isonly the reads that are a report of a memory location's value 
        _this.reads$ = new Rx_1.Subject();
        _this.dataDirectory = options.dataDirectory || _this.dataDirectory;
        _this.refreshRate = options.refreshRate || _this.refreshRate;
        _this.baudRate = options.baudRate || _this.baudRate;
        _this.datapoints = options.datapoints;
        if (!options.portName) {
            console.log('No port configured. Attempting to discover...');
            _this.discoverPort(function (name) {
                if (name) {
                    console.log('Discovered a WaterRower on ' + name + '...');
                    options.portName = name;
                    _this.setupSerialPort(options);
                }
                else
                    console.log('We didn\'t find any connected WaterRowers');
            });
        }
        else {
            console.log('Setting up serial port on ' + options.portName + '...');
            _this.setupSerialPort(options);
        }
        _this.setupStreams();
        process.on('SIGINT', function () {
            _this.close();
        });
        return _this;
    }
    WaterRower.prototype.discoverPort = function (callback) {
        SerialPort.list(function (err, ports) {
            var p = _.find(ports, function (p) { return _.includes([
                'Microchip Technology, Inc.',
                'Microchip Technology Inc.' // macOS specific?
            ], p.manufacturer); });
            if (p)
                callback(p.comName);
            else
                callback();
        });
    };
    WaterRower.prototype.setupSerialPort = function (options) {
        var _this = this;
        // setup the serial port
        this.port = new SerialPort(options.portName, {
            baudRate: options.baudRate || this.baudRate,
            parser: SerialPort.parsers.Readline("\n")
        });
        // setup port events
        this.port.on('open', function () {
            console.log("A connection to the WaterRower has been established on " + options.portName);
            _this.initialize();
            if (options.refreshRate !== 0)
                setInterval(function () { return _this.requestDataPoints(_this.datapoints); }, _this.refreshRate);
        });
        this.port.on('data', function (d) {
            var type = _.find(types_1.default, function (t) { return t.pattern.test(d); });
            _this.reads$.next({ time: Date.now(), type: (type ? type.type : 'other'), data: d });
        });
        this.port.on('closed', function () { return _this.close; });
        this.port.on('disconnect', function () { return _this.close; });
        this.port.on('error', function (err) {
            _this.emit('error', err);
            _this.close();
        });
    };
    WaterRower.prototype.setupStreams = function () {
        var _this = this;
        // this is the important stream for reading memory locations from the rower
        // IDS is a single, IDD is a double, and IDT is a triple byte memory location
        this.datapoints$ = this.reads$
            .filter(function (d) { return d.type === 'datapoint'; })
            .map(function (d) {
            var pattern = _.find(types_1.default, function (t) { return t.type == 'datapoint'; }).pattern;
            var m = pattern.exec(d.data);
            return {
                time: new Date(d.time),
                name: _.find(datapoints_1.default, function (point) { return point.address == m[2]; }).name,
                length: { 'S': 1, 'D': 2, 'T': 3 }[m[1]],
                address: m[2],
                value: m[3]
            };
        });
        //emit the data event
        this.datapoints$.subscribe(function (d) {
            var datapoint = _.find(datapoints_1.default, function (d2) { return d2.address == d.address; });
            datapoint.value = parseInt(d.value, datapoint.radix);
            _this.emit('data', datapoint);
        });
        // when the WR comes back with _WR_ then consider the WR initialized
        this.reads$.filter(function (d) { return d.type == 'hardwaretype'; }).subscribe(function (d) {
            _this.emit('initialized');
        });
    };
    /// send a serial message
    WaterRower.prototype.send = function (value) {
        if (this.port)
            this.port.write(value + '\r\n');
    };
    /// initialize the connection    
    WaterRower.prototype.initialize = function () {
        console.log('Initializing port...');
        this.send('USB');
    };
    WaterRower.prototype.close = function () {
        console.log('Closing WaterRower...');
        this.emit('close');
        this.reads$.complete();
        if (this.port) {
            this.port.close(function (err) { return console.log(err); });
            this.port = null;
        }
        process.exit();
    };
    /// reset console
    WaterRower.prototype.reset = function () {
        console.log('Resetting WaterRower...');
        this.send('RESET'); //reset the waterrower 
    };
    /// Issues a request for one, more, or all data points.
    /// There is no return value. Data point values can be read very
    /// shortly after the request is made 
    WaterRower.prototype.requestDataPoints = function (points) {
        var _this = this;
        var req = function (name) {
            console.log('requesting ' + name);
            var dataPoint = _.find(datapoints_1.default, function (d) { return d.name == name; });
            _this.send("IR" + dataPoint.length + dataPoint.address);
        };
        if (points) {
            if (Array.isArray(points))
                points.forEach(function (p) { return req(p); });
            else if (typeof points === 'string')
                req(points);
            else
                throw ('requestDataPoint requires a string, an array of strings, or nothing at all');
        }
        else
            datapoints_1.default.forEach(function (d) { return req(d.name); });
    };
    WaterRower.prototype.readDataPoints = function (points) {
        if (points) {
            if (Array.isArray(points)) {
                return datapoints_1.default
                    .filter(function (dp) { return points.some(function (p) { return p == dp.name; }); }) //filter to the points that were passed in
                    .reduce(function (p, c) { p[c.name] = c.value; return p; }, {}); //build up an array of the chosen points
            }
            else if (typeof points === 'string')
                return _.find(datapoints_1.default, function (d) { return d.name == points; }).value;
            else
                throw ('readDataPoints requires a string, an array of strings, or nothing at all');
        }
        else
            return datapoints_1.default.reduce(function (p, c) { return p[c.name] = c.value; }, {});
    };
    WaterRower.prototype.startRecording = function (name) {
        var _this = this;
        name = name || moment().format('YYYY-MM-DD-HH-mm-ss');
        this.recordingSubscription = this.reads$
            .filter(function (r) { return r.type != 'pulse'; }) //pulses are noisy
            .subscribe(function (r) { return fs.appendFileSync(path.join(_this.dataDirectory, name), JSON.stringify(r) + '\n'); });
    };
    WaterRower.prototype.stopRecording = function () {
        this.recordingSubscription.unsubscribe();
    };
    WaterRower.prototype.getRecordings = function () {
        return fs.readdirSync(this.dataDirectory);
    };
    WaterRower.prototype.playRecording = function (name) {
        var _this = this;
        name = name || 'simulationdata';
        var lineReader = readline.createInterface({ input: fs.createReadStream(path.join(this.dataDirectory, name), { encoding: 'utf-8' }) });
        var simdata$ = Rx_1.Observable.fromEvent(lineReader, 'line')
            .filter(function (value) { return (value ? true : false); })
            .map(function (value) { return JSON.parse(value.toString()); });
        var firstrow;
        simdata$.subscribe(function (row) {
            if (!firstrow)
                firstrow = row;
            var delta = row.time - firstrow.time;
            setTimeout(function () { _this.reads$.next({ time: row.time, type: row.type, data: row.data }); }, delta);
        });
    };
    WaterRower.prototype.startSimulation = function () {
        this.playRecording();
    };
    /// set up new workout session on the WR with set distance
    WaterRower.prototype.defineDistanceWorkout = function (distance, units) {
        if (units === void 0) { units = Units.Meters; }
        this.send("WSI" + units + ayb.decToHex(distance));
    };
    /// set up new workout session on the WR with set duration
    WaterRower.prototype.defineDurationWorkout = function (seconds) {
        this.send("WSU" + ayb.decToHex(seconds));
    };
    /// change the display to meters, miles, kilometers, or strokes
    WaterRower.prototype.displaySetDistance = function (units) {
        var value = 'DD';
        switch (units) {
            case Units.Meters:
                value += 'ME';
                break;
            case Units.Miles:
                value += 'MI';
                break;
            case Units.Kilometers:
                value += 'KM';
                break;
            case Units.Strokes:
                value += 'ST';
                break;
            default: throw 'units must be meters, miles, kilometers, or strokes';
        }
        this.send(value);
    };
    /// change the intensity display
    WaterRower.prototype.displaySetIntensity = function (option) {
        var value = 'DD';
        switch (option) {
            case IntensityDisplayOptions.MetersPerSecond:
                value += 'MS';
                break;
            case IntensityDisplayOptions.MPH:
                value += 'MPH';
                break;
            case IntensityDisplayOptions._500m:
                value += '500';
                break;
            case IntensityDisplayOptions._2km:
                value += '2KM';
                break;
            case IntensityDisplayOptions.Watts:
                value += 'WA';
                break;
            case IntensityDisplayOptions.CaloriesPerHour:
                value += 'CH';
                break;
        }
        this.send(value);
    };
    /// change the average intensity display
    WaterRower.prototype.displaySetAverageIntensity = function (option) {
        var value = 'DD';
        switch (option) {
            case AverageIntensityDisplayOptions.AverageMetersPerSecond:
                value += 'MS';
                break;
            case AverageIntensityDisplayOptions.AverageMPH:
                value += 'MPH';
                break;
            case AverageIntensityDisplayOptions._500m:
                value += '500';
                break;
            case AverageIntensityDisplayOptions._2km:
                value += '2KM';
                break;
            default: throw 'units must be meters, miles, kilometers, or strokes';
        }
        this.send(value);
    };
    return WaterRower;
}(events.EventEmitter));
exports.WaterRower = WaterRower;
var IntensityDisplayOptions;
(function (IntensityDisplayOptions) {
    IntensityDisplayOptions[IntensityDisplayOptions["MetersPerSecond"] = 0] = "MetersPerSecond";
    IntensityDisplayOptions[IntensityDisplayOptions["MPH"] = 1] = "MPH";
    IntensityDisplayOptions[IntensityDisplayOptions["_500m"] = 2] = "_500m";
    IntensityDisplayOptions[IntensityDisplayOptions["_2km"] = 3] = "_2km";
    IntensityDisplayOptions[IntensityDisplayOptions["Watts"] = 4] = "Watts";
    IntensityDisplayOptions[IntensityDisplayOptions["CaloriesPerHour"] = 5] = "CaloriesPerHour";
})(IntensityDisplayOptions = exports.IntensityDisplayOptions || (exports.IntensityDisplayOptions = {}));
var AverageIntensityDisplayOptions;
(function (AverageIntensityDisplayOptions) {
    AverageIntensityDisplayOptions[AverageIntensityDisplayOptions["AverageMetersPerSecond"] = 0] = "AverageMetersPerSecond";
    AverageIntensityDisplayOptions[AverageIntensityDisplayOptions["AverageMPH"] = 1] = "AverageMPH";
    AverageIntensityDisplayOptions[AverageIntensityDisplayOptions["_500m"] = 2] = "_500m";
    AverageIntensityDisplayOptions[AverageIntensityDisplayOptions["_2km"] = 3] = "_2km";
})(AverageIntensityDisplayOptions = exports.AverageIntensityDisplayOptions || (exports.AverageIntensityDisplayOptions = {}));
var Units;
(function (Units) {
    Units[Units["Meters"] = 1] = "Meters";
    Units[Units["Miles"] = 2] = "Miles";
    Units[Units["Kilometers"] = 3] = "Kilometers";
    Units[Units["Strokes"] = 4] = "Strokes";
})(Units = exports.Units || (exports.Units = {}));
//# sourceMappingURL=index.js.map