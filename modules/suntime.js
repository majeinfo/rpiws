// ---------------------------------------------
// Handle Sunset and Sunrise Time
// ---------------------------------------------
//
var domopi = require('../config/domopi'),
    logger = require('../modules/logger);

function getSunTime() {
	// TODO: lecontroller doit possèder une lat+lng
	// Ces infos sont obtenues à partir de l'adresse indiquée par l'utilisateur
	//
	var cfg = domopi.getControllerConf();
	if (!cfg.lat || !cfg.lng) {
		logger.info('Controller has not lat/lng associated');
		return;
	}
	"http://api.sunrise-sunset.org/json?lat=36.7201600&lng=-4.4203400";
}

// EOF 
