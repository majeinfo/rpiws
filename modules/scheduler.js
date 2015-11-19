// ---------------------------------------------------------
// SCHEDULER
// ---------------------------------------------------------
//
var domopi = require('../config/domopi'),
    sensor = require('../modules/sensor'),
    logger = require('../modules/logger');

// Get the current metric value
function _getCurrentMetric(details) {
	console.log('_getCurrentMetric:', details);
	if (!('devid' in details) || !('instid' in details) || !('sid' in details)) {
		logger.info('Missing attribute in _getCurrentMetric');	// TODO: remonter au serveur Web
		return false;
	}
	var sens = new sensor.findSensor(details.devid, details.instid, details.sid);
	if (!sens) {
		logger.info('sensor not found in _getCurrentMetric');	// TODO: remonter au serveur Web
		return false;
	}
	return sens.getCurrentMetric();
}

// RULE format:
// { description: 'xxxxx', conditions: [ ], actions: [ ] }
// CONDITION format: (default AND)
// { condtype: 'timecond'|'statuscond'|'thresholdcond'|'ruleconf', details: { }
// 	if condtype == 'thresholdcond', details={ devid:, instid:, sid:, value:, testtype: '>|<|>=|<=|==|!=' }
// 	if condtype == 'statuscond', details={ devid:, instid:, sid:, value:'on|off', testtype: '==|!=' }
// ACTION format: (default AND)
// { actiontype: 'sensorcmd'|'customcmd', details: {} }
// 	if actiontype == sensorcmd, details={ devid:, instid:, sid:, value:'on|off' }

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
		if (!('details' in cond)) {
			logger.error('Rule is missing details:', rule.description);
			return false;
		}
		if (cond.condtype == 'thresholdcond') {
			if ((level = _getCurrentMetric(cond.details)) === false) {
				logger.info('Unknown Metric Value for:', cond.details);	// TODO: should be returned to the Web Server
				return false;
			}
			try {
				logger.debug('eval(', level + cond.details.testtype + cond.details.value, ')');
				if (eval(level + cond.details.testtype + cond.details.value)) {
					is_satisfied = true; 
					continue; 
				}
				else {
					return false;
				}
			}
			catch (e) {
				logger.error('eval failed');
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
		if (!('details' in action)) {
			logger.error('Action is missing details:', rule.description);
			continue;
		}
		if (action.actiontype == 'sensorcmd') {
			var details = action.details;
			if (!('devid' in details) || !('instid' in details) || !('sid' in details)) {
				logger.info('Missing attribute in _doActions');	// TODO: remonter au serveur Web
				continue;
			}
			var sens = new sensor.findSensor(details.devid, details.instid, details.sid);
			if (!sens) {
				logger.info('sensor not found in _doActions');	// TODO: remonter au serveur Web
				continue;
			}
			// Send the command (do we need to check if the status is already good ?)
			sens.sendCommand(details.value, function(body) {
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
