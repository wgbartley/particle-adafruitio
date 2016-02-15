// Require required stuff
var spark = require('spark'),
    https = require('https'),
    url   = require('url');


// Required variables
var ACCESS_TOKEN = (process.env.ACCESS_TOKEN ? process.env.ACCESS_TOKEN : '').trim();
var AIO_KEY = (process.env.AIO_KEY ? process.env.AIO_KEY : '').trim();


// Optional variables
var EVENT_NAME = (process.env.EVENT_NAME ? process.env.EVENT_NAME : 'statsd');
var FORWARD_SPARK = (process.env.FORWARD_SPARK ? process.env.FORWARD_SPARK : 0);
var SPARK_PATH = (process.env.SPARK_PATH ? process.env.SPARK_PATH : 'spark');
var AIO_URL = (process.env.AIO_URL ? process.env.AIO_URL : 'https://io.adafruit.com/api/v1');


// I said it was required!
if(ACCESS_TOKEN.length==0) {
	console.error('You MUST provide a Particle access token');
	process.exit(1);
}


// I said it was required!
if(AIO_KEY.length==0) {
	console.error('You MUST provide an Adafruit IO key');
	process.exit(1);
}


// Pre-gen our HTTPS POST options
var aio_parsed_url = url.parse(AIO_URL);

var aio_https_post_opts = {
	hostname: aio_parsed_url.hostname,
	port: 443,
	path: aio_parsed_url.path,
	method: 'POST',
	headers: {
		'X-AIO-Key': AIO_KEY,
		'Content-type': 'application/json'
	}
};


// Login to the cloud
spark.login({accessToken: ACCESS_TOKEN}, function() {
	subscribe_event();
	subscribe_spark();
});


// Subscription handler
function subscribe_event() {
	console.time('subscribe');
	_log('subscription started');

	// Subscribe
	var req = spark.getEventStream(EVENT_NAME, 'mine', function(data) {
		stats_parse(data);
	});

	// Re-subscribe
	req.on('end', function() {
		_log('subscription ended');
		console.time('subscribe');

		// Re-subscribe in 1 second
		setTimeout(subscribe_event, 1000);
	});
}


function subscribe_spark() {
	// Exit early if disabled
	if(FORWARD_SPARK!=1) return;

	console.time('spark_subscribe');
	_log('spark subscription started');

	// Subscribe
	var req = spark.getEventStream('spark', 'mine', function(data) {
		spark_parse(data);
	});

	// Re-subscribe
	req.on('end', function() {
		_log('spark subscription ended');
		console.time('spark_subscribe');

		// Re-subscribe in 1 second
		setTimeout(subscribe_spark, 1000);
	});
}


// Parse the data from the event
function stats_parse(data) {
	var msg, device_name;
	
	_log('>>>', data);

	// If a semi-colon exists, treat the string before it as the device name	
	if(data.data.indexOf(';')>0) {
		var semicolon_split = data.data.split(';');
		device_name = semicolon_split[0];
		data.data = semicolon_split[1];

	// If no custom device name, use the coreid instead
	} else
		device_name = data.coreid;
	
	// Check for the presence of a comma to see if we have multiple metrics in this payload
	// No comma = 1 metric
	if(data.data.indexOf(',')<0) {
		stats_send(device_name+'.'+data.data);

	// Commas = multiple metrics
	} else {
		// Split metrics into an array
		var data_arr = data.data.split(',');

		// Loop through the array and send the metrics		
		for(var i=0; i<data_arr.length; i++)
			stats_send(device_name+'.'+data_arr[i]);
	}
}


// Parse spark event data
function spark_parse(data) {
	_log('>>>', data);
	var path = data.name.replace('\/', '.');

	stats_send(SPARK_PATH+'.'+data.coreid+'.'+path+'.'+data.data+':1|c');
}


// Send the parsed metrics to StatsD
function stats_send(msg) {
	// Splits "overwinter1.h:34.37|g" into "overwinter1.h", "34.37|g"
	var a = msg.split(':');

	// Splits "34.37|g" into "34.37", "g"
	var b = a[1].split('|');

	// Friendly variable names
	var key = a[0].replace('.', '-');
	var val = b[0];

	// This hack isn't ideal and should be fixed properly
	var this_request = aio_https_post_opts;
	this_request.path = '/api/v1/feeds/'+key+'/data/send'

	// Send to Adafruit IO
	var req = https.request(this_request, function(res) {
		res.on('data', function(d) {
			// Do nothing?
		});

		res.on('error', function(e) {
			console.log('!!! '+e.toString());
		});
	});

	req.write(JSON.stringify({"value":val}));
	req.end();

	_log('<<<', [key, val].toString());
}


// Semi-fancy logging with timestamps
function _log() {
	var d = new Date();

	// Year
	d_str = d.getFullYear();
	d_str += '-';

	// Month
	if(d.getMonth()+1<10) d_str += '0';
	d_str += (d.getMonth()+1);
	d_str += '-';

	// Day
	if(d.getDate()<10) d_str += '0';
	d_str += d.getDate();
	d_str += ' ';

	// Hour
	if(d.getHours()<10) d_str += '0';
	d_str += d.getHours();
	d_str += ':';

	// Minute
	if(d.getMinutes()<10) d_str += '0';
	d_str += d.getMinutes();
	d_str += ':';

	// Second
	if(d.getSeconds()<10) d_str += '0';
	d_str += d.getSeconds();
	d_str += '.';

	// Milliseconds
	d_str += d.getMilliseconds();


	if(arguments.length==1)
		var l = arguments[0];
	else {
		var l = [];
		for(var i=0; i<arguments.length; i++)
			l.push(arguments[i]);
	}
			

	console.log('['+d_str+']', l);
}
