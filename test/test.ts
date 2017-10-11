import { WaterRower } from '..';
let chai = require('chai');

let assert = chai.assert;
let describe = chai.describe;
let it = chai.it;
let beforeEach = chai.beforeEach;

chai.describe('waterrower', function () {

  //constructor
  describe('constructor', function () {
    it('can instantiate waterrower with no arguments', function () {
      let waterrower = new WaterRower();

    });

    it('can instantiate waterrower with no arguments', function () {
      let waterrower = new WaterRower();

    });
  });

  //session playback
  describe('session playback', function () {
    it('can playback default simulation data', function () {
      let waterrower = new WaterRower();
      waterrower.playRecording('simulationdata');
    });
    it('can record a session', function () {
      let waterrower = new WaterRower();
      waterrower.playRecording('simulationdata');
      waterrower.startRecording();
      setTimeout(function() { waterrower.stopRecording(); }, 10000);
    });
  });

  // datapoint processing
  describe('datapoint processing', () => {
    let waterrower;

    beforeEach(() => {
      waterrower = new WaterRower();
      waterrower.setupStreams();
    })

    it('treats distance as a hexadecimal integer', done => {
      waterrower.once('data', point => {
        assert.equal(point.name, 'distance');
        assert.equal(point.value, 7350);
        done();
      });
      waterrower.reads$.next({ time: 1468559128188, type: 'datapoint', data: 'IDD0571CB6\r'});
    });

    it('treats display minutes as a decimal integer', done => {
      waterrower.once('data', point => {
        assert.equal(point.name, 'display_min');
        assert.equal(point.value, 28);
        done();
      });
      waterrower.reads$.next({ time: 1468559128188, type: 'datapoint', data: 'IDS1E228\r'});
    });
  });
});