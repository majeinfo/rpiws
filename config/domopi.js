// ------------------------------------
// Manage the Domopi Configuration
// ------------------------------------
//
var fs = require('fs'),
    logger = require('../modules/logger');

var zidFile = '/etc/zbw/userid';
var keyFile = '/etc/domopi/config.js';
var confFile = '/etc/domopi/domopi.js';
var confCache = undefined;

// TODO: clean exit in case of file missing
// TODO: send alert to ???? in case of errors ????

// Read the zid:
exports.getZid = function() {
	var zid = '0';
	try {
		var contents = fs.readFileSync(zidFile, 'utf8');
		logger.debug(contents);
		//var zid = '34601';    
		var zid = contents.split('\n')[0];
	}
	catch (e) {
		logger.error('getZid:', e);
	}
	return zid;
}

// Read the Domopi Key
exports.getDomopiKey = function() {
	var key = '0';
	try {
		var contents = fs.readFileSync(keyFile, 'utf8');
		logger.debug(contents);
		//var key = '1234';
		key = contents.split('\n')[0];
	}
	catch (e) {
		logger.error('getDomopiKey:', e);
	}
	return key;
}

// Read the Domopi Configuration (JSON Format)
exports.getDomopiConf = function() {
	logger.debug('getDomopiConf');
	if (confCache) return confCache;
	try {
		var contents = fs.readFileSync(confFile, 'utf8');
		logger.debug(contents);
		confCache = JSON.parse(contents);
		return confCache;
	}
	catch (e) {
		logger.error('getDomopiConf:', e);

		try {
			// Try to create an empty file
			if (!fs.existsSync(confFile)) {
				fs.writeFileSync(confFile, "{}", 'utf8');
			}
		}
		catch (e) {
			logger.error('Cannot create default Domopi ConfFile:', e);
		}
	}
	return {};
}

// Write new Domopi Configuration (JSON Format)
exports.setDomopiConf = function(conf) {
	logger.debug('setDomopiConfig');
	try {
		var json = JSON.stringify(conf);
		confCache = conf;
		fs.writeFileSync(confFile, json, 'utf8'); 
	} 
	catch (e) {
		logger.error('setDomopiConf:', e);
	}
}

// Get Modification Time of Sensors Configuration file
exports.getDomopiConfMTime = function() {
	try {
		var stats = fs.statSync(confFile);
		//logger.debug(stats);
		return stats.mtime.getTime();
	}
	catch (e) {
		logger.error('getDomopiConfMTime:', e);
	}
	return -1;
}

// Extract the Controller description
exports.getControllerConf = function() {
	var conf = exports.getDomopiConf();
	if ('controller' in conf) {
		return conf['controller'];
	}
	return {}
}

// Save a Controller description
exports.setControllerConf = function(cfg) {
	var conf = exports.getDomopiConf();
	conf['controller'] = cfg;
	exports.setDomopiConf(conf);
}

// Extract a Sensor description from the configuration
exports.getSensorConf = function(devid, instid, sid) {
	logger.debug('getSensorConf:', devid, instid, sid);
	var conf = exports.getDomopiConf();
	if (!('sensors' in conf)) { conf['sensors'] = {}; }
	if (!(devid in conf['sensors'])) { conf['sensors'][devid] = {}; }
	if (!(instid in conf['sensors'][devid])) { conf['sensors'][devid][instid] = {}; }
	if (!(sid in conf['sensors'][devid][instid])) { conf['sensors'][devid][instid][sid] = {}; }
	return conf['sensors'][devid][instid][sid];
}

// Save a Sensor description
exports.setSensorConf = function(devid, instid, sid, cfg) {
	logger.debug('setSensorConf:', devid, instid, sid);
	var conf = exports.getDomopiConf();
	if (!(devid in conf['sensors'])) { conf['sensors'][devid] = {}; }
	if (!(instid in conf['sensors'][devid])) { conf['sensors'][devid][instid] = {}; }
	conf['sensors'][devid][instid][sid] = cfg;
	exports.setDomopiConf(conf);
}

// Get the Automation Rules
exports.getAutomationRules = function() {
	logger.debug('getAutomationRules');
	var conf = exports.getDomopiConf();
	if ('rules' in conf) {
		return conf['rules'];
	}
	return {}
}

// EOF 
