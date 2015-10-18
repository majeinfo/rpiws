// ----------------------------------------------------
// Proxy with Z-Wave APIs
// ----------------------------------------------------
var http = require('http');
var net = require('net');
var url = require('url');
var config = require('../config/local.js');
var srvHost = 'localhost';
var srvPort = 8083;
var sess_cookie = '';

var connect = function(host, port) {
	srvHost = host;
	srvPort = port;
}

function _mkget(url, next) {
	console.log(url);
	var headers = {};
	if (sess_cookie) { headers.Cookie = sess_cookie };
	var options = { method: 'GET', path: url, port: srvPort, hostname: srvHost, headers: headers };
	console.log(options);
	var body = '';
	sock = http.get(options, function(res) {
		console.log('STATUS: ' + res.statusCode);
		res.on('data', function(chunk) {
			body += chunk;
		});
		res.on('end', function() {
			console.log('no more data');
			if (next) next(body);
		});
	});
	sock.on('error', function(e) {
		console.log('problem with request: ' + e.message);
		if (next) next(false)
	});
};

function _mkpost(url, data, next) {
	console.log(url);
	var headers = { 
		//'Content-Type': 'application/x-www-form-urlencoded', 
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
	console.log(options);
	var body = '';
	sock = http.request(options, function(res) {
		console.log('STATUS: ' + res.statusCode);
		console.log(res.headers['set-cookie']);
		if (res.headers['set-cookie']) {
			var responseCookies = res.headers['set-cookie'];
        		for ( var i=0; i<responseCookies.length; i++) {
				var oneCookie = responseCookies[i];
				oneCookie = oneCookie.split(';');
				sess_cookie += oneCookie[0]+';';
			}
			console.log('got cookie ! ', sess_cookie);
		}
		res.on('data', function(chunk) {
			body += chunk;
		});
		res.on('end', function() {
			console.log('no more data');
			if (next) next(body);
		});
	});
	sock.on('error', function(e) {
		console.log('problem with request: ' + e.message);
		if (next) next(false)
	});
	sock.write(data); 
	sock.end(); 
};

function loginAndGetCookie(method, url, data, next) {
	var auth_data = { login: config.proxy_username, password: config.proxy_password };
	//{"form":true,"login":"admin","password":"admin","keepme":false,"default_ui":1}
	_mkpost('/ZAutomation/api/v1/login', JSON.stringify(auth_data), function(body) {
		console.log('login result: ', body);
		if (method == 'POST') {
			_mkpost(url, data, next);
		}
		else {
			_mkget(url, next);
		}
	});
}

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

// EOF
