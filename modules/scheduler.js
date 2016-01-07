// ---------------------------------------------------------
// SCHEDULER
// ---------------------------------------------------------
//
var fs = require('fs'),
    rules = require('../modules/rules'),
    sensor = require('../modules/sensor'),
    proxy = require('../modules/proxy'),
    logger = require('../modules/logger');

// TODO: most of this code should be in modules/rules.js

// Load the Condition Plugins
var _conditionPlugins = {};
var _plugFiles = fs.readdirSync('./plugins/conditions');
logger.debug(_plugFiles);
for (var plug in _plugFiles) {
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
for (var plug in _plugFiles) {
	var parts = _plugFiles[plug].split('.');
	if (parts.length != 2 || parts[1] != 'js') {
		logger.info('Plugin name ' + _plugFiles[plug] + ' ignored');
		continue;
	}
	plugname = parts[0];
	_actionPlugins[plugname] = require('../plugins/actions/' + _plugFiles[plug]);
}

// RULE format:
// { description: 'xxxxx', conditions: [ ], actions: [ ] }
// CONDITION format: (default AND)
// { condtype: 'timecond'|'statuscond'|'thresholdcond'|'ruleconf'|'suntimecond', ... }
// 	if condtype == 'thresholdcond', devid:, instid:, sid:, value:, testtype: '>|<|>=|<=|==|!=' 
// 	if condtype == 'statuscond', devid:, instid:, sid:, value:'on|off', testtype: '==|!=' 
// 	if condtype == 'timecond', starttime: 'hh:mm', endtime: 'hh:mm', days: '01234567' 
// 	if condtype == 'suntimecond', when: 'sunrise'|'sunset', delta: 'minutes', offset: '+|-', random: '0|1'
// ACTION format: (default AND)
// { actiontype: 'sensorcmd'|'customcmd', ... }
// 	if actiontype == sensorcmd, devid:, instid:, sid:, value:'on|off' 

// Check if a Rule is satisfied
function _ruleSatisfied(rule) {
	var is_satisfied = false;
	var level;

	if (!('conditions' in rule)) return false;
	if (!('description' in rule)) return false;

	for (var i in rule.conditions) {
		var cond = rule.conditions[i];
		logger.debug('Evaluate condition:', cond);
		if (!('condtype' in cond)) {
			logger.error('Rule is missing a condtype:' + rule.description);
			return false;
		}

                // Must find a Plugin with matching name:
                logger.debug('Test Condition: ' + cond.condtype + ' for rule ' + rule.description);
                var found = false;
                for (var p in _conditionPlugins) {
                        if (p == cond.condtype) {
                                found = true;

                                // Check parms and launch action
                                var parm_ok = true;
                                for (var parm in _conditionPlugins[p].expectedParms) {
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
	}

	return is_satisfied;
}

// Launch Actions
function _doActions(rule) {
	if (!('actions' in rule)) return false;
	if (!('description' in rule)) return false;

	for (var i in rule.actions) {
		var action = rule.actions[i];
		if (!('actiontype' in action)) {
			logger.error('Action is missing an actiontype:' + rule.description);
			return; 
		}

		// Must find a Plugin with matching name:
                logger.debug('Execute action: ' + action.actiontype + ' for rule ' + rule.description);
		var found = false;
		for (var p in _actionPlugins) {
			if (p == action.actiontype) {
				found = true;

				// Check parms and launch action
				var parm_ok = true;
				for (var parm in _actionPlugins[p].expectedParms) {
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
	var autorules = rules.getRules();
	logger.debug('_checkRules');

	for (var i in autorules) {
		var rule = autorules[i];
		logger.debug('Check Rule: ' + rule.description);
		if (_ruleSatisfied(rule)) {
			if (!rule.isTriggered()) {
				_doActions(rule);
				rule.setTrigger();
			}
			else {
				logger.debug('Rule satisfied but already triggered !');
			}
		}
		else {
			rule.unsetTrigger();
		}
	}
}

// Handle the current status of sensors
function updateStatus(data) {
	for (var i in data) {
		sensor.updateSensors(data[i].devid, data[i].instid, data[i].sid, data[i]);
	}
	_checkRules();
}

module.exports.updateStatus = updateStatus;

// EOF
