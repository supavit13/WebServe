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
var sys = require('util');
var exec = require('child_process').exec;
function puts(err,stdout,stderr){console.log(stdout) }



mongoose.Promise = global.Promise;

new CronJob('59 59 01 * * *', function() {
  console.log('Backup time');
  var date = new Date();
  var day = date.getDate().toString();
  var month = (date.getMonth()+1).toString();
  var year = date.getFullYear().toString();
  if(day.length == 1) day = '0'+day;
  if(month.length == 1) month = '0'+month;
  var name = "backup"+day+month+year;
  exec("mongodump -d adsb -c aircrafts -o /home/adsb/domains/mongodump/",puts);
  exec("mongoexport --host localhost --db adsb --collection aircrafts --csv --out /home/adsb/domains/mongodump/csv/"+name+".csv --fields date,unixtime,hex,flight,lat,lon,altitude,speed,track,node_number",puts);
  console.log('mongo export csv & dump...');
  setTimeout(function(){
    exec("mongo adsb --eval 'db.aircrafts.drop()'",puts);
    exec("mongorestore -d adsb -c "+name+" /home/adsb/domains/mongodump/adsb/aircrafts.bson",puts);
    console.log('mongo drop & restore...');
  }, 5000); 
  
  setTimeout(function(){
    exec("rm -rf /home/adsb/domains/mongodump/adsb",puts);
    console.log('delete dump...');
  }, 65000); 

}, null, true, 'Asia/Bangkok');

// mongoose.connect('mongodb://pi:raspberry1@ds163680.mlab.com:63680/piaware').



mongoose.connect('mongodb://127.0.0.1:27017/adsb',{connectTimeoutMS : 1000 })
  .then(() =>  console.log('connection succesful'))
  .catch((err) => {
    mongoose.connect('mongodb://127.0.0.1:27017/adsb',{connectTimeoutMS : 1000 });
    console.error(err);
  });
var db = mongoose.connection;
db.on('disconnected',function(){
  //reconnitec on timeout
  mongoose.connect('mongodb://127.0.0.1:27017/adsb',{connectTimeoutMS : 1000 });
  db = mongoose.connection;
});

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({limit: '50mb' , extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api', apiRouter);
app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ limit: '50mb' , extended: true}))

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
