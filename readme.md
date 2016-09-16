
Talk to your WaterRower!

This project is being actively developed. It is stable and working as it is, but there's still more that can be added for more communication with the WaterRower device. Please jump in with contributions. Pull requests are welcome.

`waterrower` gives you two ways to subscribe to data changes - the EventEmitter pattern and Rx.js. The former is very familiar and works fine. The latter allows you to do some interesting things since data changes are an Rx stream. If you haven't worked with Rx.js yet, don't worry. As you can see in the example below, it's very easy.

This project was initially created to support the [Waterbug](http://github.com/codefoster/waterbug) project.

Keep in mind that version 0.2.0 introduced some significant changes from 0.1.0 which is what's published in npm as of now. It's much better. Instead of certain rowing session values (i.e. distance) being available by calling specific functions, any session values (that are defined in the datapoints.ts file) can be requested. I'll explain more in context below.

## Installation

In your terminal...
```
npm install waterrower --save

```
In your project code...
```
import { WaterRower } from 'waterrower';
let waterrower = new WaterRower();
```

## Example Usage

Here's the simplest case...
```
import { WaterRower } from 'waterrower';
let waterrower = new WaterRower();
waterrower.on('data', d => {
    // access the value that just changed using d
    // or access any of the other datapoints using waterrower.readDataPoint('<datapointName>');
});
```
In this simple example we've left the port off and let the waterrower module discover it for us.

If you want to do setup stuff to the WaterRower such as reset the console and then start a distance workout, you need to do that _after_ the unit is initialized. Use the following event...
```
waterrower.on('initialized', () => {
    waterrower.reset();
});
```

If you would prefer, you can directly access the observable properties available on the module. `waterrower.reads$` observes all serial messages that come from the WaterRower. `waterrower.datapoints$` is a filter and map of `reads$` and includes only the datapoints (memory location values).

Here's how you would do that...
```
import { WaterRower } from 'waterrower';
import { Observable } from 'rxjs/Rx';
let waterrower = new WaterRower();

// respond to the waterrower sending data
waterrower.datapoints$.subscribe(d => {
    // access the value that just changed using d
    // or access any of the other datapoints using waterrower.readDataPoint('<datapointName>');
});
```

If you want to access all of the PING messages that come from the WaterRower for some reason, you could use...
```
waterrower.reads$
    .filter(r => r.type === 'ping')
    .subscribe(r => {
        // ping
    });
```

Note that you can find all of the available "types" in the `types.ts` file. 

## API Reference

> The members in this API Reference are depicted using TypeScript to give you an idea of the parameter types and return types. Take, for example...
> 
> ```
> f(p1?: string | string[]): number 
> ```
> 
> ...where function `f` receives an optional (depicted by the `?`) parameter `p1` with a type of either `string` or `string[]` and has a return value of type `number`  

### `WaterRower()` (constructor)
Takes an `options` parameter that must at minimum have a portName. Options are specified in `WaterRowerOptions` (documented below).

### `reads$`
This is the Rx stream that fires whenever the WaterRower sends any serial message. You can check the pdf documentation distributed by WaterRower to see all valid messages. Read messages have a type and are thus easy to filter. They also have a value property with the data portion of the message.
     
### `datapoints$`
This is simply a filter of the reads$ stream containing only the datapoint messages.

See example `datapoints$.subscribe` above.

### `on(): void`
`on()` is the typical means of subscribing to node EventEmitter events. Valid events for waterrower are...

`on('initiazed', d => {...})` fires when the port connection to the WaterRower has been established, an initialization message has been sent, and the unit has responded with its "hardware type" message (`_WR_`). 

`on('data', d => {...})` fires whenever a datapoint value changes. When the rower goes 1 more meter and his total distance changes from 237 to 238, for instance, this event will fire. 

`on('close', d => {...})` fires when the WaterRower module is stopped. 

### `reset(): void`
Send a signal to the WaterRower to reset. You'll hear your WaterRower beep and the numbers will flash ready for activity to begin.

### `requestDataPoints(points?: string | string[]): any`
Asks the WaterRower to send the value for a the datapoint with the given name. The returned value happens in a completely separate serial message, so it is not returned by this function. Rather, after issuing this request, you would use `readDataPoint` to get the new value. Note that you should only need to do this if the `options.refreshRate` is set to `0` and thus the module is not configured to poll the waterrower on a regular interval. When the module is configured (as it is by default) with an options.refreshRate value > 0, you should only ever need to `readDataPoint` whenever you are not subscribed.

### `readDataPoints(points?: string | string[]): any`
Gets the current value of a single datapoint, an array of datapoints, or all datapoints depending on what you pass in. This does not request the latest value from the waterrower, but will be current if the module is refreshing (`options.refreshRate > 0`). If it is not, then the `requestDataPoints` method should be called prior to this and a short time waited before reading.

To read a single data, simply pass in the datapoint name as a string...

```
waterrower.readDataPoints('distance');
```

To read multiple datapoints, pass in an array of datapoint names as an array of strings...

```
waterrower.readDataPoints(['distance','total_kcal']);
```

To read all datapoints, just leave the value blank...

```
waterrower.readDataPoints();
```

### `defineDistanceWorkout(distance: number, units: Units)`
Initiates a distance workout on the WaterRower. Accepts `distance` and `units` parameters (units defaults to Meters).

### `defineDurationWorkout(seconds: number)`
Initiates a duration workout on the WaterRower. Accepts the number of seconds for the new workout. 

### `displaySetDistance(units: Units)`
Change the distance display units. See Units for possible values.

### `displaySetIntensity(option: IntensityDisplayOptions)`
Change the intensity display. See IntensityDisplayOptions for possible values.

### `displaySetAverageIntensity(option: AverageIntensityDisplayOptions)`
Change the average intensity display. See AverageIntensityDisplayOptions for possible values.

### Recording and Playing Back Sessions
waterrower offers the ability to record and playback rowing sessions.

These recordings are a file containing all serial messages to cross the wire. For example...

```
{"time":1468559128188,"type":"hardwaretype","data":"_WR_\r"}
{"time":1468559128386,"type":"datapoint","data":"IDD0550007\r"}
{"time":1468559128397,"type":"datapoint","data":"IDD0570007\r"}
{"time":1468559128402,"type":"datapoint","data":"IDD0810007\r"}
```

The project contains a `data` folder with one 30 minute rowing session that you can play back. This essentially allows you to simulate a rowing session for development purposes.

To start the simulation data, use...

```
import { WaterRower } from 'waterrower';
let waterrower = new WaterRower();
waterrower.startSimulation();
waterrower.on('data', d => {
    console.log(d);
});
```
`startRecording(name?: string)` starts recording all serial messages coming _from_ the rower to a file called `name` in the data directory. If name is not provided, then a date/time stamp will be used for the file name.

`stopRecording(): void` stops the current recording.

`getRecordings(): string[]` returns a list of all recorded sessions from the data directory.

`playRecording(name?: string): void` starts playing back a recorded session by `name`. If no name is provided then it will defaults to `simulationdata` - the name of the 30-minute rowing session that comes with waterrower.

`startSimulation(): void` is a shortcut method that is identical to calling `playRecording()`.

### WaterRowerOptions Interface
These are the options that you can pass to the WaterRower constructor. All of the options are optional.

```
let waterrower = new WaterRower({
  portName:'/dev/ttyACM0', //or perhaps 'COM6'
  baudRate:19200,
  refreshRate:200,
  dataDirectory:'data',
  datapoints:['distance','total_kcal']
})
```

If `portName` is omitted then the waterrower module will automatically attempt to discover the port that the WaterRower is on.

`baudRate` and `refreshRate` have defaults and are optional.

`dataDirectory` is a string representing the path (relative to waterrower's root directory) of the directory where session recordings should be saved.

`datapoints` is either a string representing a single datapoint or an array of strings representing all of the datapoints that you want waterrower to request every refresh. Keeping this list as trim as possible will reduce the number of messages that are generated while rowing, so it's recommended you only include the data you're interested in. 

### IntensityDisplayOptions Enum
This enum defines the possible values you can send to the `displaySetIntensity` method.
```
this.displaySetIntensity(IntensityDisplayOptions.MetersPerSecond);
```

### AverageIntensityDisplayOptions Enum
This enum defines the possible values you can send to the `displaySetAverageIntensity` method.

Possible values are: `AverageMetersPerSecond`,`AverageMPH`,`_500m`, and `_2km`

```
this.displaySetIntensity(AverageIntensityDisplayOptions.AverageMetersPerSecond);
```

### Units Enum
This enum defines the possible values you can send to the `displaySetAverageIntensity` method.

Possible values are: `Meters`, `Miles`, `Kilometers`, and `Strokes`

To use the Units, you have to import the Units interface from the waterrower module.
```
import { WaterRower, Units } from 'waterrower';
...
this.defineDistanceWorkout(500, Units.Meters);
```

### DataPoint Interface
The DataPoint interface constitutes a type for the objects in the `datapoints.ts` file and the type returned in the `datapoints$` stream.

```
export interface DataPoint {
    name?: string,
    address: string,
    length: string,
    value: any
}
```

## Known Issues

See the [issues](http://github.com/codefoster/waterrower/issues) on GitHub for a complete list of issues, and feel free to submit some yourself either for bugs or feature requests.


## License

Apache 2.0

## Contributors
Big thanks to [redoPop](https://github.com/redoPop) for the recent contributions to the waterrower project!
