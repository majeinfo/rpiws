var express = require('express');
var router = express.Router();
var proxy = require('../modules/proxy');

/* GET users listing. */
router.get('/', function(req, res, next) {
	//res.send('respond with a resource');
	docs = { status: 'ok', nom: 'Dupont', prenom: 'Jean' };
	res.json(docs);
});

/* GET login */
router.get('/login', function(req, res, next) {
	proxy.mkget('/ZAutomation/api/v1/devices', function(body) {
		console.log(body);
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
