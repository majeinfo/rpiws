// ----------------------------------------------------
// Evaluate SENSOR THRESHOLD Condition
// ----------------------------------------------------
//
var domopi = require('../../config/domopi'),
    sensor = require('../../modules/sensor'),
    proxy = require('../../modules/proxy'),
    logger = require('../../modules/logger');

var _expectedParms = [ 'devid', 'instid', 'sid', 'testtype', 'value' ];
module.exports.expectedParms = _expectedParms;

// Hash-map to memorize duration starts
var durations = {};

module.exports.doCondition = function(cond) {
	var level;

	logger.debug('Check Threshold Condition');

        var sens = sensor.findSensor(cond.devid, cond.instid, cond.sid);
        if (!sens) {
                logger.info('thresholdcond.doCondition: sensor not found');
                return false;
        }
	if ((level = sens.getCurrentMetric(cond)) === false) {
		logger.info('Unknown Metric Value for:', cond); 
		return false;
	}
	try {
		logger.debug('eval(', level + cond.testtype + cond.value, ')');
		if (eval(level + cond.testtype + cond.value)) {
			// Take care of "duration"
			if (!('duration' in cond)) {
				logger.info('No duration given');
				return true;
			}
			if (cond.duration == 0) {
				logger.info('Duration is null');
				return true;
			}
			if (!durations[cond]) {	// undefined or 0
				logger.info('Duration starts now !');
				durations[cond] = Math.floor(Date.now() / (1000 * 60));
				return false;
			}
			else {
				var curtime = Math.floor(Date.now() / (1000 * 60));
				if ((curtime - durations[cond]) >= cond.duration) {
					logger.info('Duration has been satisfied');
					return true;
				}
				else {
					logger.debug('Duration not yet satisfied');
					return false;
				}
			}
			return true;
		}
	}
	catch (e) {
		logger.error('eval failed:' + level + ' ' + cond.testtype + ' ' + cond.value);
	}

	// Clear the map
	durations[cond] = 0;

	return false;
};

// EOF
