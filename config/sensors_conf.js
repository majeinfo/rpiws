// ------------------------------------
// Manage the Sensor Configuration
// ------------------------------------
//
var fs = require('fs');

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
		console.log(contents);
		//var zid = '34601';    
		var zid = contents.split('\n')[0];
	}
	catch (e) {
		console.error('getZid:', e);
	}
	return zid;
}

// Read the Domopi Key
exports.getDomopiKey = function() {
	var key = '0';
	try {
		var contents = fs.readFileSync(keyFile, 'utf8');
		console.log(contents);
		//var key = '1234';
		key = contents.split('\n')[0];
	}
	catch (e) {
		console.error('getDomopiKey:', e);
	}
	return key;
}

// Read the Sensors Configuration (JSON Format)
exports.getSensorsConf = function() {
	if (confCache) return confCache;
	try {
		var contents = fs.readFileSync(confFile, 'utf8');
		console.log(contents);
		confCache = JSON.parse(contents);
		return confCache;
	}
	catch (e) {
		console.error('getSensorsConf:', e);
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
		console.error('setSensorsConf:', e);
	}
}

// Get Modification Time of Sensors Configuration file
exports.getSensorsConfMTime = function() {
	try {
		var stats = fs.statSync(confFile);
		//console.log(stats);
		return stats.mtime.getTime();
	}
	catch (e) {
		console.error('getSensorsConfMTime:', e);
	}
	return -1;
}

// EOF 
