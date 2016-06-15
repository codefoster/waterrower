Talk to your WaterRower!

This project is being actively developed. It is stable and working as it is, but there's still more that can be added for more communication with the WaterRower device. Please jump in with contributions. Pull requests are welcome.

`waterrower` uses Rx.js instead of an EventEmitter which will allow for some great stuff looking forward. If you haven't worked with Rx.js yet, don't worry. As you can see in the Example Usage below, it's very easy.

This project was initially created to support the [Waterbug](http://github.com/codefoster/waterbug) project.

The current version 0.2.0 has some significant changes. It's much better. Instead of certain session values being available by calling specific functions, any session values (that are defined in the datapoints.ts file) can be requested. I'll explain more in context below.

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

```
import { WaterRower } from 'waterrower';
import { Observable } from 'rxjs/Rx';
let waterrower = new WaterRower({
    portName:"/dev/ttyACM0" //or perhaps "COM6"
});

// respond to the waterrower sending data
waterrower.datapoints$.subscribe(d => {
    // access the value that just changed using d
    // or access any of the other datapoints using waterrower.readDataPoint('<datapointName>');
});
```

## API Reference

###`WaterRower()`
Takes an `options` parameter that must at minimum have a portName. Options are specified in `WaterRowerOptions` (documented below).
     
###`datapoints$`
This is the Rx stream that fires whenever any one datapoint in the WaterRower changes. This is, in my opinion, the best way to get data from the WaterRower, because it eliminates the need to poll the machine on an interval. You'll only get values when something changes. If you subscribe to it, you'll receive the modified datapoint as a parameter, or you can use the `readDataPoint` method to access any other datapoints.

See example `datapoints$.subscribe` above.
###`initialize()`
Sends the USB signal to the WaterRower which initiates communication. This is called in the constructor already so you shouldn't have need to call this explicitly.
###`send()`
Send a raw message to the WaterRower. Many of the other functions use this method, but you can call it directly if you want to.
###`reset()`
Send a signal to the WaterRower to reset. You'll hear your WaterRower beep and the numbers will flash ready for activity to begin. 
###`defineDistanceWorkout(distance: number, units: Units)`
Initiates a distance workout on the WaterRower. Accepts `distance` and `units` parameters (units defaults to Meters).
###`defineDurationWorkout(seconds: number)`
Initiates a duration workout on the WaterRower. Accepts the number of seconds for the new workout. 
###`requestDataPoint(name: string)`
Asks the WaterRower to send the value for a the datapoint with the given name. The returned value happens in a completely separate serial message, so it is not returned by this function. Rather, after issuing this request, you would use `readDataPoint` to get the new value. Note that you should only need to do this if the `options.refreshRate` is set to `0` and thus the module is not configured to poll the waterrower on a regular interval. When the module is configured (as it is by default) with an options.refreshRate value > 0, you should only ever need to `readDataPoint` whenever you want.
###`requestAll()`
Asks the WaterRower to send all datapoint values.
###`readDataPoint(name: string)
Gets the current value of a single datapoint based on the name provided. This does not request the latest value, but will be current if the module is refreshing (`options.refreshRate > 0`). If it is not, then the `requestDataPoint` method should be called prior to this and a short time waited before reading.
###`readAll()`
Composes all of the current datapoint values into an object and returns. 
###`displaySetDistance(units: Units)`
Change the distance display units. See Units for possible values.
###`displaySetIntensity(option: IntensityDisplayOptions)`
Change the intensity display. See IntensityDisplayOptions for possible values.
###`displaySetAverageIntensity(option: AverageIntensityDisplayOptions)`
Change the average intensity display. See AverageIntensityDisplayOptions for possible values.
###WaterRowerOptions Interface
These are the options that you can pass to the WaterRower constructor. `portName` is required.

`baudRate` and `refreshRate` have defaults and are optional.
```
let waterrower = new WaterRower({
  portName:'/dev/ttyACM0',
  baudRate:19200,
  refreshRate:1000
})
```

###IntensityDisplayOptions Enum
This enum defines the possible values you can send to the `displaySetIntensity` method.
```
this.displaySetIntensity(IntensityDisplayOptions.MetersPerSecond);
```

###AverageIntensityDisplayOptions Enum
This enum defines the possible values you can send to the `displaySetAverageIntensity` method.

Possible values are: `AverageMetersPerSecond`,`AverageMPH`,`_500m`, and `_2km`

```
this.displaySetIntensity(AverageIntensityDisplayOptions.AverageMetersPerSecond);
```

###Units Enum
This enum defines the possible values you can send to the `displaySetAverageIntensity` method.

Possible values are: `Meters`, `Miles`, `Kilometers`, and `Strokes`
```
this.defineDistanceWorkout(500, Units.Meters);
```

###DataPoint Interface
The DataPoint interface constitutes a type for the objects in the datapoints.ts file and the type returned in the `datapoints$` stream.

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

Here are a few of the first ones that need to be implemented...
 
- The clock functionality currently comes back with a total number of seconds, but it would be better to have it come back with a formatted hh:mm:ss string.


## License

Apache 2.0

