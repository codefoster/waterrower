import { WaterRower } from '..';

//simulation mode
let waterrower = new WaterRower();
waterrower.playRecording('simulationdata');
console.log('Playing \'simulationdata\'');

waterrower.on('data', d => {
    console.log(JSON.stringify(d));
});