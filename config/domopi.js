// ------------------------------------
// Manage the Domopi Configuration
// ------------------------------------
//
var fs = require('fs'),
    rules = require('../modules/rules'),
    sensors = require('../modules/sensor'),
    logger = require('../modules/logger');

var zidFile = '/etc/zbw/userid',
    keyFile = '/etc/domopi/config.js',
    dversionFile = '/etc/domopi/do-version',
    confFile = '/etc/domopi/domopi.js',
    confCache = undefined,
    _zid = undefined,
    _key = undefined;

// Read Domopi Version
exports.getDomopiVersion = function() {
	var version = '0';
	try {
		var contents = fs.readFileSync(dversionFile, 'utf8');
		var version = contents.split('\n')[0];
		logger.debug(dversionFile, 'contains:', version);
	}
	catch (e) {
		logger.error('getDomopiVersion:' + e);
	}
	return version;
}

// Read the zid:
exports.getZid = function() {
	if (_zid) return _zid;

	var zid = '0';
	try {
		var contents = fs.readFileSync(zidFile, 'utf8');
		var zid = contents.split('\n')[0];
		logger.debug(zidFile, 'contains:', zid);
	}
	catch (e) {
		logger.error('getZid:' + e);
	}
	return _zid = zid;
}

// Read the Domopi Key
exports.getDomopiKey = function() {
	if (_key) return _key;

	var key = '0';
	try {
		var contents = fs.readFileSync(keyFile, 'utf8');
		key = contents.split('\n')[0];
		logger.debug(keyFile, 'contains:', key);
	}
	catch (e) {
		logger.error('getDomopiKey:' + e);
	}
	return _key = key;
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
		logger.error('getDomopiConf:' + e);

		try {
			// Try to create an empty file
			if (!fs.existsSync(confFile)) {
				fs.writeFileSync(confFile, "{}", 'utf8');
			}
		}
		catch (e) {
			logger.error('Cannot create default Domopi ConfFile:' + e);
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
		logger.error('setDomopiConf:' + e);
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
		logger.error('getDomopiConfMTime:' + e);
	}
	return -1;
}

// Set Global Default Parameters
var _defaultGlob = {
	implicit_rules: {
		low_battery: {
			low_level: 80,
			email_subject: "Battery too low",
			email_content: "Battery of Sensor {SENSOR:NAME} is too low ({SENSOR:METRIC_VALUE})"
                			// + sname + ' is too low (' + allsensors[sens].getCurrentMetric() + ')'
                			// TODO: il faut une fonction d'interpolation
		}
	}
};
function _setGlobalDefaultParms2(cfg, defaultCfg) {
	for (var attr in defaultCfg) {
		// If attribute not defined or empty
		if (!cfg.hasOwnProperty(attr) || !cfg[attr]) {
			cfg[attr] = defaultCfg[attr];
		}
		if (typeof cfg[attr] === 'object') {
			_setGlobalDefaultParms2(cfg[attr], defaultCfg[attr]);
		}
	}
}
function _setGlobalDefaultParms(cfg) {
	if (!('email' in cfg) || !cfg.email) {
		logger.info('No default email address defined !');
		cfg.email = '';
	}
	_setGlobalDefaultParms2(cfg, _defaultGlob);
	return cfg;
}

// Extract the Global Parameters
exports.getGlobalConf = function() {
	var conf = exports.getDomopiConf();
	if ('global' in conf) {
		return _setGlobalDefaultParms(conf['global']);
	}
	return _setGlobalDefaultParms({});
}

// Save the Global Parameters
exportssetGlobalConf = function(cfg) {
	var conf = exports.getDomopiConf();
	conf['global'] = cfg;
	exports.setDomopiConf(conf);
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

// Set the Automation Rules
exports.setAutomationRules = function(rules) {
	logger.debug('setAutomationRules');
	var conf = exports.getDomopiConf();
	conf['rules'] = rules;
	exports.setDomopiConf(conf);

	// Re-create the Rules objects
	rules.flushRules();
	for (r in rules) { rules.addRule(rules[i]); }

	// Add the implicit Rules !

	// 1-check the battery level of all Sensor
	var allsensors = sensors.getSensors();
	var globconf = exports.getGlobalConf()['implicit_rules']['low_battery'];
	for (var sens in allsensors) {
		logger.debug('Sensor type: ' + allsensors[sens]['data'].devtype);
		if (allsensors[sens]['data'].devtype == 'battery') {
			var sname = allsensors[sens].getSimplename();
			var descr = 'Battery of ' + sname;
			var cond = { condtype: 'thresholdcond', testtype: '<=', value: globconf.low_level };
			var act = { acttype: 'emailcmd', subject: globconf.email_subject, content: globconf.email_content };
			var r = { is_implicit: true, description: descr, conditions: [cond], actions: [act] };
			rules.addRule(r);
		}
	}
}

// EOF 
