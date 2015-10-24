var express = require('express');
var router = express.Router();

/**
 * GET home page. 
 */
router.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});

/*
 * Get IP Addresses 
 */
router.get('/getip', function(req, res, next) {
	res.json({ status: 'ok', ipaddr: [ '192.168.0.77' ] });
});

module.exports = router;
