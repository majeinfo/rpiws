// ----------------------------------------------------
// Evaluate TIME Condition
// ----------------------------------------------------
//
var domopi = require('../../config/domopi'),
    sensor = require('../../modules/sensor'),
    proxy = require('../../modules/proxy'),
    logger = require('../../modules/logger'),
    moment = require('moment-timezone');

//var _expectedParms = [ 'days', 'starttime', 'endtime' ];
var _expectedParms = [ ];
module.exports.expectedParms = _expectedParms;

module.exports.doCondition = function(cond) {
	logger.debug('Check Time Condition');

	var curdate = new Date(),
	    starttime = undefined,	// expressed in local time
	    endtime = undefined,	// expressed in local time
	    parts_start, parts_end;

	// Check the day of the week
	if ('days' in cond && cond.days != '') {
		var curday = curdate.getDay();
		if (cond.days.indexOf(curday.toString()) == -1) return false;
	}

	if ('starttime' in cond && cond.starttime != '') {
		parts_start = cond.starttime.split(':');
		starttime = parseInt(parts_start[0]) * 60 + parseInt(parts_start[1]);
	}
	if ('endtime' in cond && cond.endtime != '') {
		parts_end = cond.endtime.split(':');
		endtime = parseInt(parts_end[0]) * 60 + parseInt(parts_end[1]);
	}

	// If starttime only, we must check if we are in the same minute
	// (the user wants "this" to be executed AT HH:MM)
	logger.debug('(local) starttime:', starttime, 'endtime:', endtime);
	var d = new Date();
	d.setHours(parseInt(parts_start[0]));
	d.setMinutes(parseInt(parts_start[1]));
	var curdate2 = moment.tz(d, "Europe/Paris");
	curdate2 = curdate2.tz('UTC');
	starttime = curdate2.hours() * 60 + curdate2.minutes();

	d.setHours(parseInt(parts_end[0]));
	d.setMinutes(parseInt(parts_end[1]));
	curdate2 = moment.tz(d, "Europe/Paris");
	curdate2 = curdate2.tz('UTC');
	endtime = curdate2.hours() * 60 + curdate2.minutes();
	logger.debug('(UTC) starttime:', starttime, 'endtime:', endtime);

	if (starttime && !endtime) {
		var curtime = curdate.getUTCHours() * 60 + curdate.getUTCMinutes();
		logger.debug('(UTC) curtime:', curtime);
		if (starttime <= curtime && (starttime+1) >= curtime) {
			return true;
		}
	}
	// (the user wants "this" to be executed from HH:MM until HH:MM)
	if (starttime && endtime) {
		var curtime = curdate.getUTCHours() * 60 + curdate.getUTCMinutes();
		logger.debug('(UTC) curtime:', curtime);
		if (starttime <= curtime && curtime <= endtime) {
			return true;
		}
	}
	
	return false;
};

// EOF
