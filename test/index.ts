import { WaterRower } from '..';

let waterrower = new WaterRower();

//setInterval(() => console.log(waterrower.readAll()),1000);
waterrower.on('initialized', () => {
    waterrower.reset();
})

waterrower.reads$.filter(r => r.type == 'other').subscribe(o => console.log);