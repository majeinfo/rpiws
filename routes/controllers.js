// ------------------------------------------------------------------------
// CONTROLLER Management
//
// TODO: add some security: for example both the zid+key must be provided
// ------------------------------------------------------------------------
var express = require('express');
var router = express.Router();
var proxy = require('../modules/proxy');
var logger = require('../modules/logger');
var config = require('../config/local');
var domopi = require('../config/domopi');

/**
 * PUT a Controller Description
 */
router.put('/setdescr', function(req, res, next) {
	if (!req.body.description) {
		logger.error('setdescr: missing description');
		res.json({ status: 'ok' });
		return;
	}

	var cfg = domopi.getControllerConf();
	cfg.description = req.body.description;
	domopi.setControllerConf(cfg);
	res.json({ status: 'ok' });
});


module.exports = router;

// EOF
