var mongoose = require("mongoose");
var Device = require("../models/Device");
var moment = require('moment-timezone');
var url = require('url');
var express = require('express');
var request = require('request-promise');
var backup = require('mongodb-backup');
var router = express.Router();
var rand = require("generate-key");
var DeviceController = {};

DeviceController.create = function(req , res){
    var date = moment(new Date(Date.now())).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
    var name = req.body.name;
    if(name != null && name.trim() != ""){
        Device.findOne({name : req.body.name}).exec(function(err,result){
            if(err) console.log(err);
            else if(result != null){
                res.send('Device name already exists');
            }else{
                var schema = {
                    name : req.body.name,
                    key : rand.generateKey(10),
                    discription : req.body.discription,
                    date : date
                }
                var newDevice = new Device(schema);
                newDevice.save(function(err){
                    if(err) console.log(err);
                    else{
                        console.log("create device name "+req.body.name+" at "+date);
                        res.send('complete');
                    }
                });
            }
        })
        
    }else{
        res.send('Invalid device name');
    }
    
}
DeviceController.reg = function(req , res){
    res.render('regdevice');
}
DeviceController.devicelist = function(req , res){
    Device.find({}).exec(function(err,result){
        res.render('devicelist',{device : result});
    });
    
}
    

module.exports = DeviceController;