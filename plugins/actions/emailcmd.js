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
function _sendEmailNotification(email, subject, content) {
	logger.debug('_sendEmailNotification');

	// TODO: subject and content may contain macros
	// newstring = string.replace(/re/g, value)
	
	// Add a link to the remote web server at the end of the mail
	content += '\n\nhttp://adress_of_domopi_server/login';
	
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

module.exports.doAction = function(action) {
	logger.debug('should send an email to: ' + action.email + ' with subject: ' + action.subject);
	_sendEmailNotification(action.email, action.subject, action.content);
	return true;
};

// EOF
