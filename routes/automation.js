// ------------------------------------------------------------------------
// AUTOMATION Management
//
// TODO: add some security: for example both the zid+key must be provided
// TODO: use HMAC
// ------------------------------------------------------------------------
var express = require('express'),
    crypto = require('crypto'),
    zwave = require('../modules/zwave'),
    logger = require('../modules/logger'),
    config = require('../config/local'),
    domopi = require('../config/domopi');
var router = express.Router();

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
	var rules = domopi.getAutomationRules();
	res.json({ status: 'ok', rules: rules });
});

/**
 * POST a full listing of Autmation RULES
 */
router.post('/setrules', function(req, res, next) {
        if (!req.body.rules) {
                logger.error('/setrules: missing Rules');
                res.json({ status: 'ok', msg: 'missing rules' });
                return;
        }
	domopi.setAutomationRules(req.body.rules);
        res.json({ status: 'ok' });
});

module.exports = router;

// EOF
