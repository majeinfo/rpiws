// ---------------------------------------------------------
// Class for CONTROLLER
// ---------------------------------------------------------
//
var domopi = require('../config/domopi'),
    logger = require('../modules/logger'),
    zwave = require('../modules/zwave');

// Ctor
var Controller = function() {
}

// Get Sensor current Metric
Controller.prototype.setDescription = function(newdescr, next) {
        var cfg = domopi.getControllerConf();
        cfg.description = newdescr;
        domopi.setControllerConf(cfg);
	if (next) next();
}

module.exports.Controller = Controller;

// EOF 
