// ----------------------------------------------------
// POLLER THAT SENDS EVENTS AND INFO TO REMOTE SERVER
// ----------------------------------------------------
//
var config = require('./config/local.js');
var proxy = require('./modules/proxy');
var http = require('http');
var fs = require('fs');
 
// Read the zid:
//var contents = fs.readFileSync('/etc/zbw/userid', 'utf8');
//console.log(contents);
var zid = '34601';	// TODO ????
var key = '1234';	// TODO ????
var fullDeviceListSent = false;

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
 * Update the current Configuration
 **/
function updateConf()
{
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
		if (cmd.cmd == 'on' || cmd.cmd == 'off') {
			if (!cmd.sid) {
				console.log('Missing sid with handleCommand:', cmd);
				return;
			}
			doGet('/sensors/command/' + cmd.sid + '/' + cmd.cmd, false);
			return;
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
}

function sendDeltaDeviceList(data)
{
	if (!data) { return; }
	data = JSON.parse(data)
	data['zid'] = zid;
	data['key'] = key;
	data['updated'] = Date.now(); // TODO: les dates sont en UTC ?????
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
	doGet('/sensors/deltalist', next);
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
