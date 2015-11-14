// ----------------------------------------------------
// POLLER THAT SENDS EVENTS AND INFO TO REMOTE SERVER
//
// Set LEVEL to select the default logging level
// ----------------------------------------------------
//
var config = require('./config/local');
var domopi = require('./config/domopi');
var proxy = require('./modules/proxy');
var logger = require('./modules/logger');
var http = require('http');
var fs = require('fs');
 
var zid = domopi.getZid();
var key = domopi.getDomopiKey();
var fullDeviceListSent = false;
var lastPollTime = 0;
var lastConfMTime = 0;

/**
 * Do a GET Request to the internal interface
 **/
function doGet(url, next)
{
	var headers = {};
        var options = { method: 'GET', path: url, port: config.poll_srvPort, hostname: config.poll_srvHost, headers: headers };
        logger.debug(options);
        var body = '';
        sock = http.get(options, function(res) {
                logger.debug('STATUS: ' + res.statusCode);
                res.on('data', function(chunk) {
                        body += chunk;
                });
                res.on('end', function() {
                        logger.debug('no more data');
                        if (next) next(body);
                });
        });
        sock.on('error', function(e) {
                logger.error('problem with request: ' + e.message);
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
        logger.debug(options);
        var body = '';
        sock = http.request(options, function(res) {
                logger.debug('STATUS: ' + res.statusCode);
                res.on('data', function(chunk) {
                        body += chunk;
                });
                res.on('end', function() {
                        logger.debug('no more data');
                        if (next) next(body);
                });
        });
        sock.on('error', function(e) {
                logger.error('problem with request: ' + e.message);
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
	logger.debug(response);
	if (!response.cmd || !response.cmd.length) return;

	// TODO: check the command is newer than the latest action ?
	// Commands are contained in an Array
	logger.debug('Commands detected !');
	var cmds = response.cmd;
	for (i in cmds) {
		var cmd = cmds[i];
		logger.debug('Command:', cmd);
		// cmd = { 'key': 'xxxx', 'zid': 'xxxx', 'devid': 'xxx', 'instid': 'xxx', 'sid': 'xxxxx', 'cmd': { 'cmd': 'on' } }
		// cmd = { 'key': 'xxxx', 'zid': 'xxxx', 'devid': 'xxx', 'instid': 'xxx', 'sid': 'xxxxx', 'cmd': { 'cmd': 'setdescr', 'value': 'blabla' } }
		if (!cmd.cmd) continue;
		var json = JSON.parse(cmd.cmd);
		if (json.cmd == 'on' || json.cmd == 'off') {
			if (!cmd.sid) {
				logger.error('Missing sid with handleCommand:', cmd);
				return;
			}
			doGet('/sensors/command/' + cmd.devid + '/' + cmd.instid + '/' + cmd.sid + '/' + json.cmd, false);
			continue;
		}
		if (json.cmd == 'setdescr') {
			if (!json.value) {
				logger.error('Missing value with handleCommand:', cmd);
				return;
			}
			var data = { title: json.value };
			doPut('/sensors/setdescr/' + cmd.devid + '/' + cmd.instid + '/' + cmd.sid, JSON.stringify(data), function(resp) {
				if (resp === false) {
					logger.error('setdescr Command failed');
				}
			});
			continue;
		}
		if (json.cmd == 'controller_setdescr') {
			if (!json.value) {
				logger.error('Missing value with handleCommand:', cmd);
				return;
			}
			var data = { description: json.value };
			doPut('/controllers/setdescr', JSON.stringify(data), function(resp) {
				if (resp === false) {
					logger.error('controller_setdescr Command failed');
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
			logger.info('FullDeviceList not sent: retry...');
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
	if (!data) return; 	// But must make a call to receive the commands back !
	data = JSON.parse(data)
	data['zid'] = zid;
	data['key'] = key;
	data['updated'] = Date.now(); // All Dates are in UTC
	proxy._mkpost('/poller/devices', JSON.stringify(data), function(resp) {
		if (resp === false) {
			logger.info('DeltaDeviceList not sent: retry...');
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

function saveDomopiConf() 
{
	var conf = domopi.getDomopiConf();
	var data = {};
	data['config'] = conf;
	data['zid'] = zid;
	data['key'] = key;
	data['updated'] = Date.now();
	proxy._mkpost('/poller/saveconf', JSON.stringify(data), function(resp) {
		if (resp === false) {
			logger.info('saveconf not sent: retry...');
			lastConfMTime = 0;
		}
	});
}

function poller() 
{
	logger.debug('poller');
	if (fullDeviceListSent)
		getDeltaDeviceList(sendDeltaDeviceList);
	else
		getFullDeviceList(sendFullDeviceList);

	// Check if Conf File must be sent
	var mtime = domopi.getDomopiConfMTime();
	if (mtime > lastConfMTime) {
		lastConfMTime = mtime;
		saveDomopiConf();
	}
}

// Set parameters:
proxy.connect(config.poll_externalSrvHost, config.poll_externalSrvPort);

// Now, launch the poller that will send the delta device list on regular basis
setInterval(poller, config.poll_interval * 1000);

// EOF
