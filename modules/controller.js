// ---------------------------------------------------------
// Class for CONTROLLER
// ---------------------------------------------------------
//
var domopi = require('../config/domopi'),
    logger = require('../modules/logger'),
    zwave = require('../modules/zwave');

// Get Sensor current Metric
exports.setDescription = function(newdescr, next) {
        var cfg = domopi.getControllerConf();
        cfg.description = newdescr;
        domopi.setControllerConf(cfg);
	if (next) next();
}

// EOF 
