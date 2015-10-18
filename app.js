var express = require('express'),
    session = require('express-session'),
    path = require('path'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    config = require('./config/local'),
    proxy = require('./modules/proxy');

// Ajouter la notion de plugins chargés dynamiquement
// 
// GET
// /system => conf du système
// /system/test
// /system/plugin_list
// /system/logs
// /system/alarms
// /sensor/list
// /sensor/<sensor_name> => conf du sensor
// /sensor/<sensor_name>/logs
// /sensor/<sensor_name>/alarms
//
// POST
// /plugins/output/<plugin_name>/enable
// /plugins/output/<plugin_name>/disable
//
// PUT
//
// DELETE
//
//
// TODO: le module de log et d'affichage doit pouvoir être modifié

var routes = require('./routes/index');
var users = require('./routes/users');
var sensors = require('./routes/sensors');

var app = express();

// view engine setup
//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');

app.use(logger('dev'));
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

app.use('/', routes);
app.use('/users', users);
app.use('/sensors', sensors);

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
/*
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
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
*/

module.exports = app;
