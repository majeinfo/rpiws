// ---------------------------------------------------------
// SCHEDULER
// ---------------------------------------------------------
//
var domopi = require('../config/domopi'),
    sensor = require('../modules/sensor'),
    logger = require('../modules/logger');

// Get the current metric value
function _getCurrentMetric(obj) {
	console.log('_getCurrentMetric:', obj);
	if (!('devid' in obj) || !('instid' in obj) || !('sid' in obj)) {
		logger.info('Missing attribute in _getCurrentMetric');
		return false;
	}
	var sens = new sensor.findSensor(obj.devid, obj.instid, obj.sid);
	if (!sens) {
		logger.info('sensor not found in _getCurrentMetric');
		return false;
	}
	return sens.getCurrentMetric();
}

// RULE format:
// { description: 'xxxxx', conditions: [ ], actions: [ ] }
// CONDITION format: (default AND)
// { condtype: 'timecond'|'statuscond'|'thresholdcond'|'ruleconf', ... }
// 	if condtype == 'thresholdcond', devid:, instid:, sid:, value:, testtype: '>|<|>=|<=|==|!=' 
// 	if condtype == 'statuscond', devid:, instid:, sid:, value:'on|off', testtype: '==|!=' 
// 	if condtype == 'timecond', starttime: 'hh:mm', endtime: 'hh:mm', days: '01234567' 
// ACTION format: (default AND)
// { actiontype: 'sensorcmd'|'customcmd', ... }
// 	if actiontype == sensorcmd, devid:, instid:, sid:, value:'on|off' 

// Check if a Rule is satisfied
function _ruleSatisfied(rule) {
	var is_satisfied = false;
	var level;

	if (!('conditions' in rule)) return false;
	if (!('description' in rule)) return false;

	for (i in rule.conditions) {
		var cond = rule.conditions[i];
		logger.debug('Evaluate condition:', cond);
		if (!('condtype' in cond)) {
			logger.error('Rule is missing a condtype:', rule.description);
			return false;
		}
		if (cond.condtype == 'thresholdcond') {
			if ((level = _getCurrentMetric(cond)) === false) {
				logger.info('Unknown Metric Value for:', cond);	
				return false;
			}
			try {
				logger.debug('eval(', level + cond.testtype + cond.value, ')');
				if (eval(level + cond.testtype + cond.value)) {
					is_satisfied = true; 
					continue; 
				}
				else {
					logger.error('rule', rule.description, 'could not be evaluated:', cond);
					return false;
				}
			}
			catch (e) {
				logger.error('eval failed:', level, cond.testtype, cond.value);
			}
		}
		else if (cond.condtype == 'timecond') {
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
			logger.debug('starttime:', starttime, 'endtime:', endtime);
			if (starttime && !endtime) {
				var curtime = curdate.getUTCHours() * 60 + curdate.getUTCMinutes();
				logger.debug('curtime:', curtime);
				if (starttime <= curtime && (starttime+60) >= curtime) {
					is_satisfied = true;
					continue;
				}
			}
			// (the user wants "this" to be executed from HH:MM until HH:MM)
			// TODO: ?????
			if (starttime && endtime) {
			}
		}
		else if (cond.condtype == 'statuscond') {
		}
		else {
			logger.error('Rule has unknown condtype:', rule.description, cond.condtype);
			return false;
		}
	}

	return is_satisfied;
}

// Launch Actions
function _doActions(rule) {
	if (!('actions' in rule)) return false;
	if (!('description' in rule)) return false;

	for (i in rule.actions) {
		var action = rule.actions[i];

                logger.debug('Execute action:', action);
                if (!('actiontype' in action)) {
                        logger.error('Action is missing an actiontype:', rule.description);
                        continue;
                }
		if (action.actiontype == 'sensorcmd') {
			var sens = new sensor.findSensor(action.devid, action.instid, action.sid);
			if (!sens) {
				logger.info('sensor not found in _doActions');
				continue;
			}
			// Send the command (do we need to check if the status is already good ?)
			sens.sendCommand(action.value, function(body) {
				if (!body) {
					logger.error('Action failed');
				}
			});
		}
		else {	
			logger.error('Action has unknown actiontype:', rule.description, action.actiontype);
		}
	}
}

// Check the Automation Rules
function _checkRules() {
	var rules = domopi.getAutomationRules();
	logger.debug('_checkRules');

	for (i in rules) {
		var rule = rules[i];
		if (_ruleSatisfied(rule)) {
			_doActions(rule);
		}
	}
}

// Handle the current status of sensors
function updateStatus(data) {
	for (i in data) {
		sensor.updateSensors(data[i].devid, data[i].instid, data[i].sid, data[i]);
	}
	_checkRules();
}

/*
// Start the Scheduler
function start() {
}

module.exports.start = start;
*/
module.exports.updateStatus = updateStatus;

// EOF
