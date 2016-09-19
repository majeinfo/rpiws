// ------------------------------------
// Manage the Domopi Configuration
//
// Conf looks like :
// {
// 	"versions": {
// 		"rules": 5,
// 		"sensors": 2,
// 		"user": 1
// 	},
// 	"rules": [ ],
// 	"sensors": { },
// 	"user": { }
// }
//
// TODO: Rules should have an ID and
// 	 not a Description as a key
// ------------------------------------
//
var fs = require('fs'),
    os = require('os'),
    gmap = require('googlemaps'),
    local = require('../config/local.js'),
    m_rules = require('../modules/rules'),
    sensors = require('../modules/sensor'),
    logger = require('../modules/logger');

var zidFile = '/etc/zbw/userid',
    keyFile = '/etc/domopi/config.js',
    dversionFile = '/etc/domopi/do-version',
    confFile = '/etc/domopi/domopi.js',
    confCache = undefined,
    _zid = undefined,
    _key = undefined;

// Useful for testing purpose
exports.setConfFile = function(conffile) {
	confFile = conffile;
}
exports.clearCache = function() {
	confCache = undefined;
}

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
	logger.debug('setDomopiConf');
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
		// Second chance: take user email
		var user = exports.getUserProfile();
		if ('email' in user) {
			cfg.email = user['email'];
		}
		else {
			logger.info('No default email address defined !');
			cfg.email = '';
		}
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
exports.setGlobalConf = function(cfg) {
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
	logger.info('Memorize new Automation Rules');
	var conf = exports.getDomopiConf();

	// Before overwriting rules with the new ones, we must
	// memorize the already triggered ones (this is not perfect
	// because the Rules are recognized according to their
	// description... which may be modified)

	// Save the trigger flag
	var old_rules = m_rules.getRules();
	var r_desc = {};
	for (var idx in old_rules) {
		r_desc[old_rules[idx].description] = old_rules[idx].isTriggered();
	}

	// Set the new rules
	conf['rules'] = rules;
	exports.setDomopiConf(conf);

	// Re-create the Rules objects
	m_rules.flushRules();
	for (var idx in rules) { m_rules.addRule(rules[idx]); }

	// Restore the trigger flag
	var new_rules = m_rules.getRules();
	for (var idx in new_rules) {
		var desc = new_rules[idx].description;
		if ((desc in r_desc) && r_desc[desc]) {
			new_rules[idx].setTrigger();
		}
	}

	// Add the implicit Rules !
	if (!('user' in conf) || !conf['user'].email) return;

	// 1-check the battery level of all Sensor
	var allsensors = sensors.getSensors();
	var globconf = exports.getGlobalConf()['implicit_rules']['low_battery'];
	logger.info('Apply Low Battery implicit Rule');
	for (var sens in allsensors) {
		logger.debug('Sensor type: ' + allsensors[sens]['data'].deviceType);
		if (allsensors[sens]['data'].deviceType == 'battery') {
			var sensor = allsensors[sens];
			var sname = sensor.getSimpleName();
			var descr = 'Battery of ' + sname;
			var cond = { condtype: 'thresholdcond', testtype: '<=', value: globconf.low_level, devid: sensor.devid, instid: sensor.instid, sid: sensor.sid  };
			var act = { actiontype: 'emailcmd', email: conf['user'].email, subject: globconf.email_subject, content: globconf.email_content };
			var r = { is_implicit: true, description: descr, frequency: 60*60*24*1000, conditions: [cond], actions: [act] };
			logger.info('Add implicit Rule for Battery Checking of: ', sname);
			m_rules.addRule(r);
		}
	}
}

// Get the User Profile
exports.getUserProfile = function() {
	logger.debug('getUserProfile');
	var conf = exports.getDomopiConf();
	if ('user' in conf) {
		return conf['user'];
	}
	return {}
}

// Set the User Profile
exports.setUserProfile = function(user) {
	logger.debug('setUserProfile');
	var conf = exports.getDomopiConf();

	// If address changed or new or if no lat/lon : ask for one
	if (user['address'] && 
	    (!('user' in conf) || ('address' in conf['user']) && user['address'] != conf['user']['address']) || (!('lat' in conf['user']))) {
		var cfg = {
			key: local.geocode_key
		};
		var geoParams = {
			'address': user['address']
		};
		var gmAPI = new gmap(cfg);
		logger.debug('call gmAPI.geocode');
		gmAPI.geocode(geoParams, function(err, result){
			logger.debug('geocode:', result);
			logger.debug('err:', err);
			if (!err && result && 'results' in result && result['results'].length > 0) {
				user['lat'] = result['results'][0]['geometry']['location']['lat'];
				user['lng'] = result['results'][0]['geometry']['location']['lng'];
			}
			conf['user'] = user;
			exports.setDomopiConf(conf);
		});
	}
	else {
		conf['user'] = user;
		exports.setDomopiConf(conf);
	}
}

// Get the local IP
exports.getMyLocalIP = function() {
        var networkInterfaces = os.networkInterfaces( );
        for (var devName in networkInterfaces) {
                var iface = networkInterfaces[devName];

                for (var i = 0; i < iface.length; i++) {
                        var alias = iface[i];
                        if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
                                return alias.address;
                }
        }

        return '0.0.0.0';
}

// Load the Rules at the start :
// No: we must wait for the full device list
//exports.setAutomationRules(exports.getAutomationRules());

// EOF 
