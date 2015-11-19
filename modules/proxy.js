// ----------------------------------------------------
// Proxy with Z-Wave APIs
// ----------------------------------------------------
var http = require('http'),
    net = require('net'),
    url = require('url'),
    config = require('../config/local.js'),
    logger = require('../modules/logger');

var srvHost = 'localhost';
var srvPort = 8083;
var sess_cookie = '';

var connect = function(host, port) {
	srvHost = host;
	srvPort = port;
}

function _mkget(url, next) {
	logger.debug(url);
	var headers = {};
	if (sess_cookie) { headers.Cookie = sess_cookie };
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

function _mkpost(url, data, next) {
	logger.debug(url);
	var headers = { 
		'Content-Type': 'application/json;charset=utf-8', 
		'Content-Length': Buffer.byteLength(data),
		'Accept': 'application/json, text/plain, */*'
	};

	if (sess_cookie) { headers.Cookie = sess_cookie };
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
		if (res.headers['set-cookie']) {
			var responseCookies = res.headers['set-cookie'];
        		for ( var i=0; i<responseCookies.length; i++) {
				var oneCookie = responseCookies[i];
				oneCookie = oneCookie.split(';');
				sess_cookie += oneCookie[0]+';';
			}
			logger.debug('got cookie ! ', sess_cookie);
		}
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

function _mkput(url, data, next) {
	logger.debug(url);
	var headers = { 
		//'Content-Type': 'application/x-www-form-urlencoded', 
		'Content-Type': 'application/json;charset=utf-8', 
		'Content-Length': Buffer.byteLength(data),
		'Accept': 'application/json, text/plain, */*'
	};

	if (sess_cookie) { headers.Cookie = sess_cookie };
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
		if (res.headers['set-cookie']) {
			var responseCookies = res.headers['set-cookie'];
        		for ( var i=0; i<responseCookies.length; i++) {
				var oneCookie = responseCookies[i];
				oneCookie = oneCookie.split(';');
				sess_cookie += oneCookie[0]+';';
			}
			logger.debug('got cookie ! ', sess_cookie);
		}
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

function loginAndGetCookie(method, url, data, next) {
	var auth_data = { login: config.proxy_username, password: config.proxy_password };
	//{"form":true,"login":"admin","password":"admin","keepme":false,"default_ui":1}
	_mkpost('/ZAutomation/api/v1/login', JSON.stringify(auth_data), function(body) {
		logger.debug('login result: ', body);
		if (method == 'POST') {
			_mkpost(url, data, next);
		}
		else if (method == 'PUT') {
			_mkput(url, data, next);
		}
		else {	// GET
			_mkget(url, next);
		}
	});
}

var mkput = function(url, data, next) {
	if (!sess_cookie) {
		loginAndGetCookie('PUT', url, data, next);
	}
	else {
		_mkput(url, data, next);
	}
};

var mkpost = function(url, data, next) {
	if (!sess_cookie) {
		loginAndGetCookie('POST', url, data, next);
	}
	else {
		_mkpost(url, data, next);
	}
};

var mkget = function(url, next) {
	if (!sess_cookie) {
		loginAndGetCookie('GET', url, false, next);
	}
	else {
		_mkget(url, next);
	}
};

module.exports.connect = connect;
module.exports.mkget = mkget;
module.exports._mkget = _mkget;
module.exports.mkpost = mkpost;
module.exports._mkpost = _mkpost;
module.exports.mkput = mkput;
module.exports._mkput = _mkput;

// EOF
