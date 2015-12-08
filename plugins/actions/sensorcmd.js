// ----------------------------------------------------
// Action Module for Sensor Command
// ----------------------------------------------------
//
var domopi = require('../../config/domopi'),
    sensor = require('../../modules/sensor'),
    proxy = require('../../modules/proxy'),
    logger = require('../../modules/logger');

var _expectedParms = [ 'devid', 'instid', 'sid' ];
module.exports.expectedParms = _expectedParms;

module.exports.doAction = function(action) {
	logger.debug('should send a Command to Sensor: ' + action.devid + action.instid + action.sid);
	var sens = new sensor.findSensor(action.devid, action.instid, action.sid);
	if (!sens) {	// TODO: could be made at the upper level
		logger.info('sensor not found in sensorcmd doAction');
		return False;
	}
	//
	// Send the command (do we need to check if the status is already good ?)
	sens.sendCommand(action.value, function(body) {
		if (!body) {
			logger.error('sensorcmd.doAction failed to send command "' + action.value + '" at Sensor ' + sens.getSimpleName());
		}
	});
	return True;
};

// EOF
