// ---------------------------------------------------------
// Class for SENSOR
// ---------------------------------------------------------
//
var domopi = require('../config/domopi'),
    logger = require('../modules/logger'),
    zwave = require('../modules/zwave');

// Dictionnary of Sensors
var mySensors = new Array();

// Ctor
var Sensor = function(devid, instid, sid) {
	this.devid = devid;
	this.instid = instid;
	this.sid = sid;
	this.data = {};
}

// Return Sensor simple name
Sensor.prototype.getSimpleName = function() {
	return this.devid + '-' + this.instid + '-' + this.sid;
}

// Get Sensor current Metric
Sensor.prototype.getCurrentMetric = function() {
	var data = this.data;
	logger.debug('Data for Sensor:', data);
        if (!('metrics' in data)) {
                logger.info('Missing metrics in _getCurrentMetric');
                return false;
        }

        var level = data.metrics.level;
        logger.debug('getCurrentMetrics:', level);
        if (level == undefined) return false;

        // Everything must be a string
        if (typeof level == 'number') level = level.toString();
        return level;
}

// Send a command to a Sensor using our ZWave Web Interface
Sensor.prototype.sendCommand = function(cmd, next) {
        zwave.sendCommand(this.devid, this.instid, this.sid, cmd, next);
}

// Change the Sensor Description
Sensor.prototype.setDescription = function(newdesc, next) {
        var cfg = domopi.getSensorConf(this.devid, this.instid, this.sid);
        cfg.title = newdesc;
        domopi.setSensorConf(this.devid, this.instid, this.sid, cfg);
	if (next) next();
}

// Set the Sensor Type
Sensor.prototype.setType = function(stype, next) {
        var cfg = domopi.getSensorConf(this.devid, this.instid, this.sid);
        cfg.type = stype;
        domopi.setSensorConf(this.devid, this.instid, this.sid, cfg);
	if (next) next();
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
	return sens;
}

module.exports.getSensors = function() { return mySensors; }
module.exports.updateSensors = updateSensors;
module.exports.findSensor = findSensor;
module.exports.Sensor = Sensor;

// EOF 
