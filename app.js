var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var moment = require('moment-timezone');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var apiRouter = require('./routes/api');

var AircraftController = require("./controllers/AircraftController.js");

var mongoose = require('mongoose');

var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var request = require('request-promise');
var bodyParser = require('body-parser');
var CronJob = require('cron').CronJob;


mongoose.Promise = global.Promise;

new CronJob('00 20 13 * * *', function() {
  console.log('You will see this message every day');
  request.get('http://127.0.0.1:8080/backup');
}, null, true, 'Asia/Bangkok');

// mongoose.connect('mongodb://pi:raspberry1@ds163680.mlab.com:63680/piaware')
mongoose.connect('mongodb://127.0.0.1:27017/adsb')
  .then(() =>  console.log('connection succesful'))
  .catch((err) => console.error(err));
  var db = mongoose.connection;

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api', apiRouter);
app.use(bodyParser.json({ limit: '30mb' }))

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// UDPserver.bind(process.argv[2].split(':')[0],parseInt(process.argv[2].split(':')[1]));


module.exports = app;
