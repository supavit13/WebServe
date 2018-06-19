var express = require('express');
var AircraftController = require("../controllers/AircraftController.js");
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  AircraftController.home(req,res);
});
router.get('/data', function(req, res, next) {
  AircraftController.getdata(req,res);
  // res.send(req.query.node);
});

module.exports = router;
