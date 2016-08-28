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
	this.frequency = json_rule.frequency;
	this.conditions = json_rule.conditions;
	this.actions = json_rule.actions;
	this.is_active = ('is_active' in json_rule) ? json_rule.is_active: true;
	this._triggered = false;
	this._triggered_at = undefined;	// in milli-seconds
	this._implicit = (is_implicit === true);
	this._valid = true;
}

// Enable/Disable Rule
Rule.prototype.isActive = function() {
	return (!('is_active' in this)) || this.is_active === true;
}

// Return Rule Trigger
Rule.prototype.isTriggered = function() {
	return this._triggered === true;
}

// Set/Unset Rule Trigger
Rule.prototype.setTrigger = function() {
	this._triggered = true;
	this._triggered_at = new Date().getTime();
}
Rule.prototype.unsetTrigger = function() {
	this._triggered = false;
	this._triggered_at = undefined;
}

// Return Triggered time
Rule.prototype.getTriggeredTime = function() {
	return this._triggered_at;
}

Rule.prototype.getActionFrequency = function() {
	return this.frequency;
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
