// ---------------------------------------------------------
// Provides URL to login & logout
// ---------------------------------------------------------
var express = require('express'),
    domopi = require('../config/domopi'),
    zwave = require('../modules/zwave'),
    logger = require('../modules/logger'),
    router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
	//res.send('respond with a resource');
	//docs = { status: 'ok', nom: 'Dupont', prenom: 'Jean' };
	var docs = { status: 'ok' };
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

/* GET User preference */
router.get('/settings', function(req, res, next) {
        var usercfg = domopi.getUserProfile(); 
        res.json({ status: 'ok', user: usercfg });
});

/* SET User preferences */
router.post('/settings', function(req, res, next) {
        if (!req.body.user) {
                logger.error('/settings: missing User Settings');
                res.json({ status: 'ok', msg: 'missing user settings' });
                return;
        }
	domopi.setUserProfile(req.body.user);
        res.json({ status: 'ok' });
});

module.exports = router;

// EOF
