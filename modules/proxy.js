// ----------------------------------------------------
// Proxy with External Web Interface
// ----------------------------------------------------
var http = require('http'),
    net = require('net'),
    url = require('url'),
    config = require('../config/local.js'),
    logger = require('../modules/logger');

var srvHost = 'localhost';
var srvPort = 3001;

var connect = function(host, port) {
	srvHost = host;
	srvPort = port;
}

function mkget(url, next) {
	logger.debug(url);
	var headers = {};
	var options = { method: 'GET', path: url, port: srvPort, hostname: srvHost, headers: headers };
	logger.debug(options);
	var body = '';
	sock = http.get(options, function(res) {
		logger.debug('STATUS: ' + res.statusCode);
		res.on('data', function(chunk) {
			body += chunk;
		});
		res.on('end', function() {
			logger.debug(body);
			logger.debug('no more data');
			if (next) next(body);
		});
	});
	sock.on('error', function(e) {
		logger.error('problem with request: ' + e.message);
		if (next) next(false)
	});
};

function mkpost(url, data, next) {
	logger.debug(url);
	var headers = { 
		'Content-Type': 'application/json;charset=utf-8', 
		'Content-Length': Buffer.byteLength(data),
		'Accept': 'application/json, text/plain, */*'
	};

	var options = { 
		method: 'POST', 
		path: url, 
		port: srvPort, 
		hostname: srvHost, 
		headers: headers,
	};
	logger.debug(options);
	var body = '';
	sock = http.request(options, function(res) {
		logger.debug('STATUS: ' + res.statusCode);
		logger.debug(res.headers['set-cookie']);
		res.on('data', function(chunk) {
			body += chunk;
		});
		res.on('end', function() {
			logger.debug(body);
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
};

function mkput(url, data, next) {
	logger.debug(url);
	var headers = { 
		//'Content-Type': 'application/x-www-form-urlencoded', 
		'Content-Type': 'application/json;charset=utf-8', 
		'Content-Length': Buffer.byteLength(data),
		'Accept': 'application/json, text/plain, */*'
	};

	var options = { 
		method: 'PUT', 
		path: url, 
		port: srvPort, 
		hostname: srvHost, 
		headers: headers,
	};
	logger.debug(options);
	var body = '';
	sock = http.request(options, function(res) {
		logger.debug('STATUS: ' + res.statusCode);
		logger.debug(res.headers['set-cookie']);
		res.on('data', function(chunk) {
			body += chunk;
		});
		res.on('end', function() {
			logger.debug(body);
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
};

module.exports.connect = connect;
module.exports.mkget = mkget;
module.exports.mkpost = mkpost;
module.exports.mkput = mkput;

// EOF
