var express = require('express');
var AircraftController = require("../controllers/AircraftController.js");
var DeviceController = require("../controllers/DeviceController.js");
var Device = require("../models/Device");
var router = express.Router();
function authen(req, res, next){
  var auth = req.body.auth;
  if(auth != null && auth != ""){
    var key = auth.split('@')[0];
    var secret = auth.split('@')[1];
    Device.findOne({_id : secret , key : key}).exec(function(err,result){
      if(err) throw err;
      else if(result == null){
        var err = new Error('Invalid key or secret.');
        err.status = 401;
        return next(err);
      }else{
        return next();
      }
    })
  }else{
    var err = new Error('Invalid key or secret.');
    err.status = 401;
    return next(err);
  }
}
/* GET home page. */
router.get('/', function(req, res, next) {
  AircraftController.home(req,res);
});
router.get('/data/:node/:flight/:stime/:etime', function(req, res, next) {
  AircraftController.getdata(req,res);
  // res.send(req.query.node);
});
router.get('/view', function(req, res, next) {
  AircraftController.view(req,res);
  // res.send(req.query.node);
});
router.post('/putdata',authen, function(req, res, next) {
  AircraftController.putdata(req,res);
  
});
router.get('/holodata', function(req, res, next) {
  AircraftController.holodata(req,res);
  
});
router.post('/postholodata',authen, function(req, res, next) {
  AircraftController.postholodata(req,res);
});

router.get('/backup', function(req, res, next) {
  AircraftController.backup(req,res);
});
router.get('/regdevice', function(req, res, next) {
  DeviceController.reg(req,res);
});
router.get('/devicelist', function(req, res, next) {
  DeviceController.devicelist(req,res);
});
router.post('/create', function(req, res, next) {
  DeviceController.create(req,res);
});
router.get('/csvlist', function(req, res, next) {
  AircraftController.csv(req,res);
});
router.get('/download/:filename', function(req, res, next) {
  AircraftController.download(req,res);
});

module.exports = router;
