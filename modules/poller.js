// -----------------------------------------------------------
// POLLER THAT SENDS EVENTS AND INFO TO REMOTE SERVER
//
// Set LEVEL to select the default logging level
//
// TODO: how to distinguish free versus paying Customers ?
// TODO: node-cron can be used ?
// TODO: each time a rule is triggered, should memorize
//       it and sends last history event to whoever wants it
// TODO: should send back to the web server the last logs
// -----------------------------------------------------------
//
var config = require('../config/local'),
    domopi = require('../config/domopi'),
    proxy = require('../modules/proxy'),
    logger = require('../modules/logger'),
    sensor = require('../modules/sensor'),
    controller = require('../modules/controller'),
    scheduler = require('../modules/scheduler'),
    zwave = require('../modules/zwave'),
    http = require('http'),
    fs = require('fs');
 
var zid = domopi.getZid();
var key = domopi.getDomopiKey();
var doversion = domopi.getDomopiVersion();
var fullDeviceListSent = false;
var lastPollTime = 0;
var lastConfMTime = 0;

/**
 * Send the Controller conf at startup
 */
function sendControllerConf() {
	logger.debug('sendControllerConf');
	var body = { doversion: doversion };
	var data = { data: body, status: 'ok', zid: zid, key: key, evttype: 'confinit', updated: Date.now() };
	proxy.mkpost('/poller/events', JSON.stringify(data), function(resp) {
		if (resp === false) {
			logger.info('confinit not sent: NO retry');
		}
	});
}

/**
 * Get a Sensor from cmd content
 */
function _getSensorFromCmd(p) {
	if (!p.devid || !p.instid || !p.sid) {
		logger.error('Missing devid or instid or sid with handleCommand:' + p);
		return false;
	}
	var sens = sensor.findSensor(p.devid, p.instid, p.sid);
	if (!(sens)) {
		logger.error('Sensor not found:' + p.devid + p.instid + p.sid);
		return false;
	}

	return sens;
}

/**
 * Handle a command sent back from the remote web server
 * and send it to the internal ZWave interface
 */
function handleCommand(resp) 
{
	var response = JSON.parse(resp);
	logger.debug(response);
	if (!response.cmds || !response.cmds.length) return;

	// TODO: check the command is newer than the latest action ?
	// Commands are contained in an Array
	logger.debug('Commands detected !');
	var cmds = response.cmds;
	for (i in cmds) {
		var sens;
		var cmd = cmds[i];
		logger.debug('Command:', cmd);
		// ('parms' value is a JSON string)
		// cmd = { 'key': 'xxxx', 'zid': 'xxxx', 'cmd': 'on|off', 'parms': "{ 'devid': 'xxx', 'instid': 'xxx', 'sid': 'xxxxx' }" }
		// cmd = { 'key': 'xxxx', 'zid': 'xxxx', 'cmd': 'sensor_setdescr', 'parms': "{ 'devid': 'xxx', 'instid': 'xxx', 'sid': 'xxxxx', 'value': 'blabla' }" }
		// cmd = { 'key': 'xxxx', 'zid': 'xxxx', 'cmd': 'rules_def', 'parms': "{ 'rules': 'json_rules' }" }
		// cmd = { 'key': 'xxxx', 'zid': 'xxxx', 'cmd': 'controller_setdescr', 'parms': "{ 'value': 'blabla' }" }
		if (!cmd.cmd || !cmd.parms) {
			logger.error('Command missing cmd or parms value');
			continue;
		}
		try {
			var parms = JSON.parse(cmd.parms);
		}
		catch(e) {
			logger.error('Error parsing cmd.parms:' + cmd.parms);
			continue;
		}

		if (cmd.cmd == 'on' || cmd.cmd == 'off') {
			if ((sens = _getSensorFromCmd(parms)) === false) continue;
			sens.sendCommand(cmd.cmd, false);
			continue;
		}
		if (cmd.cmd == 'sensor_setdescr') {
			if (!parms.value) {
				logger.error('Missing value with handleCommand:' + cmd);
				continue;
			}
			if ((sens = _getSensorFromCmd(parms)) === false) continue;
			sens.setDescription(parms.value);
			continue;
		}
		if (cmd.cmd == 'controller_setdescr') {
			if (!parms.value) {
				logger.error('Missing value with handleCommand:' + cmd);
				continue;
			}
			controller.setDescription(parms.value);
			continue;
		}
		if (cmd.cmd == 'controller_getlogs') {
			var cbuf = logger.circularBuffer.toarray();
			var data = { data: cbuf, status: 'ok', zid: zid, key: key, evttype: 'logs', updated: Date.now() };
			proxy.mkpost('/poller/events', JSON.stringify(data), function(resp) {
				if (resp === false) {
					logger.info('Logs could not be sent');
				}
				else {
				}
			});
		}
		if (cmd.cmd == 'rules_def') {
			if (!parms.rules) {
				logger.error('Missing rules with handleCommand:' + cmd);
				continue;
			}
			domopi.setAutomationRules(JSON.parse(parms.rules));
		}
	}
}

/**
 * Send the full device list to domopi
 * and handles the back-command if needed
 */
function sendFullDeviceList(body)
{
	logger.debug('sendFullDeviceList');
	if (!body) { return; }
	var data = { data: body, status: 'ok', zid: zid, key: key, evttype: 'sensors', updated: Date.now() };
	scheduler.updateStatus(body);
	proxy.mkpost('/poller/events', JSON.stringify(data), function(resp) {
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
	zwave.getFullDeviceList(next);
	lastPollTime = Math.floor(Date.now() / 1000);
}

/**
 * Send the delta device list to domopi
 * and handles the back-command if needed
 */
function sendDeltaDeviceList(body)
{
	logger.debug('sendDeltaDeviceList');
	if (!body) return; 	// But must make a call to receive the commands back !
	var data = { data: body, status: 'ok', zid: zid, key: key, evttype: 'sensors', updated: Date.now() };
	scheduler.updateStatus(body);
	proxy.mkpost('/poller/events', JSON.stringify(data), function(resp) {
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
	zwave.getDeltaDeviceList(lastPollTime.toString(), next);
	lastPollTime = Math.floor(Date.now() / 1000);
}

/**
 * Send to remote web server the current configuration
 */
function saveDomopiConf() 
{
	var conf = domopi.getDomopiConf();
	var data = {};
	data['config'] = conf;
	data['zid'] = zid;
	data['key'] = key;
	data['updated'] = Date.now();
	proxy.mkpost('/poller/saveconf', JSON.stringify(data), function(resp) {
		if (resp === false) {
			logger.info('saveconf not sent: retry...');
			lastConfMTime = 0;
		}
	});
}

/**
 * Main Polling function called on a regular basis
 */
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

// Send the current conf
sendControllerConf();

// Now, launch the poller that will send the delta device list on regular basis
setInterval(poller, config.poll_interval * 1000);

// EOF
