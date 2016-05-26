Talk to your WaterRower!

This project is a work in action. It is stable and working as it is, but there's a lot more that can be added for more communcation with the WaterRower device. Please jump in with contributions. Pull requests are welcome.

`waterrower` uses Rx.js instead of an EventEmitter which will allow for some great stuff looking forward. If you haven't worked with Rx.js yet, don't worry. As you can see in the Example Usage below, it's very easy.

This project was initially created to support the [Waterbug](http://github.com/codefoster/waterbug) project.

## Installation

```
npm install waterrower --save
```

## Example Usage

```
import { Subject } from 'rxjs/Rx';
import WaterRower from 'waterrower';
let waterrower = new WaterRower();

// the module 
//respond to the waterrower sending data
waterrower.data$.subscribe(() => {
    // access data using waterrower.data;
});
```

## API Reference

###`WaterRower()`
Takes an optional `options` parameter with the options specified in `WaterRowerOptions` (documented below)
     
###`port`
The serial port object
###`data$`
This is the Rx stream that kicks whenever data in the WaterRower changes. If you subscribe to it, you'll have a chance to read the data using the `data` property.
###`initialize()`
Sends the USB signal to the WaterRower which initiates communication. This is called in the constructor already so you shouldn't have need to call this explicitly.
###`send()`
Send a raw message to the WaterRower. Many of the other functions use this method, but you can call it directly if you want to.
###`data`
This is where you'll find the current state of data for the WaterRower. When you request data, it updates this internal state. Currently, requests are automatically being made on the `refreshRate` interval, so you don't likely need to worry about making requests explicitely. 
###`reset()`
Send a signal to the WaterRower to reset. You'll hear your WaterRower beep and the numbers will flash ready for activity to begin. 
###`startWorkout()`
Sends a signal to the WaterRower to initiate a workout. Accepts an optional `options` parameter specified in `StartWorkoutOptions` (documented below). Currently only a distance is accepted.
###`requestDistance()`
Asks the WaterRower to send distance values. These happen in a completely separate serial message, so they are not returned by this function. Rather, after issuing this request, you would look at the `data` property to get the new value. Note that you should even need to do this since requests are automatically sent using the `refreshRate`. You should only need to read from the `data` property.
###`requestSpeed()`
Asks the WaterRower to send speed values. These happen in a completely separate serial message, so they are not returned by this function. Rather, after issuing this request, you would look at the `data` property to get the new value. Note that you should even need to do this since requests are automatically sent using the `refreshRate`. You should only need to read from the `data` property.
###`requestClock()`
Asks the WaterRower to send clock values. These happen in a completely separate serial message, so they are not returned by this function. Rather, after issuing this request, you would look at the `data` property to get the new value. Note that you should even need to do this since requests are automatically sent using the `refreshRate`. You should only need to read from the `data` property.
###`setDisplayUnits()`
Currently hard coded to set the WaterRower to use meters.
###WaterRowerOptions
These are the options that you can pass to the WaterRower constructor. The values passed in here will override what is in WaterRower's `config.ts` file. In the future, the `config.ts` file will go away and this options string will be the only way to configure the module.
```
var waterrower = new WaterRower({
  portName:'/dev/ttyACM0',
  baudRate:19200,
  refreshRate:200
}
```
###StartWorkoutOptions
These are the options you can send to the `startWorkout()` method. Currently only distance workouts are supported.
```
waterrower.startWorkout({
  distance:500
}
```

## Known Issues

See the [issues](http://github.com/codefoster/waterrower/issues) on GitHub for a complete list of issues, and feel free to submit some yourself either for bugs or feature requests.

Here are a few of the first ones that need to be implemented...
 
- The API Reference section above needs to be completed
- The port name is currently hard coded in the config file
- The clock functionality currently comes back with a total number of seconds, but it would be better to have it come back with a formatted hh:mm:ss string.


## License

Apache 2.0

