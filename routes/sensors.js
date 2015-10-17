// ------------------------------------------------------------
// SENSOR Management
//
// la requête suivante retourne les devices classés par type:
// GET /ZAutomation/api/v1/namespaces
//
// pour obtenir la liste des modules:
// GET /ZAutomation/api/v1/instances
//
// pour configurer un module:
// POST /ZAutomation/api/v1/instances
// ------------------------------------------------------------
var express = require('express');
var router = express.Router();
var proxy = require('../modules/proxy');

/**
 * Filter ZWave API from device description
 **/
// NOTE: il faut aussi remonter: location, metrics et tags
// 	 l'état des appareils est donné par 'metrics'

function _filterData(body) 
{
	var obj = JSON.parse(body);
	var devdata = obj.data.devices;
	var filtered = new Array();
	
	// DEBUG Dump
	console.log(body);
	console.log(obj.data);
	for (i in devdata) {
		console.log(devdata[i].deviceType);
	}

	for (i in devdata) {
		// TODO: faire des classes de devices
		if (devdata[i].deviceType != 'text') { 
			filtered.push({id: devdata[i].id, deviceType: devdata[i].deviceType, metrics: devdata[i].metrics })
		}
	}
	return filtered;
}

/**
 * GET sensor listing 
 */
router.get('/list', function(req, res, next) {
        proxy.mkget('/ZAutomation/api/v1/devices', function(body) {
        //proxy.mkget('/ZWaveAPI/Data/0', function(body) {    /// returns different and much more values
		if (!body) {
			res.json({ status: 'error' });
			return;
		}

                res.json({ status: 'ok', data: _filterData(body)});
        });
});

// NOTE: avant de faire un ON ou OFF, l'interface Web de ZWave envoie une requête pour
//       connaitre l'état courant (un /list avec une date en secondes). Le résultat ne contient que les dernières modifs.
//
/**
 * GET sensor delta listing 
 */
router.get('/deltalist', function(req, res, next) {
        proxy.mkget('/ZAutomation/api/v1/devices?since=' + Math.round(Date.now() / 1000), function(body) {
		if (!body) {
			res.json({ status: 'error' });
			return;
		}

                res.json({ status: 'ok', data: _filterData(body)});
        });
});

/**
 * Send a SENSOR Command ON or OFF 
 */ 
router.get('/command/:id/:command', function(req, res, next) {
	var id = req.params.id;
	var cmd = req.params.command;
	// avec ZWaveAPI, le device ID est le numéro 1,2,3...
	// avec ZAutomation, le device ID est son nom comme ZWayVDev_zway_2-0-37
        //proxy.mkget('/ZWaveAPI/Run/devices%5B' + id + '%5D.instances%5B0%5D.commandClasses%5B37%5D.Set(0)', function(body) {
        proxy.mkget('/ZAutomation/api/v1/devices/' + id + '/command/' + cmd, function(body) {
		if (!body) {
			res.json({ status: 'error' });
			return;
		}
		console.log(body);
		var obj = JSON.parse(body);

                res.json({ status: 'ok', data: obj});
        });
});

module.exports = router;

// EOF
