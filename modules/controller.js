// ---------------------------------------------------------
// Class for CONTROLLER
// ---------------------------------------------------------
//
var domopi = require('../config/domopi'),
    logger = require('../modules/logger'),
    zwave = require('../modules/zwave');

// Possible Controller Attributes
exports.parameters = [
	'description',
	'timezone',
	'email',
	'phonenumber',
	'location',	//address
	'lat',
	'lng'
];

// Set the global Controller Parameters
exports.setParms = function(options, next) {
        var cfg = domopi.getControllerConf();
	for (var o in options) {
		cf[o] = options[o];
	}
        domopi.setControllerConf(cfg);
	if (next) next();
}

// Set Controller Description only
exports.setDescription = function(newdescr, next) {
        var cfg = domopi.getControllerConf();
        cfg.description = newdescr;
        domopi.setControllerConf(cfg);
	if (next) next();
}

// EOF 
