// ----------------------------------------------------
// Proxy with Z-Wave APIs
// ----------------------------------------------------
var http = require('http'),
    net = require('net'),
    url = require('url'),
    config = require('../config/local.js'),
    domopi = require('../config/domopi'),
    logger = require('../modules/logger');

var srvHost = 'localhost';
var srvPort = 8083;
var sess_cookie = '';

/**
 * Build a device name from devid/instid/sid
 */
function _buildZWaveDeviceName(devid, instid, sid) {
    return "ZWayVDev_zway_" + devid + '-' + instid + '-' + sid;
}

/**
 * Set the Location of Zwave Web Server
 */
module.exports.connect = function(host, port) {
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
		if (!body) return; // Error sent back
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

module.exports.mkput = function(url, data, next) {
	if (!sess_cookie) {
		loginAndGetCookie('PUT', url, data, next);
	}
	else {
		_mkput(url, data, next);
	}
};

module.exports.mkpost = function(url, data, next) {
	if (!sess_cookie) {
		loginAndGetCookie('POST', url, data, next);
	}
	else {
		_mkpost(url, data, next);
	}
};

function mkget(url, next) {
	if (!sess_cookie) {
		loginAndGetCookie('GET', url, false, next);
	}
	else {
		_mkget(url, next);
	}
};
module.exports.mkget = mkget;

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

        // DEBUG Dump
        //logger.debug(body);
        logger.debug(obj.data);
        for (i in devdata) {
                logger.debug(devdata[i].deviceType);
        }

        for (i in devdata) {
                if (devdata[i].deviceType == 'text') continue;

		var id = devdata[i].id;
		var metrics = devdata[i].metrics;
		// The "id" value returned looks like ZWayVDev_zway_2-0-37-abc
		// "2" is the Device ID in the ZWave network
		// "0" is the instance ID in the Device
		// "37-abc..." is the Sensor ID
		//filtered.push({id: id, deviceType: devdata[i].deviceType, metrics: metrics })
		logger.debug('id:', id);
		var idx = id.lastIndexOf('_'); if (idx == -1) continue;
		var fulldev = id.substr(idx+1);
		var parts = fulldev.split('-');
		var devid = parts[0];
		var instid = parts[1]; if (instid === undefined) continue;
		// Test on sid == "0" eliminates disassociated devices with a single buttonControl and nothing else
		var sid = parts.slice(2).join('-'); if (sid === undefined || sid == "0") continue;
		logger.debug(devid, instid, sid);

		var cfg = domopi.getSensorConf(devid, instid, sid);
		//Attribute overloading
		if ('title' in cfg) {
			metrics['title'] = cfg.title;
		}
		if ('is_hidden' in cfg) {
			metrics['is_hidden'] = cfg.is_hidden;
		}

		var doc = { devid: devid, instid: instid, sid: sid, deviceType: devdata[i].deviceType, metrics: metrics };
                doc.is_level_number = (metrics.level != 'on' && metrics.level != 'off');
                doc.level = (doc.is_level_number) ? metrics.level : 0;
                doc.on_off = (metrics.level == 'on');
                doc.change = metrics.change;
		filtered.push(doc);
        }

        logger.debug(filtered);
        return filtered;
}

module.exports.startInclusion = function(next) {
        mkget('/ZWaveAPI/Run/controller.AddNodeToNetwork(1)', function(body) {
        	if (next) next(body);
	});
}

module.exports.stopInclusion = function(next) {
        mkget('/ZWaveAPI/Run/controller.AddNodeToNetwork(0)', function(body) {
        	if (next) next(body);
	});
}

module.exports.startExclusion = function(next) {
        mkget('/ZWaveAPI/Run/controller.RemoveNodeFromNetwork(1)', function(body) {
        	if (next) next(body);
	});
}

module.exports.stopExclusion = function(next) {
        mkget('/ZWaveAPI/Run/controller.RemoveNodeFromNetwork(0)', function(body) {
        	if (next) next(body);
	});
}

module.exports.getFullDeviceList = function(next) {
        mkget('/ZAutomation/api/v1/devices', function(body) {
        //mkget('/ZWaveAPI/Data/0', function(body) {    /// returns different and much more values
		if (body) body = _filterData(body);
        	if (next) next(body);
	});
}
        
module.exports.getDeltaDeviceList = function(since, next) {
        mkget('/ZAutomation/api/v1/devices?since=' + since, function(body) {
		if (body) body = _filterData(body);
        	if (next) next(body);
	});
}

module.exports.sendCommand = function(devid, instid, sid, cmd, next) {
        var id = _buildZWaveDeviceName(devid, instid, sid);
        // with ZWaveAPI, device ID is number 1,2,3...
        // with ZAutomation, device ID is name like ZWayVDev_zway_2-0-37
        //mkget('/ZWaveAPI/Run/devices%5B' + id + '%5D.instances%5B0%5D.commandClasses%5B37%5D.Set(0)', function(body) {
        mkget('/ZAutomation/api/v1/devices/' + id + '/command/' + cmd, function(body) {
		if (next) next(body);
        });

}

// EOF
