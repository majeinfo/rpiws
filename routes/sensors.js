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
var config = require('../config/local.js');
var sensorCfg = require('../config/sensors_conf');

/**
 * Build a device name from devid/instid/sid
 **/
function _buildZWaveDeviceName(devid, instid, sid) {
	return "ZWayVDev_zway_" + devid + '-' + instid + '-' + sid;
}

/**
 * Filter ZWave API from device description
 * Must overload some attributes with our configuration
 **/
function _filterData(body) 
{
	var obj = JSON.parse(body);
	var filtered = new Array();
	if (!obj.data) return filtered;
	var devdata = obj.data.devices;
	var conf = sensorCfg.getSensorsConf();
	
	// DEBUG Dump
	/*
 	console.log(body);
	console.log(obj.data);
	for (i in devdata) {
		console.log(devdata[i].deviceType);
	}
	*/

	for (i in devdata) {
		if (devdata[i].deviceType != 'text') { 
			var id = devdata[i].id;
			var metrics = devdata[i].metrics;
			if (id in conf) {
				//Attribute overloading
				if ('title' in conf[id]) {
					metrics['title'] = conf[id].title;
				}
			}
			// The "id" value returned looks like ZWayVDev_zway_2-0-37-abc
			// "2" is the Device ID in the ZWave network
			// "0" is the instance ID in the Device
			// "37-abc..." is the Sensor ID
			//filtered.push({id: id, deviceType: devdata[i].deviceType, metrics: metrics })
			console.log('id:', id);
			var idx = id.lastIndexOf('_'); if (idx == -1) continue;
			var fulldev = id.substr(idx+1);
			var parts = fulldev.split('-');
			var devid = parts[0];
			var instid = parts[1]; if (instid === undefined) continue;
			var sid = parts.slice(2).join('-'); if (sid === undefined) continue;
			console.log(devid, instid, sid);
			filtered.push({ devid: devid, instid: instid, sid: sid, deviceType: devdata[i].deviceType, metrics: metrics });
		}
	}
	console.log(filtered);
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
	if (!req.query || !req.query.since)
		since = Math.floor((Date.now() / 1000) - config.poll_interval).toString();
	else
		since = req.query.since;

        proxy.mkget('/ZAutomation/api/v1/devices?since=' + since, function(body) {
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
router.get('/command/:devid/:instid/:sid/:command', function(req, res, next) {
	var devid = req.params.devid;
	var instid = req.params.instid;
	var sid = req.params.sid;
	var cmd = req.params.command;
	var id = _buildZWaveDeviceName(devid, instid, sid);
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

/**
 * PUT a Sensor Description
 */
router.put('/setdescr/:devid/:instid/:sid', function(req, res, next) {
	var devid = req.params.devid;
	var instid = req.params.instid;
	var sid = req.params.sid;
	var id = _buildZWaveDeviceName(devid, instid, sid);
	if (!req.body.title) {
		console.error('setdescr: missing title');
		res.json({ status: 'ok' });
		return;
	}

 	// NO!!! Too dangerous: we cannot write a Sensor partially, al its chars must be written
 	/*
	var data = { id: id, title: req.body.title };
	proxy.mkput('/ZAutomation/api/v1/devices/' + id, JSON.stringify(data), function(body) {
		if (!body) {
			res.json({ status: 'error' });
			return;
		}
		console.log(body);
		var obj = JSON.parse(body);

                res.json({ status: 'ok', data: obj});
	});
	*/
	var cfg = sensorCfg.getSensorsConf();
	if (!(id in cfg)) cfg[id] = {};
	cfg[id].title = req.body.title;
	sensorCfg.setSensorsConf(cfg);
	res.json({ status: 'ok' });
});


module.exports = router;

// EOF
