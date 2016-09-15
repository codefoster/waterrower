import { WaterRower } from '..';

//simulation mode
let waterrower = new WaterRower({datapoints:['ms_distance','m_s_total','m_s_average','total_kcal']});
waterrower.playRecording('simulationdata');
console.log('Playing \'simulationdata\'');

waterrower.on('data', d => {
    console.log(JSON.stringify(d));
});