particle-adafruitio
===================

A simple Node.JS daemon that listens for published events on your Particle event stream, parses them, and pushes them to [Adafruit IO](http://io.adafruit.com).


Installation
------------

1. Clone this repository
2. Change to repo directory (`cd particle-adafruitio`)
3. Run `npm install` to install dependencies
4. Run using `node particle-adafruitio.js` or use any process manager (nodemon, foreverjs, pm2)


Options
-------
Options are now set via environment variables.  Available options are:

 - `ACCESS_TOKEN` - (Required) Your Particle cloud access token
 - `AIO_KEY` - (Required) Your Adafruit IO key
 - `EVENT_NAME` - The name of the event to listen for - default: `statsd`
 - `FORWARD_SPARK` - Parse `spark/*` events. `0` = Disable, Any other value = Enable - default: `1`
 - `SPARK_PATH` - The metric path prefix for `spark/*` events - default: `spark`
 - `AIO_URL` - The Adafruit IO API URL - default: `https://io.adafruit.com/api/v1`

Data format
-----------
Data format is: `[device name]`;`[metric name]`:`[metric value]`|`[metric type]`,`[metric name]`:`[metric value]`|`[metric type]`

 - `device name` - (Optional)  If not specified with a name (followed by a semi-colon), the Particle device ID will be used instead.
 - `metric name` - The name of the metric you wish to record.  Keep it short so you can fit more data in a single publish.
 - `metric value` - The value of the metric you wish to record.
 - `metric type` - The StatsD metric type to use.

Multiple metrics can be passed as long as each metric set (`metric name`, `metric value`, and `metric type`) is separated by commas.

_Note that this keeps the same format as the [particle-statsd](https://github.com/wgbartley/particle-statsd) repo so it's easier to switch amongst the two (or run them simultaneously)._
