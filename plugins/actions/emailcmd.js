// ----------------------------------------------------
// Action Module for sending Emails
// ----------------------------------------------------
//
var domopi = require('../../config/domopi'),
    sensor = require('../../modules/sensor'),
    proxy = require('../../modules/proxy'),
    logger = require('../../modules/logger');

var zid = domopi.getZid();
var key = domopi.getDomopiKey();

// Send an email notification demand to remote web
function _sendEmailNotification(email, subject, content, rule) {
	logger.debug('_sendEmailNotification');

	// There must be at least one condition which can be used to
	// make Macro substitution
	if (rule.conditions.length > 0) {
		var sens = sensor.findSensor(rule.conditions[0]['devid'], rule.conditions[0]['instid'], rule.conditions[0]['sid']);
		if (sens) {
			content = content.replace(/{SENSOR:NAME}/ig, sens.getDescription())
			content = content.replace(/{SENSOR:METRIC_VALUE}/ig, sens.getCurrentMetric())
		}
	}
	
	// Add a link to the remote web server at the end of the mail
	content += '\n\n' + domopi.login_url;
	
	var body = { email: email, subject: subject, body: content };
	var data = { data: body, status: 'ok', zid: zid, key: key, evttype: 'sendemail', updated: Date.now() };
	proxy.mkpost('/poller/sendemail', JSON.stringify(data), function(resp) {
		if (resp === false) {
			logger.info('email notification not sent: NO retry');
		}
	});
}

var _expectedParms = [ 'email', 'subject' ];
module.exports.expectedParms = _expectedParms;

module.exports.doAction = function(action, rule) {
	logger.debug('should send an email to: ' + action.email + ' with subject: ' + action.subject);
	_sendEmailNotification(action.email, action.subject, action.content, rule);
	return true;
};

module.exports.undoAction = function(action, rule) {
	logger.debug('should send an email to: ' + action.email + ' with subject: (END) ' + action.subject);
	_sendEmailNotification(action.email, action.subject + ' (END)', action.content, rule);
	return true;
};

// EOF
