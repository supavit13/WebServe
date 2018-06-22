var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var apiRouter = require('./routes/api');

var AircraftController = require("./controllers/AircraftController.js");

var mongoose = require('mongoose');

var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

var udp = require('dgram');
var UDPserver = udp.createSocket('udp4');

mongoose.Promise = global.Promise;

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

UDPserver.on('listening', function () {
  var address = UDPserver.address();
  console.log('UDP Server listening on ' + address.address + ":" + address.port);
});

var msg = "";
UDPserver.on('message', function (message, remote) {
  if (message != null) {
      // console.log("massage is " + message + " from " + remote);
      msg = message;
      var json = JSON.parse(msg.toString('utf8'));
      if(json.flight != null){
        AircraftController.adsbData(json);
      }
      
  }
});

// UDPserver.bind(process.argv[2].split(':')[0],parseInt(process.argv[2].split(':')[1]));
UDPserver.bind(6000);

module.exports = app;
