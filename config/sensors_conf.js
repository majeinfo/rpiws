// ------------------------------------
// Manage the Sensor Configuration
// ------------------------------------
//
var fs = require('fs'),
    logger = require('../modules/logger');

var zidFile = '/etc/zbw/userid';
var keyFile = '/etc/domopi/config.js';
var confFile = '/etc/domopi/sensors.js';
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

// Read the Sensors Configuration (JSON Format)
exports.getSensorsConf = function() {
	if (confCache) return confCache;
	try {
		var contents = fs.readFileSync(confFile, 'utf8');
		logger.debug(contents);
		confCache = JSON.parse(contents);
		return confCache;
	}
	catch (e) {
		logger.error('getSensorsConf:', e);
	}
	return {};
}

// Write new Sensors Configuration (JSON Format)
exports.setSensorsConf = function(conf) {
	try {
		var json = JSON.stringify(conf);
		confCache = conf;
		fs.writeFileSync(confFile, json, 'utf8'); 
	} 
	catch (e) {
		logger.error('setSensorsConf:', e);
	}
}

// Get Modification Time of Sensors Configuration file
exports.getSensorsConfMTime = function() {
	try {
		var stats = fs.statSync(confFile);
		//logger.debug(stats);
		return stats.mtime.getTime();
	}
	catch (e) {
		logger.error('getSensorsConfMTime:', e);
	}
	return -1;
}

// EOF 
