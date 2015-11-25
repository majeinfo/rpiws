// ------------------------------------------------------------------------
// CONTROLLER Management
//
// TODO: add some security: for example both the zid+key must be provided
// ------------------------------------------------------------------------
var express = require('express'),
    config = require('../config/local'),
    domopi = require('../config/domopi'),
    logger = require('../modules/logger'),
    controller = require('../modules/controller'),
    router = express.Router();

/**
 * Receive a PING and sends back our Version
 */
router.get('/ping', function(req, res, next) {
	var version = domopi.getDomopiVersion();
	res.json({ status: 'ok', doVersion: version });
});

/**
 * TODO: Check that Client known our secret Key
 */
router.get('/attach', function(req, res, next) {
});

/**
 * PUT a Controller Description
 */
router.put('/setdescr', function(req, res, next) {
	if (!req.body.description) {
		logger.error('/setdescr: missing description');
		res.json({ status: 'ok', msg: 'missing description' });
		return;
	}
	controller.setDescription(req.body.description);
	res.json({ status: 'ok' });
});

module.exports = router;

// EOF
