// --------------------------------------------------------------------------
// PROXY INTERFACE WITH Z-WAVE
// This is only a Web Service API - not HTML produced
//
// Set PORT environment variable to select the listening port (default: 3000)
// Set LEVEL to select the default logging level
// --------------------------------------------------------------------------
var express = require('express'),
    session = require('express-session'),
    path = require('path'),
    morgan = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    config = require('./config/local'),
    logger = require('./modules/logger'),
    proxy = require('./modules/proxy'),
    routes = require('./routes/index'),
    users = require('./routes/users'),
    sensors = require('./routes/sensors');

var app = express();

app.use(morgan('dev'));
//app.use(morgan('dev')({ "stream": logger.stream }));
app.use(session({
		//genid: function(req) {
		//	return genuuid() // use UUIDs for session IDs
		//},
		secret: 'rpiwsissecret',
		name: 'rpiws',
		resave: false,
		saveUninitialized: false
	})
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/*
app.use(expressWinston.logger({
      transports: [
        new winston.transports.Console({
          json: true,
          colorize: true
        })
      ],
      msg: "HTTP {{req.method}} {{req.url}}", // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}" 
      expressFormat: true, // Use the default Express/morgan request formatting, with the same colors. 
      colorStatus: true, // Color the status code, using the Express/morgan color palette (default green, 3XX cyan, 4XX yellow, 5XX red). Will not be recognized if expressFormat is true 
      ignoreRoute: function (req, res) { return false; } // optional: allows to skip some log messages based on request and/or response 
    }));
*/

app.use('/', routes);
app.use('/users', users);
app.use('/sensors', sensors);

/*
app.use(expressWinston.errorLogger({
	level: 'info',
	transports: [
		new winston.transports.Console({
			json: true,
			colorize: true
        	})
      	]
}));
*/

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Let's go, Marco !
proxy.connect(config.rpiWSSrv, config.rpiWSPort);

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  /*
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
  */
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;

// EOF
