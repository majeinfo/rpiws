// ---------------------------------------------------------
// SCHEDULER
// ---------------------------------------------------------
//
var fs = require('fs'),
    domopi = require('../config/domopi'),
    sensor = require('../modules/sensor'),
    proxy = require('../modules/proxy'),
    logger = require('../modules/logger');

var zid = domopi.getZid();
var key = domopi.getDomopiKey();

// Load the Condition Plugins
var _conditionPlugins = {};
var _plugFiles = fs.readdirSync('./plugins/conditions');
logger.debug(_plugFiles);
for (plug in _plugFiles) {
	var parts = _plugFiles[plug].split('.');
	if (parts.length != 2 || parts[1] != 'js') {
		logger.info('Plugin name ' + _plugFiles[plug] + ' ignored');
		continue;
	}
	plugname = parts[0];
	_conditionPlugins[plugname] = require('../plugins/conditions/' + _plugFiles[plug]);
}

// Load the Action Plugins
var _actionPlugins = {};
_plugFiles = fs.readdirSync('./plugins/actions');
logger.debug(_plugFiles);
for (plug in _plugFiles) {
	var parts = _plugFiles[plug].split('.');
	if (parts.length != 2 || parts[1] != 'js') {
		logger.info('Plugin name ' + _plugFiles[plug] + ' ignored');
		continue;
	}
	plugname = parts[0];
	_actionPlugins[plugname] = require('../plugins/actions/' + _plugFiles[plug]);
}

/*
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
*/

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
			logger.error('Rule is missing a condtype:' + rule.description);
			return false;
		}

                // Must find a Plugin with matching name:
                logger.debug('Test Condition: ' + cond.condtype + ' for rule ' + rule.description);
                var found = false;
                for (p in _conditionPlugins) {
                        if (_conditionPlugins[p] == cond.condtype) {
                                found = true;

                                // Check parms and launch action
                                var parm_ok = true;
                                for (parm in _conditionPlugins[p].expectedParms) {
                                        if (!cond[_conditionPlugins[p].expectedParms[parm]]) {
                                                logger.error('Rule ' + rule.description +
                                                                ' missing "' + cond[_conditionPlugins[p].expectedParms[parm]] +
                                                                '" parameter for Condition ' + cond.condtype);
                                                parm_ok = false;
                                        }
                                }
                                if (parm_ok) {
                                        if (_conditionPlugins[p].doCondition(cond)) {
						is_satisfied = true;
						continue;
					}
					return false;
                                }
                                break;
                        }
                }
                if (!found) {
                        logger.error('Rule ' + rule.description + ' has an unknown Condition Test: ' + cond.condtype);
                        continue;
                }

		/*
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
			}
			catch (e) {
				logger.error('eval failed:' + level + ' ' + cond.testtype + ' ' + cond.value);
				return false;
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
			// TODO: make sure stored time are in UTC
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
		else if (cond.condtype == 'statuscond') {	// same as Thresholdcond ?
			if ((level = _getCurrentMetric(cond)) === false) {
				logger.info('Unknown Metric Value for:', cond);	
				return false;
			}
			try {
				if (eval(level + cond.testtype + cond.value)) {
					is_satisfied = true; 
					continue; 
				}
			}
			catch (e) {
				logger.error('eval failed:' + level + ' ' + cond.testtype + ' ' + cond.value);
				return false;
			}
		}
		*/
	}

	return is_satisfied;
}

// Launch Actions
function _doActions(rule) {
	if (!('actions' in rule)) return false;
	if (!('description' in rule)) return false;

	for (i in rule.actions) {
		var action = rule.actions[i];
		if (!('actiontype' in action)) {
			logger.error('Action is missing an actiontype:' + rule.description);
			return; 
		}

		// Must find a Plugin with matching name:
                logger.debug('Execute action: ' + action.actiontype + ' for rule ' + rule.description);
		var found = false;
		for (p in _actionPlugins) {
			if (_actionPlugins[p] == action.actiontype) {
				found = true;

				// Check parms and launch action
				var parm_ok = true;
				for (parm in _actionPlugins[p].expectedParms) {
					if (!action[_actionPlugins[p].expectedParms[parm]]) {
						logger.error('Rule ' + rule.description +
								' missing "' + action[_actionPlugins[p].expectedParms[parm]] + 
								'" parameter for Action ' + action.actiontype);
						parm_ok = false;
					}
				}
				if (parm_ok) {
					var res = _actionPlugins[p].doAction(action);
				}
				break;
			}
		}
                if (!found) {
                        logger.error('Rule ' + rule.description + ' has an unknown Action Type: ' + action.actiontype);
                        continue;
                }
	}
}

// Check the Automation Rules
function _checkRules() {
	var rules = domopi.getAutomationRules();
	logger.debug('_checkRules');

	for (i in rules) {
		var rule = rules[i];
		logger.debug('Check Rule: ' + rule.description);
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

module.exports.updateStatus = updateStatus;

// EOF
