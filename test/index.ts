import { WaterRower } from '..';

let waterrower = new WaterRower({ simulationMode: true });
// let waterrower = new WaterRower({ recordFile: 'simulationdata' });

waterrower.on('initialized', () => {
    waterrower.reset();
    console.log('Rowing...');
})

waterrower.on('data', d => {
    console.log(JSON.stringify(d));
});

waterrower.on('error', err => console.error(err));

waterrower.reads$.filter(r => r.type == 'other').subscribe(o => console.log);