// ----------------------------------------------------
// Evaluate TIME Condition
// ----------------------------------------------------
//
var domopi = require('../../config/domopi'),
    sensor = require('../../modules/sensor'),
    proxy = require('../../modules/proxy'),
    logger = require('../../modules/logger');

//var _expectedParms = [ 'days', 'starttime', 'endtime' ];
var _expectedParms = [ ];
module.exports.expectedParms = _expectedParms;

module.exports.doCondition = function(cond) {
	logger.debug('Check Time Condition');

	var curdate = new Date(),
	    starttime = undefined,
	    endtime = undefined,
	    parts;

	// Check the day of the week
	if ('days' in cond.days && cond.days != '') {
		var curday = curdate.getDay();
		if (cond.days.indexOf(curday.toString()) == -1) return false;
	}

	if ('starttime' in cond && cond.starttime != '') {
		parts = cond.starttime.split(':');
		starttime = parseInt(parts[0]) * 60 + parseInt(parts[1]);
	}
	if ('endtime' in cond && cond.endtime != '') {
		parts = cond.endtime.split(':');
		endtime = parseInt(parts[0]) * 60 + parseInt(parts[1]);
	}

	// If starttime only, we must check if we are in the same minute
	// (the user wants "this" to be executed AT HH:MM)
	// TODO: make sure stored time are in UTC
	logger.debug('starttime:', starttime, 'endtime:', endtime);
	if (starttime && !endtime) {
		var curtime = curdate.getUTCHours() * 60 + curdate.getUTCMinutes();
		logger.debug('curtime:', curtime);
		if (starttime <= curtime && (starttime+60) >= curtime) {
			return true;
		}
	}
	// (the user wants "this" to be executed from HH:MM until HH:MM)
	// TODO: ?????
	if (starttime && endtime) {
	}
	
	return false;
};

// EOF
