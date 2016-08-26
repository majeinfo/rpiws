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

		// Check if Sensor disappear
		if ('devid' in cond) {
        		var sens = sensor.findSensor(cond.devid, cond.instid, cond.sid);
			if (!sens) {
				logger.error('Rule is set invalid because Sensor does not exists in Condition: ' + rule.description);
				rule.setInvalid();
				continue;
			}
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
                                        if (!(_conditionPlugins[p].expectedParms[parm] in cond)) {
                                                logger.error('Rule ' + rule.description +
                                                                ' missing "' + _conditionPlugins[p].expectedParms[parm] +
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
			logger.error('Action is missing an actiontype: ' + rule.description);
			return; 
		}

		// Check if Sensor disappear
		if ('devid' in action) {
        		var sens = sensor.findSensor(action.devid, action.instid, action.sid);
			if (!sens) {
				logger.error('Rule is set invalid because Sensor does not exists in Action: ' + rule.description);
				rule.setInvalid();
				continue;
			}
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
					if (!(_actionPlugins[p].expectedParms[parm] in action)) {
						logger.error('Rule ' + rule.description +
								' missing "' + _actionPlugins[p].expectedParms[parm] + 
								'" parameter for Action ' + action.actiontype);
						parm_ok = false;
					}
				}
				if (parm_ok) {
					var res = _actionPlugins[p].doAction(action, rule);
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

// UnLaunch Actions
function _undoActions(rule) {
	if (!('actions' in rule)) return false;
	if (!('description' in rule)) return false;

	for (var i in rule.actions) {
		var action = rule.actions[i];
		if (!('actiontype' in action)) {
			logger.error('Action is missing an actiontype: ' + rule.description);
			return; 
		}

		// Check if Sensor disappear
		if ('devid' in action) {
        		var sens = sensor.findSensor(action.devid, action.instid, action.sid);
			if (!sens) {
				logger.error('Rule is set invalid because Sensor does not exists in Action: ' + rule.description);
				rule.setInvalid();
				continue;
			}
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
					if (!(_actionPlugins[p].expectedParms[parm] in action)) {
						logger.error('Rule ' + rule.description +
								' missing "' + _actionPlugins[p].expectedParms[parm] + 
								'" parameter for Action ' + action.actiontype);
						parm_ok = false;
					}
				}
				if (parm_ok) {
					var res = _actionPlugins[p].undoAction(action, rule);
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
		logger.info('Check Rule: ' + rule.description);
		if (!rule.isActive()) {
			logger.info('rule is not active');
			continue;
		}
		if (!rule.isValid()) {
			logger.error('rule is not valid');
			continue;
		}
		if (_ruleSatisfied(rule)) {
			// The Rule must be played if not already triggered
			if (!rule.isTriggered()) {
				logger.info('Rule satisfied !');
				_doActions(rule);
				rule.setTrigger();
			}
			else {
				logger.info('Rule satisfied but already triggered !');
			}
		}
		else {
			// The Rule must be "unplayed" if already triggered
			if (rule.isTriggered()) {
				logger.info('Rule unsatisfied !');
				_undoActions(rule);
				rule.unsetTrigger();
			}
			else {
				logger.debug('Rule not satisfied but already untriggered !');
			}
		}
	}
}

// Handle the current status of sensors
function updateStatus(data) {
	for (var i in data) {
		sensor.updateSensor(data[i].devid, data[i].instid, data[i].sid, data[i]);
	}
	_checkRules();
}

module.exports.updateStatus = updateStatus;

// EOF
