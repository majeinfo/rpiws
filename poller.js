// ----------------------------------------------------
// POLLER THAT SENDS EVENTS AND INFO TO REMOTE SERVER
// ----------------------------------------------------
//
var config = require('./config/local.js');
var proxy = require('./modules/proxy');
var http = require('http');

function sendFullDeviceList(data)
{
	if (!data) { return; }
	proxy._mkpost('/poller/devices', data, false);
}

function getFullDeviceList(next) 
{
	var headers = {};
        var options = { method: 'GET', path: '/sensors/list', port: config.poll_srvPort, hostname: config.poll_srvHost, headers: headers };
        console.log(options);
        var body = '';
        sock = http.get(options, function(res) {
                console.log('STATUS: ' + res.statusCode);
                res.on('data', function(chunk) {
                        body += chunk;
                });
                res.on('end', function() {
                        console.log('no more data');
                        next(body);
                });
        });
        sock.on('error', function(e) {
                console.log('problem with request: ' + e.message);
                next(false)
        });
}

function sendDeltaDeviceList(data)
{
	if (!data) { return; }
	proxy._mkpost('/poller/devices', data, false);
}

function getDeltaDeviceList(next)
{
	var headers = {};
        var options = { method: 'GET', path: '/sensors/deltalist', port: config.poll_srvPort, hostname: config.poll_srvHost, headers: headers };
        console.log(options);
        var body = '';
        sock = http.get(options, function(res) {
                console.log('STATUS: ' + res.statusCode);
                res.on('data', function(chunk) {
                        body += chunk;
                });
                res.on('end', function() {
                        console.log('no more data');
                        next(body);
                });
        });
        sock.on('error', function(e) {
                console.log('problem with request: ' + e.message);
                next(false)
        });
}

function poller() 
{
	console.log('poller');
	getDeltaDeviceList(sendDeltaDeviceList);
}

// Set parameters:
proxy.connect(config.poll_externalSrvHost, config.poll_externalSrvPort);

// When launched, send the full device list description to the external web server
getFullDeviceList(sendFullDeviceList);

// Now, launch the poller that will send the delta device list on regular basis
setInterval(poller, config.poll_interval * 1000);

// EOF
