// ------------------------------------------------------------------------
// AUTOMATION Management
//
// TODO: add some security: for example both the zid+key must be provided
// TODO: use HMAC
// ------------------------------------------------------------------------
var express = require('express');
var router = express.Router();
var crpto = require('crypto');
var proxy = require('../modules/proxy');
var logger = require('../modules/logger');
var config = require('../config/local');
var domopi = require('../config/domopi');

var sharedSecret = domopi.getDomopiKey();

/*
 * require("crypto").createHmac("md5", "password")
 *   .update("If you love node so much why don't you marry it?")
 *     .digest("hex");
 *
 * pour le déchiffrage:
 *
 * sharedSecret = "super-secret";
 *
 *      // Get signature.
 *      retrievedSignature = req.headers["x-signature"];
 *      // Recalculate signature.
 *      parsedUrl = url.parse(req.url);
 *      computedSignature = crypto.createHmac("sha256", sharedSecret).update(parsedUrl.query).digest("hex");
 *      // Compare signatures.
 *      if (computedSignature === retrievedSignature) {
 *      	res.writeHead(200, {
 *      		"Content-Type": "text/plain"
 *              });
 *              res.end("Hello World\n");
 *      } else {
 *      	res.writeHead(403, {
 *             		"Content-Type": "text/plain"
 *              });
 *              res.end("Get Out\n");
 *      }
 */

/*
 * Dans le client:
 *  <script>
 *  var sharedSecret, query, signature, hmac, xhr;
 *  // No longer secret shared secret ;-)
 *  sharedSecret = "super-secret";
 *  query = "key=value";
 *  hmac = new sjcl.misc.hmac(sjcl.codec.utf8String.toBits(sharedSecret), sjcl.hash.sha256);
 *  signature = sjcl.codec.hex.fromBits(hmac.encrypt(query));
 *  xhr = new XMLHttpRequest();
 *  xhr.open("GET", "http://localhost:1337/?" + query);
 *  xhr.setRequestHeader("X-Signature", signature);
 *  xhr.onload = function () {
 *  	console.log(xhr.status, xhr.responseText);
 *  }
 *  xhr.send(null);
 *  </script>
 */

/**
 * GET a full listing of Automation RULES
 */
router.get('/rules', function(req, res, next) {
	var cfg = domopi.getDomopiConf();	// TODO: get RULES
	var rules = ('rules' in cfg) ? cfg.rules: {};
	res.json({ status: 'ok', rules: rules });
});

/**
 * GET a full Actions listing 
 */
router.get('/actions', function(req, res, next) {
	var cfg = domopi.getDomopiConf();	// TODO: get ACTIONS
	var actions = ('actions' in cfg) ? cfg.actions: {};
	res.json({ status: 'ok', actions: actions });
});

/**
 * POST a new ACTION
 */
router.post('', function(req, res, next) {
	logger.debug(req.body);
	res.json({ status: 'ok' });
});

/**
 * PUT an Action Description
 */
/*
router.put('/setdescr/:devid/:instid/:sid', function(req, res, next) {
	var devid = req.params.devid;
	var instid = req.params.instid;
	var sid = req.params.sid;
	var id = _buildZWaveDeviceName(devid, instid, sid);
	if (!req.body.title) {
		logger.error('setdescr: missing title');
		res.json({ status: 'ok' });
		return;
	}

	var cfg = domopi.getDomopiConf();
	if (!(id in cfg)) cfg[id] = {};
	cfg[id].title = req.body.title;
	domopi.setDomopiConf(cfg);
	res.json({ status: 'ok' });
});
*/

module.exports = router;

// EOF
