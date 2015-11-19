// ---------------------------------------------------------
// Class for SENSOR
// ---------------------------------------------------------
//
var domopi = require('../config/domopi'),
    logger = require('../modules/logger'),
    zwave = require('../modules/zwave'),
    proxy = require('../modules/proxy');

// Dictionnary of Sensors
var mySensors = new Array();

// Ctor
var Sensor = function(devid, instid, sid) {
	this.devid = devid;
	this.instid = instid;
	this.sid = sid;
	this.data = {};
}

Sensor.prototype.getCurrentMetric = function() {
	var data = this.data;
	logger.debug('Data for Sensor:', data);
        if (!('metrics' in data)) {
                logger.info('Missing metrics in _getCurrentMetric');    // TODO: remonter au serveur Web ?
                return false;
        }

        var level = data.metrics.level;
        console.log('getCurrentMetrics:', level);
        if (level == undefined) return false;

        // Everything must be a string
        if (typeof level == 'number') level = level.toString();
        return level;
}

// Find a sensor in the bag
function findSensor(devid, instid, sid) {
	for (var i in mySensors) {
		var sens = mySensors[i];
		if (sens.devid == devid && sens.instid == instid && sens.sid == sid) return sens;
	}
	return false;
}

// Memorize a new sensor or update an old one
function updateSensors(devid, instid, sid, data) {
	var sens;
	logger.debug('updateSensors:', devid, instid, sid, data);
	if ((sens = findSensor(devid, instid, sid)) === false) {
		sens = new Sensor(devid, instid, sid);
		mySensors.push(sens);
	}
	sens.data = data;
}

// Send a command to a Sensor using our ZWave Web Interface
Sensor.prototype.sendCommand = function(cmd, next) {
        zwave.doGet('/sensor/command/' + this.devid + '/' + this.instid + '/' + this.sid + '/' + cmd, function(body) {
		logger.debug('sendCommand api call returned:', body);
		if (next) next(body);
        });
}

module.exports.updateSensors = updateSensors;
module.exports.findSensor = findSensor;
module.exports.Sensor = Sensor;

// EOF 
