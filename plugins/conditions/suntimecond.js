// ----------------------------------------------------
// Evaluate SUNTIME Condition
// ----------------------------------------------------
//
var domopi = require('../../config/domopi'),
    sensor = require('../../modules/sensor'),
    proxy = require('../../modules/proxy'),
    suntime = require('../../modules/suntime'),
    logger = require('../../modules/logger');

//var _expectedParms = [ 'days': '01234567', 'sunevt': 'sunrise'|'sunset', sundelay: <minutes>, sunoffset: 'before'|'after' ]
var _expectedParms = [ 'days', 'sunevt', 'sundelay', 'sunoffset' ];
module.exports.expectedParms = _expectedParms;

module.exports.doCondition = function(cond) {
	logger.debug('Check Suntime Condition');

	var curdate = new Date();

	// Check the day of the week
	if ('days' in cond && cond.days != '') {
		var curday = curdate.getDay();
		if (cond.days.indexOf(curday.toString()) == -1) return false;
	}

	var condtime = null;
	if (cond.sunevt == 'sunrise') {
		condtime = suntime.getSunRise();
	}
	else if (cond.sunevt == 'sunset') {
		condtime = suntime.getSunSet();
	}
	else {
		logger.error('Suntime evt unknown: ' + cond.sunevt);
		return false;
	}

	// Convert the condtime into minutes and same conversion for curdate 
	var curmin = curdate.getUTCHours() * 60 + curdate.getUTCMinutes();
	try {
		var sundate = new Date('2000/01/01 ' + condtime + ' UTC');
		var sunmin = sundate.getUTCHours() * 60 + sundate.getUTCMinutes();
		if (cond.sunoffset && cond.sundelay) {
			if (cond.sunoffset == 'before') sunmin -= cond.sundelay;
			else if (cond.sunoffset == 'after') sunmin += cond.sundelay;
			else logger.error('Suntime offset unknown: ' + cond.sunoffset);
		}
		if (Math.abs(sunmin - curmin) < 2) {
			logger.debug('Suntime Condition match !');
			return true;
		}
	} catch(e) {
		logger.error('Invalid date : ' + condtime);
	}

	return false;
};

// EOF
