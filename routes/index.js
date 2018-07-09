var express = require('express');
var AircraftController = require("../controllers/AircraftController.js");
var DeviceController = require("../controllers/DeviceController.js");
var router = express.Router();

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
router.post('/putdata', function(req, res, next) {
  AircraftController.putdata(req,res);
  
});
router.get('/holodata', function(req, res, next) {
  AircraftController.holodata(req,res);
  
});
router.post('/postholodata', function(req, res, next) {
  AircraftController.postholodata(req,res);
});
router.get('/compare/:flight', function(req, res, next) {
  AircraftController.comparetime(req,res);
  // res.send(req.query.node);
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

module.exports = router;
