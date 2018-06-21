var express = require('express');
var AircraftController = require("../controllers/AircraftController.js");
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
router.get('/compare/:flight', function(req, res, next) {
  AircraftController.comparetime(req,res);
  // res.send(req.query.node);
});

module.exports = router;
