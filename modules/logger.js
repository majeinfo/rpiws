// --------------------------------------------------------
// LOGGING MODULE
//
// LOGFILE environment variable can be set to select the logfile
// --------------------------------------------------------
//
var util = require('util'),
    winston = require('winston'),
    CircularBuffer = require('circular-buffer');
winston.emitErrs = true;

var circularBuffer = new CircularBuffer(500);

var CustomLogger = winston.transports.CustomLogger = function(options) {
	this.name = 'cbufferLogger';
	this.level = options.level || 'info';
	this.buffer = circularBuffer;
};

util.inherits(CustomLogger, winston.Transport);
CustomLogger.prototype.log = function (level, msg, meta, callback) {
	this.buffer.enq({ date: Date.now(), level: level, msg: msg });
	callback(null, true);
};

var logger = new winston.Logger({
    transports: [
	/*
        new winston.transports.File({
            level: process.env.LEVEL || 'debug',
            filename: process.env.LOGFILE || '/tmp/rpiws.log',
            handleExceptions: true,
            json: true,
            maxsize: 5242880, //5MB
            maxFiles: 5,
            colorize: false
        }),
	*/
        new winston.transports.Console({
            level: process.env.LEVEL || 'debug',
            handleExceptions: true,
            json: false,
            colorize: true
        }),
	new CustomLogger({
	})
    ],
    exitOnError: false
});

logger.circularBuffer = circularBuffer;
module.exports = logger;
module.exports.stream = {
    write: function(message, encoding){
        logger.info(message);
    }
};

// EOF
