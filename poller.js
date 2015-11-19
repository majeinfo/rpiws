// -----------------------------------------------------------
// POLLER THAT SENDS EVENTS AND INFO TO REMOTE SERVER
//
// Set LEVEL to select the default logging level
//
// TODO: how to distinguish free versus paying Customers ?
// TODO: node-cron can be used ?
// TODO: each time a rule is triggered, should memorize
//       it and sends last history event to whoever wants it
// -----------------------------------------------------------
//
var config = require('./config/local'),
    domopi = require('./config/domopi'),
    proxy = require('./modules/proxy'),
    logger = require('./modules/logger'),
    sensor = require('./modules/sensor'),
    scheduler = require('./modules/scheduler'),
    zwave = require('./modules/zwave'),
    http = require('http'),
    fs = require('fs');
 
var zid = domopi.getZid();
var key = domopi.getDomopiKey();
var fullDeviceListSent = false;
var lastPollTime = 0;
var lastConfMTime = 0;

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
			var sens = sensor.FindSensor(cmd.devid, cmd.instid, cmd.sid);
			if (!(sens)) {
				logger.error('Sensor not found !', cmd.devid, cmd.instid, cmd.sid);
				return
			}
			sens.sendCommand(json.cmd, false);
			//zwave.doGet('/sensors/command/' + cmd.devid + '/' + cmd.instid + '/' + cmd.sid + '/' + json.cmd, false);
			continue;
		}
		if (json.cmd == 'setdescr') {
			if (!json.value) {
				logger.error('Missing value with handleCommand:', cmd);
				return;
			}
			var data = { title: json.value };
			zwave.doPut('/sensors/setdescr/' + cmd.devid + '/' + cmd.instid + '/' + cmd.sid, JSON.stringify(data), function(resp) {
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
			zwave.doPut('/controllers/setdescr', JSON.stringify(data), function(resp) {
				if (resp === false) {
					logger.error('controller_setdescr Command failed');
				}
			});
			continue;
		}
	}
}

/**
 * Clean the data sent to the remote web server
 */
function _cleanData(data) {
	logger.debug('_cleanData:', data);
	if (!('data' in data)) return;
	for (i in data.data) {
		var d = data.data[i];
		logger.debug(d);
		if (!('metrics' in d)) continue;
		data['is_level_number'] = (d.metrics.level != 'on' && d.metrics.level != 'off');
		data['level'] = (data['is_level_number']) ? d.metrics.level : 0;
		data['on_off'] = (d.metrics.level == 'on');
		data['change'] = d.metrics.change;
	}
	scheduler.updateStatus(data.data);
}

/**
 * Send the full device list to domopi
 * and handles the back-command if needed
 */
function sendFullDeviceList(data)
{
	if (!data) { return; }
	data = JSON.parse(data)
	if (data['status'] == 'error') { return; }
	data['zid'] = zid;
	data['key'] = key;
	data['updated'] = Date.now(); // TODO: les dates sont en UTC ?????
	_cleanData(data);
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
	zwave.doGet('/sensors/list', next);
	lastPollTime = Math.floor(Date.now() / 1000);
}

function sendDeltaDeviceList(data)
{
	if (!data) return; 	// But must make a call to receive the commands back !
	data = JSON.parse(data)
	if (data['status'] == 'error') { return; }
	data['zid'] = zid;
	data['key'] = key;
	data['updated'] = Date.now(); // All Dates are in UTC
	_cleanData(data);
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
	zwave.doGet('/sensors/deltalist?since=' + lastPollTime.toString(), next);
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
