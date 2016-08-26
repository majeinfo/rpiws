// ---------------------------------------------
// Handle Sunset and Sunrise Time
// ---------------------------------------------
//
var domopi = require('../config/domopi'),
    logger = require('../modules/logger'),
    http = require('http');

var nextSunSet = null;
var nextSunRise = null;
var lastUpdate = null;

function getSunTime() {
	logger.info('Try to get Sun Time');
	var curtime = (new Date()).getTime();
	logger.debug(lastUpdate, nextSunSet, curtime);
	if (lastUpdate && nextSunSet) {
		if (((curtime - lastUpdate) / 1000) < 60*60*23) {
			logger.debug('too early');
			return;
		}
	}

	var cfg = domopi.getUserProfile();
	if (!cfg.lat || !cfg.lng) {
		logger.info('Controller has not lat/lng associated');
		return;
	}

	// TODO: should be externalized
	var url = "http://api.sunrise-sunset.org/json?lat=" + cfg.lat + "&lng=" + cfg.lng;
	var body = '';
        sock = http.get(url, function(res) {
                logger.debug('STATUS: ' + res.statusCode);
                res.on('data', function(chunk) {
                        body += chunk;
                });
                res.on('end', function() {
                        logger.debug(body);
                        logger.debug('no more data');
			var obj = JSON.parse(body);
			if ('results' in obj) {
				if ('sunrise' in obj.results && 'sunset' in obj.results) {
					// Hours are in UTC
					nextSunRise = obj.results['sunrise'];
					nextSunSet = obj.results['sunset'];
					lastUpdate = curtime;
					logger.info('Next sunrise value=', nextSunRise)
					logger.info('Next sunset value=', nextSunSet)
				}
			}
                });
        });
        sock.on('error', function(e) {
                logger.error('problem with request: ' + e.message);
                if (next) next(false)
        });
}

// Check for sunset & sunrise time at least once a day
getSunTime();
setInterval(getSunTime, 60*60*12*1000);// Every 12 hours
//setInterval(getSunTime, 60*60*1000);	// Every hour
//setInterval(getSunTime, 10 * 1000);	// Every ten seconds

exports.getSunRise = function() { return nextSunRise; }
exports.getSunSet = function() { return nextSunSet; }

// To make test easier
exports.setSunRise = function(t) { nextSunRise = t; }
exports.setSunSet = function(t) { nextSunSet = t; }

// EOF 
