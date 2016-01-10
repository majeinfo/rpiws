// ---------------------------------------------------------
// Class for AUTOMATION RULES
// ---------------------------------------------------------
//
var logger = require('../modules/logger');

// Dictionnary of Rules
var myRules = new Array();

// Ctor
var Rule = function(json_rule, is_implicit) {
	this.description = json_rule.description;
	this.conditions = json_rule.conditions;
	this.actions = json_rule.actions;
	this._triggered = false;
	this._implicit = (is_implicit === true);
	this._valid = true;
}

// Return Rule Trigger
Rule.prototype.isTriggered = function() {
	return this._triggered === true;
}

// Set/Unset Rule Trigger
Rule.prototype.setTrigger = function() {
	this._triggered = true;
}
Rule.prototype.unsetTrigger = function() {
	this._triggered = false;
}

// Mark a Rule as invalid (in case of Sensor Exclusion)
// The Rule may be valid again when they will be added again
Rule.prototype.isValid = function() {
	return this._valid;
}

Rule.prototype.setInvalid = function() {
	this._valid = false;
}

// Flush all Rules
function flushRules() {
	myRules = new Array();
}

// Return all Rules
function getRules() {
	return myRules;
}

// Create and memorize a new Rule
function addRule(rule, is_implicit) {
	logger.debug('addRule', rule);
	var r = new Rule(rule, is_implicit);
	myRules.push(r);
	return r;
}

module.exports.flushRules = flushRules;
module.exports.getRules = getRules;
module.exports.addRule = addRule;
module.exports.Rule = Rule;

// EOF 
