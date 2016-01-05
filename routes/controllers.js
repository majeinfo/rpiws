// ------------------------------------------------------------------------
// CONTROLLER Management
//
// TODO: add some security: for example both the zid+key must be provided
// ------------------------------------------------------------------------
var express = require('express'),
    config = require('../config/local'),
    domopi = require('../config/domopi'),
    zwave = require('../modules/zwave'),
    sensor = require('../modules/sensor'),
    logger = require('../modules/logger'),
    controller = require('../modules/controller'),
    router = express.Router();

/**
 * Receive a PING and sends back our Version
 * The "ID" is used to avoid cache perturbation
 */
router.get('/ping/:id', function(req, res, next) {
	var version = domopi.getDomopiVersion();
	res.json({ status: 'ok', doVersion: version });
});

/**
 * TODO: Check that Client known our secret Key
 */
router.get('/attach', function(req, res, next) {
	res.json({ status: 'ok' });
});

/**
 * Starts Association Discovery
 */
var _lastPollTime = 0;
var _inclusionTimer = null;
var _foundDevices = [];
var _oldDevices = [];

function _checkForNewDevice(data) {
        logger.debug('_checkForNewDevice');
        if (!data) return;   
        for (var i in data) {
        	var sens = sensor.findSensor(data[i].devid, data[i].instid, data[i].sid);
		if (!sens) {
			logger.info('New Device detected : ' + data[i].devid + ' ' + data[i].instid + ' ' + data[i].sid);
			sens = sensor.updateSensors(data[i].devid, data[i].instid, data[i].sid, data);
			_foundDevices.push(sens);
		}
        }
}

function _checkForOldDevice(data) {
        logger.debug('_checkForOldDevice');
        if (!data) return;   
	// Loopon known Sensor to check for disassociated ones
	var sensors = sensor.getSensors();
	for (var s in sensors) {
		var sens = sensors[s];
		var found = false;
        	for (var i in data) {
			if (sens.devid == data[i].devid) {
				found = true;
				break;
			}
		}
		// TODO: Sensors are not really destroyed
		if (!found) {
			logger.info('Old Device detected : ' + sens.devid + ' ' + sens.instid + ' ' + sens.sid);
			_foundDevices.push(sens);
		}
	}
}

function _getDeltaDeviceList(next)
{
        zwave.getDeltaDeviceList(_lastPollTime.toString(), next);
        _lastPollTime = Math.floor(Date.now() / 1000);
}

router.get('/discovery/:cmd', function(req, res, next) {
	if (req.params.cmd == 'start') {
		// Only one at a time
		if (_inclusionTimer) { 
			res.json({ status: 'ok', message: 'already in progress' }); 
			return; 
		}
		_lastPollTime = 0;
		_inclusionTimer = null;
		_foundDevices = [];
		zwave.startInclusion(function(body) {
			res.json({ status: 'ok', data: body});
			_inclusionTimer = setInterval(function() { _getDeltaDeviceList(_checkForNewDevice) }, 1500);	// every 1.5s call
		});
		return;
	}
	if (req.params.cmd == 'stop') {
		if (!_inclusionTimer) {
			res.json({ status: 'ok', message: 'no association in progress !' });
			return;
		}
		if (_inclusionTimer) clearInterval(_inclusionTimer);
		_inclusionTimer = null;

		zwave.stopInclusion(function(body) {
			res.json({ status: 'ok', data: body});
		});
		return;
	}
	if (req.params.cmd == 'getnew') {
		// Must return new found devices, with their capabilities
		res.json({ status: 'ok', data: _foundDevices });
		return;
	}

	res.json({ status: 'error', message: 'invalid parameter' });
});

/**
 * Start Device Exclusion
 *
 * JSON returned by /ZWaveAPI/Data includes :
 * "controller.data.controllerState": {
 *     "value": 0,
 *     "type": "int",
 *     "invalidateTime": 1452017844,
 *     "updateTime": 1452020351
 * },
 * "controller.data.lastExcludedDevice": {
 *     "value": 8,
 *     "type": "int",
 *     "invalidateTime": 1452017844,
 *     "updateTime": 1452020351
 * }
 */
var _exclusionTimer = null;

router.get('/exclusion/:cmd', function(req, res, next) {
	if (req.params.cmd == 'start') {
		// Only one at a time
		if (_exclusionTimer) { 
			res.json({ status: 'ok', message: 'already in progress' }); 
			return; 
		}
		_lastPollTime = 0;
		_exclusionTimer = null;
		_oldDevices = [];
		zwave.startExclusion(function(body) {
			res.json({ status: 'ok', data: body});
			//_exclusionTimer = setInterval(function() { _getDeltaDeviceList(_checkForOldDevice) }, 1500);	// every 1.5s call
		});
		return;
	}
	if (req.params.cmd == 'stop') {
		if (!_exclusionTimer) {
			res.json({ status: 'ok', message: 'no exclusion in progress !' });
			return;
		}
		if (_exclusionTimer) clearInterval(_exclusionTimer);
		_exclusionTimer = null;

		zwave.stopExclusion(function(body) {
			zwave.getFullDeviceList(_checkForOldDevice);
			res.json({ status: 'ok', data: body});
		});
		return;
	}
	if (req.params.cmd == 'getold') {
		// Must return new found devices, with their capabilities
		res.json({ status: 'ok', data: _oldDevices });
		return;
	}

	res.json({ status: 'error', message: 'invalid parameter' });
});

/**
 * Send the Circular Log back
 */
router.get('/logs', function(req, res, next) {
	var cbuf = logger.circularBuffer.toarray();
	console.log(cbuf);
	res.json({ status: 'ok' });
});

/**
 * PUT a Controller Description
 */
router.put('/setdescr', function(req, res, next) {
	if (!req.body.description) {
		logger.error('/setdescr: missing description');
		res.json({ status: 'ok', msg: 'missing description' });
		return;
	}
	controller.setDescription(req.body.description);
	res.json({ status: 'ok' });
});

module.exports = router;

// EOF
