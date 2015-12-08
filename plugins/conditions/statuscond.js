// ----------------------------------------------------
// Evaluate SENSOR STATUS Condition
// ----------------------------------------------------
//
var domopi = require('../../config/domopi'),
    sensor = require('../../modules/sensor'),
    proxy = require('../../modules/proxy'),
    logger = require('../../modules/logger');

var _expectedParms = [ 'devid', 'instid', 'sid', 'testtype', 'value' ];
module.exports.expectedParms = _expectedParms;

module.exports.doCondition = function(cond) {
	var level;

	logger.debug('Check Status Condition');

        var sens = new sensor.findSensor(cond.devid, cond.instid, cond.sid);
        if (!sens) {
                logger.info('statuscond.doCondition: sensor not found');
                return false;
        }
	if ((level = sens.getCurrentMetric(cond)) === false) {
		logger.info('Unknown Metric Value for:', cond); 
		return false;
	}
	try {
		if (eval(level + cond.testtype + cond.value)) {
			return true;
		}
	}
	catch (e) {
		logger.error('eval failed:' + level + ' ' + cond.testtype + ' ' + cond.value);
	}
	
	return false;
};

// EOF
