// ----------------------------------------------------
// POLLER THAT SENDS EVENTS AND INFO TO REMOTE SERVER
// ----------------------------------------------------
//
var config = require('./config/local.js');
var sensors_conf = require('./config/sensors_conf');
var proxy = require('./modules/proxy');
var http = require('http');
var fs = require('fs');
 
var zid = sensors_conf.getZid();
var key = sensors_conf.getDomopiKey();
var fullDeviceListSent = false;
var lastPollTime = 0;

/**
 * Do a GET Request to the internal interface
 **/
function doGet(url, next)
{
	var headers = {};
        var options = { method: 'GET', path: url, port: config.poll_srvPort, hostname: config.poll_srvHost, headers: headers };
        console.log(options);
        var body = '';
        sock = http.get(options, function(res) {
                console.log('STATUS: ' + res.statusCode);
                res.on('data', function(chunk) {
                        body += chunk;
                });
                res.on('end', function() {
                        console.log('no more data');
                        if (next) next(body);
                });
        });
        sock.on('error', function(e) {
                console.log('problem with request: ' + e.message);
                if (next) next(false)
        });
}

/**
 * Do a PUT Request to the internal interface
 **/
function doPut(url, data, next)
{
	var headers = { 
		'Content-Type': 'application/json;charset=utf-8', 
		'Content-Length': Buffer.byteLength(data),
		'Accept': 'application/json, text/plain, */*'
	};
        var options = { 
		method: 'PUT', 
		path: url, 
		port: config.poll_srvPort, 
		hostname: config.poll_srvHost, 
		headers: headers 
	};
        console.log(options);
        var body = '';
        sock = http.request(options, function(res) {
                console.log('STATUS: ' + res.statusCode);
                res.on('data', function(chunk) {
                        body += chunk;
                });
                res.on('end', function() {
                        console.log('no more data');
                        if (next) next(body);
                });
        });
        sock.on('error', function(e) {
                console.log('problem with request: ' + e.message);
                if (next) next(false)
        });
	sock.write(data); 
	sock.end(); 
}

/**
 * Handle a command and send it to the internal interface
 */
function handleCommand(resp) 
{
	var response = JSON.parse(resp);
	console.log(response);
	if (!response.cmd || !response.cmd.length) return;

	// TODO: check the command is newer than the latest action ?
	// Commands are contained in an Array
	console.log('Commands detected !');
	var cmds = response.cmd;
	for (i in cmds) {
		var cmd = cmds[i];
		console.log('Command:', cmd);
		// cmd = { 'key': 'xxxx', 'zid': 'xxxx', 'sid': 'xxxxx', 'cmd': { 'cmd': 'on' } }
		// cmd = { 'key': 'xxxx', 'zid': 'xxxx', 'sid': 'xxxxx', 'cmd': { 'cmd': 'setdescr', 'value': 'blabla' } }
		if (!cmd.cmd) continue;
		var json = JSON.parse(cmd.cmd);
		if (json.cmd == 'on' || json.cmd == 'off') {
			if (!cmd.sid) {
				console.log('Missing sid with handleCommand:', cmd);
				return;
			}
			doGet('/sensors/command/' + cmd.sid + '/' + json.cmd, false);
			continue;
		}
		if (json.cmd == 'setdescr') {
			if (!json.value) {
				console.log('Missing value with handleCommand:', cmd);
				return;
			}
			var data = { title: json.value };
			doPut('/sensors/setdescr/' + cmd.sid, JSON.stringify(data), function(resp) {
				if (resp === false) {
					console.log('setdescr Command failed');
				}
			});
			continue;
		}
	}
}

/**
 * Send the full device list to domopi
 * and handles the back-command if needed
 */
function sendFullDeviceList(data)
{
	if (!data) { return; }
	data = JSON.parse(data)
	data['zid'] = zid;
	data['key'] = key;
	data['updated'] = Date.now(); // TODO: les dates sont en UTC ?????
	proxy._mkpost('/poller/devices', JSON.stringify(data), function(resp) {
		if (resp === false) {
			console.log('FullDeviceList not sent: retry...');
		}
		else {
			fullDeviceListSent = true;
			handleCommand(resp); 
		}
	});
}

function getFullDeviceList(next) 
{
	doGet('/sensors/list', next);
	lastPollTime = Math.floor(Date.now() / 1000);
}

function sendDeltaDeviceList(data)
{
	if (!data) { return; }
	data = JSON.parse(data)
	data['zid'] = zid;
	data['key'] = key;
	data['updated'] = Date.now(); // All Dates are in UTC
	proxy._mkpost('/poller/devices', JSON.stringify(data), function(resp) {
		if (resp === false) {
			console.log('DeltaDeviceList not sent: retry...');
		}
		else {
			handleCommand(resp); 
		}
	});
}

function getDeltaDeviceList(next)
{
	doGet('/sensors/deltalist?since=' + lastPollTime.toString(), next);
	lastPollTime = Math.floor(Date.now() / 1000);
}

function poller() 
{
	console.log('poller');
	if (fullDeviceListSent)
		getDeltaDeviceList(sendDeltaDeviceList);
	else
		getFullDeviceList(sendFullDeviceList);
}

// Set parameters:
proxy.connect(config.poll_externalSrvHost, config.poll_externalSrvPort);

// When launched, send the full device list description to the external web server
//getFullDeviceList(sendFullDeviceList);

// Now, launch the poller that will send the delta device list on regular basis
setInterval(poller, config.poll_interval * 1000);

// EOF
