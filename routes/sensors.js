// ------------------------------------------------------------------------
// SENSOR Management
//
// TODO: add some security: for example both the zid+key must be provided
// TODO: write a 'Sensor" class with a load/save method
// ------------------------------------------------------------------------
var express = require('express'),
    zwave = require('../modules/zwave'),
    logger = require('../modules/logger'),
    zwave = require('../modules/zwave'),
    sensor = require('../modules/sensor'),
    config = require('../config/local'),
    domopi = require('../config/domopi');
var router = express.Router();

/**
 * GET sensor listing 
 */
router.get('/list', function(req, res, next) {
	zwave.getFullDeviceList(function(body) {
		if (!body) {
			res.json({ status: 'error' });
			return;
		}
                res.json({ status: 'ok', data: body});
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

	zwave.getFullDeviceList(function(body, since) {
		if (!body) {
			res.json({ status: 'error' });
			return;
		}
                res.json({ status: 'ok', data: body});
        });
});

/**
 * Send a SENSOR Command ON or OFF 
 */ 
router.get('/command/:devid/:instid/:sid/:command', function(req, res, next) {
	var devid = req.params.devid,
	    instid = req.params.instid,
	    sid = req.params.sid,
	    cmd = req.params.command;
	
	var sens = sensor.findSensor(devid, instid, sid);
	if (!sens) {
		logger.error('/command received bad values:' + devid + ' ' + instid + ' ' + sid);
		res.json({ status: 'error', msg: 'Sensor not found' });
		return;
	}
	sens.sendCommand(cmd, function(body) {
		if (!body) {
			res.json({ status: 'error' });
			return;
		}
		logger.debug(body);
		var obj = JSON.parse(body);

                res.json({ status: 'ok', data: obj});
        });
});

/**
 * POST a Sensor Description
 */
router.post('/setdescr/:devid/:instid/:sid', function(req, res, next) {
	var devid = req.params.devid,
	    instid = req.params.instid,
	    sid = req.params.sid;
	if (!req.body.title) {
		logger.error('/setdescr: missing title');
		res.json({ status: 'error', msg: 'Sensor not found' });
		return;
	}

 	// NO!!! Too dangerous: we cannot write a Sensor partially, all its chars must be written
 	/*
	var data = { id: id, title: req.body.title };
	zwave.mkput('/ZAutomation/api/v1/devices/' + id, JSON.stringify(data), function(body) {
		if (!body) {
			res.json({ status: 'error' });
			return;
		}
		logger.debug(body);
		var obj = JSON.parse(body);

                res.json({ status: 'ok', data: obj});
	});
	*/
	var sens = sensor.findSensor(devid, instid, sid);
	if (!sens) {
		logger.error('/setdescr received bad values:' + devid + ' ' + instid + ' ' + sid);
		res.json({ status: 'error', msg: 'Sensor not found' });
		return;
	}
	sens.setDescription(req.body.title, function() {
		res.json({ status: 'ok' });
	});
});

/**
 * Set a Sensor Visibility
 */
router.post('/setvisibility/:devid/:instid/:sid/:vis', function(req, res, next) {
	var devid = req.params.devid,
	    instid = req.params.instid,
	    sid = req.params.sid,
	    vis = req.params.vis;
	var sens = sensor.findSensor(devid, instid, sid);
	if (!sens) {
		logger.error('/setvisibility received bad values:' + devid + ' ' + instid + ' ' + sid);
		res.json({ status: 'error', msg: 'Sensor not found' });
		return;
	}
	sens.setHidden(vis, function() {
		res.json({ status: 'ok' });
	});
});

module.exports = router;

// EOF
