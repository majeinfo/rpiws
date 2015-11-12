// --------------------------------------------------------
// LOGGING MODULE
//
// LOGFILE environment variable can be set to select the logfile
// --------------------------------------------------------
//
var winston = require('winston');
winston.emitErrs = true;

var logger = new winston.Logger({
    transports: [
        new winston.transports.File({
            level: process.env.LEVEL || 'debug',
            filename: process.env.LOGFILE || '/tmp/rpiws.log',
            handleExceptions: true,
            json: true,
            maxsize: 5242880, //5MB
            maxFiles: 5,
            colorize: false
        }),
        new winston.transports.Console({
            level: process.env.LEVEL || 'debug',
            handleExceptions: true,
            json: false,
            colorize: true
        })
    ],
    exitOnError: false
});

module.exports = logger;
module.exports.stream = {
    write: function(message, encoding){
        logger.info(message);
    }
};

// EOF
