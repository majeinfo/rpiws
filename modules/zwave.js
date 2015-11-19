// ----------------------------------------------------------
// ZWAVE Interface Utilities
// ----------------------------------------------------------
//
var config = require('../config/local'),
    logger = require('../modules/logger'),
    http = require('http');
 
/**
 * Do a GET Request to the internal interface
 **/
module.exports.doGet = function (url, next)
{
	var headers = {};
        var options = { method: 'GET', path: url, port: config.poll_srvPort, hostname: config.poll_srvHost, headers: headers };
        logger.debug(options);
        var body = '';
        sock = http.get(options, function(res) {
                logger.debug('STATUS: ' + res.statusCode);
                res.on('data', function(chunk) {
                        body += chunk;
                });
                res.on('end', function() {
                        logger.debug('no more data');
                        if (next) next(body);
                });
        });
        sock.on('error', function(e) {
                logger.error('problem with request: ' + e.message);
                if (next) next(false)
        });
}

/**
 * Do a PUT Request to the internal interface
 **/
module.exports.doPut = function(url, data, next)
{
	var headers = { 
		'Content-Type': 'application/json;charset=utf-8', 
		'Content-Length': Buffer.byteLength(data),
		'Accept': 'application/json, text/plain, */*'
	};
        var options = { 
		method: 'PUT', 
		path: url, 
		port: config.poll_srvPort, 
		hostname: config.poll_srvHost, 
		headers: headers 
	};
        logger.debug(options);
        var body = '';
        sock = http.request(options, function(res) {
                logger.debug('STATUS: ' + res.statusCode);
                res.on('data', function(chunk) {
                        body += chunk;
                });
                res.on('end', function() {
                        logger.debug('no more data');
                        if (next) next(body);
                });
        });
        sock.on('error', function(e) {
                logger.error('problem with request: ' + e.message);
                if (next) next(false)
        });
	sock.write(data); 
	sock.end(); 
}

/**
 * Build a device name from devid/instid/sid
 **/
module.exports.buildZWaveDeviceName = function (devid, instid, sid) {
	return "ZWayVDev_zway_" + devid + '-' + instid + '-' + sid;
}

// EOF
