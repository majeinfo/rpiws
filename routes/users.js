// ---------------------------------------------------------
// Provides URL to login & logout
// ---------------------------------------------------------
var express = require('express'),
    zwave = require('../modules/zwave'),
    logger = require('../modules/logger'),
    router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
	//res.send('respond with a resource');
	docs = { status: 'ok', nom: 'Dupont', prenom: 'Jean' };
	res.json(docs);
});

/* GET login */
router.get('/login', function(req, res, next) {
	zwave.mkget('/ZAutomation/api/v1/devices', function(body) {
		logger.debug(body);
		sess = req.session;
		sess.login = 1;
		res.json({status: 'ok'});
	});
});

/* GET logout */
router.get('/logout', function(req, res, next) {
	sess = req.session;
	sess.destroy(function(err) { res.json({}); });
	res.json({ status: 'ok' });
});

module.exports = router;

// EOF
