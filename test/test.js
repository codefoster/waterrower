"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var __1 = require("..");
var chai = require('chai');
var assert = chai.assert;
var describe = chai.describe;
var it = chai.it;
var beforeEach = chai.beforeEach;
chai.describe('waterrower', function () {
    //constructor
    describe('constructor', function () {
        it('can instantiate waterrower with no arguments', function () {
            var waterrower = new __1.WaterRower();
        });
        it('can instantiate waterrower with no arguments', function () {
            var waterrower = new __1.WaterRower();
        });
    });
    //session playback
    describe('session playback', function () {
        it('can playback default simulation data', function () {
            var waterrower = new __1.WaterRower();
            waterrower.playRecording('simulationdata');
        });
        it('can record a session', function () {
            var waterrower = new __1.WaterRower();
            waterrower.playRecording('simulationdata');
            waterrower.startRecording();
            setTimeout(function () { waterrower.stopRecording(); }, 10000);
        });
    });
    // datapoint processing
    describe('datapoint processing', function () {
        var waterrower;
        beforeEach(function () {
            waterrower = new __1.WaterRower();
            waterrower.setupStreams();
        });
        it('treats distance as a hexadecimal integer', function (done) {
            waterrower.once('data', function (point) {
                assert.equal(point.name, 'distance');
                assert.equal(point.value, 7350);
                done();
            });
            waterrower.reads$.next({ time: 1468559128188, type: 'datapoint', data: 'IDD0571CB6\r' });
        });
        it('treats display minutes as a decimal integer', function (done) {
            waterrower.once('data', function (point) {
                assert.equal(point.name, 'display_min');
                assert.equal(point.value, 28);
                done();
            });
            waterrower.reads$.next({ time: 1468559128188, type: 'datapoint', data: 'IDS1E228\r' });
        });
    });
});
//# sourceMappingURL=test.js.map