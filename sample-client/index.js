"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var __1 = require("..");
//simulation mode
var waterrower = new __1.WaterRower({ datapoints: ['ms_distance', 'm_s_total', 'm_s_average', 'total_kcal'] });
waterrower.playRecording('simulationdata');
console.log('Playing \'simulationdata\'');
waterrower.on('data', function (d) {
    console.log(JSON.stringify(d));
});
//# sourceMappingURL=index.js.map