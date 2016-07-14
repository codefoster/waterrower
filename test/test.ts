var assert = require('chai').assert;
import { WaterRower } from '..';

describe('waterrower', function () {

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
});