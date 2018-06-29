var express = require('express');
var AircraftController = require("../controllers/AircraftController.js");
var router = express.Router();

router.get('/', function(req, res) {
    AircraftController.readJSON(req, res);
});
  
module.exports = router;