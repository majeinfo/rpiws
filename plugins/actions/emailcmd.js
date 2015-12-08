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
function _sendEmailNotification(email, subject) {
	logger.debug('_sendEmailNotification');
	var body = { email: email, subject: subject };
	var data = { data: body, status: 'ok', zid: zid, key: key, evttype: 'sendemail', updated: Date.now() };
	proxy.mkpost('/poller/sendemail', JSON.stringify(data), function(resp) {
		if (resp === false) {
			logger.info('email notification not sent: NO retry');
		}
	});
}

var _expectedParms = [ 'email', 'subject' ];
module.exports.expectedParms = _expectedParms;

module.exports.doAction = function(action) {
	logger.debug('should send an email to: ' + action.email + ' with subject: ' + action.subject);
	_sendEmailNotificatio(action.email, action.subject);
	return True;
};

// EOF
