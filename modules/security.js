// ----------------------------------------------
// Check that Client knowns the Controller Key
// ----------------------------------------------
//
var crypto = require("crypto"),
    domopi = require("../config/domopi");

var secret_key = domopi.getDomopiKey();

//console.log(crypto.createHmac("md5", "password").update("If you love node so much why don't you marry it?").digest("hex"));

function decodeRequest(req) {
	var retrievedSignature = req.headers['x-signature'];
	var parsedUrl = url.parse(req.url);
	var computedSignature = crypto.createHmac('sha256', secret_key).update(parsedUrl.query).digest('hex');
	return computedSignature === retrievedSignature;
}

/*
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
*              res.writeHead(200, {
*                      "Content-Type": "text/plain"
*              });
*              res.end("Hello World\n");
*      } else {
*              res.writeHead(403, {
*                      "Content-Type": "text/plain"
*              });
*              res.end("Get Out\n");
*      }
*/

// EOF
