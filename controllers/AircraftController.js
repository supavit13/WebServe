var mongoose = require("mongoose");
var Aircraft = require("../models/Aircraft");
var moment = require('moment-timezone');
var mqtt = require('mqtt');
var url = require('url');
var express = require('express');
var request = require('request-promise');
var router = express.Router();
var AircraftController = {};
var options = {
    port: 12829,
    host: "m11.cloudmqtt.com",
    username: "enotxhte",
    password: "rfB0sIYhc81n"
}
var client  = mqtt.connect('mqtt://m11.cloudmqtt.com',options);
client.on('connect', function () {
    client.subscribe('node1');
    client.subscribe('node2');
});
var massage = new Array(); 

function createAircraft(json,no){
    var date = moment(new Date(Date.now())).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
    json.flight = json.flight.split(" ")[0];
    var schema = {
        hex : json.hex,
        squawk : json.squawk,
        flight : json.flight,
        lat : json.lat,
        lon : json.lon,
        nucp : json.nucp,
        seen_pos : json.seen_pos,
        altitude : json.altitude,
        vert_rate : json.vert_rate,
        track : json.track,
        speed : json.speed,
        category : json.category,
        mlat : json.mlat,
        tisb : json.tisb,
        messages : json.messages,
        seen : json.seen,
        rssi : json.rssi,
        node_number : no,
        unixtime : json.unixtime,
        date : date
    };
    //filter
    Aircraft.findOne({flight : json.flight, lat : json.lat , lon : json.lon }).exec(function(err , result){
        if(err) console.log("Error:", err);
        else if(result == null ){
            var newAircraft = new Aircraft(schema);
            newAircraft.save(function (err){
                if(err) console.log("Error:", err);
                else console.log("insert aircraft successful at "+date);
            });  
        }else{
            // var resulttime = moment(result.date).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
            // var schematime = moment(schema.date).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
            // console.log(result);
            // console.log(json.lat);
            if(result.lat != schema.lat){
                var newAircraft = new Aircraft(schema);
                newAircraft.save(function (err){
                    if(err) console.log("Error:", err);
                    else console.log("insert aircraft successful at "+date);
                }); 
            }
        }
    });
}
client.on('message',function(topic,msg){
    // console.log(topic);
    var no = parseInt(topic.split('e')[1]);
    massage[no] = [];
    var json = JSON.parse(msg.toString());
    for(var i=0;i<json.length;i++){
        if(json[i]['flight']!=null && json[i]['lat']!=null){
            massage[no].push(json[i]);
            createAircraft(json[i],no);
        }
    }
});

AircraftController.readJSON = function(req , res){
    if(massage[req.params.id]==null){
        res.send("Invalid path");
    }
    res.send(massage[req.params.id]);
}

AircraftController.home = function(req,res){
    Aircraft.aggregate( [ { $group : { _id : "$node_number" } } ] ).exec(function(err,result){
        if(err) console.log("Error:", err);
        else {
            Aircraft.aggregate([{$group : {_id : {} , mindate : {$min : "$date"} }}]).exec(function(erro,date){
                date = moment(date[0].mindate).format("MM/DD/YYYY HH:mm");
                res.render('index', { title: 'ADS-BxIoT' , node_number : result.length , date : date});
            })
            
        }
    });
}
AircraftController.getdata = function(req,res){
    
    var qry = {};
    if(req.query.node != "all") qry.node_number = req.query.node;
    if(req.query.flight != "all") qry.flight = req.query.flight;
    if(req.query.stime != "all" && req.query.etime != "all") {
        var stime = moment(req.query.stime).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
        var etime = moment(req.query.etime).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
        qry.date = {$gte : stime, $lte : etime};
    }
    else if(req.query.stime != "all"){
        var stime = moment(req.query.stime).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
        qry.date = {$gte : stime};
    }else if(req.query.etime != "all"){
        var etime = moment(req.query.etime).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
        qry.date = {$lte : etime};
    }
    // console.log(qry);
    Aircraft.find(qry).exec(function(err,result){
        if(err) res.send(err);
        res.json(result);
    });
}
module.exports = AircraftController;