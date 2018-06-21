var mongoose = require("mongoose");
var Aircraft = require("../models/Aircraft");
var Node1 = require("../models/Node1");
var Node2 = require("../models/Node2");
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
var client = mqtt.connect('mqtt://m11.cloudmqtt.com', options);
client.on('connect', function () {
    client.subscribe('node1');
    client.subscribe('node2');
});
var massage = new Array();

function createAircraft(json, no) {
    var date = moment(new Date(Date.now())).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
    json.flight = json.flight.split(" ")[0];
    var schema = {
        hex: json.hex,
        squawk: json.squawk,
        flight: json.flight,
        lat: json.lat,
        lon: json.lon,
        nucp: json.nucp,
        seen_pos: json.seen_pos,
        altitude: json.altitude,
        vert_rate: json.vert_rate,
        track: json.track,
        speed: json.speed,
        category: json.category,
        mlat: json.mlat,
        tisb: json.tisb,
        messages: json.messages,
        seen: json.seen,
        rssi: json.rssi,
        node_number: no,
        unixtime: json.unixtime,
        date: date
    };
    //filter
    if(no == 1){
        Node1.findOne({ flight: json.flight, lat: json.lat, lon: json.lon }).exec(function (err, result) {
            if (err) console.log("Error:", err);
            else if (result == null) {
                var newNode1 = new Node1(schema);
                newNode1.save(function (err) {
                    if (err) console.log("Error:", err);
                    else console.log("insert Node1 successful at " + date);
                });
            } else {
                if (result.lat != schema.lat) {
                    var newNode1 = new Node1(schema);
                    newNode1.save(function (err) {
                        if (err) console.log("Error:", err);
                        else console.log("insert Node1 successful at " + date);
                    });
    
                }
            }
        });
    }
    if(no == 2){
        Node2.findOne({ flight: json.flight, lat: json.lat, lon: json.lon }).exec(function (err, result) {
            if (err) console.log("Error:", err);
            else if (result == null) {
                var newNode2 = new Node2(schema);
                newNode2.save(function (err) {
                    if (err) console.log("Error:", err);
                    else console.log("insert Node2 successful at " + date);
                });
            } else {
                if (result.lat != schema.lat) {
                    var newNode2 = new Node2(schema);
                    newNode2.save(function (err) {
                        if (err) console.log("Error:", err);
                        else console.log("insert Node2 successful at " + date);
                    });
    
                }
            }
        });
    }
    
    Aircraft.findOne({ flight: json.flight, lat: json.lat, lon: json.lon }).exec(function (err, result) {
        if (err) console.log("Error:", err);
        else if (result == null) {
            var newAircraft = new Aircraft(schema);
            newAircraft.save(function (err) {
                if (err) console.log("Error:", err);
                else console.log("insert aircraft successful at " + date);
            });
            // var newNode1 = new Node1(schema);
            // newNode1.save(function (err){
            //     if(err) console.log("Error:", err);
            //     else console.log("insert Node1 successful at "+date);
            // }); 
            // var newNode2 = new Node2(schema);
            // newNode2.save(function (err){
            //     if(err) console.log("Error:", err);
            //     else console.log("insert Node2 successful at "+date);
            // });  
        } else {
            // var resulttime = moment(result.date).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
            // var schematime = moment(schema.date).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
            // console.log(result);
            // console.log(json.lat);
            if (result.lat != schema.lat) {
                var newAircraft = new Aircraft(schema);
                newAircraft.save(function (err) {
                    if (err) console.log("Error:", err);
                    else console.log("insert aircraft successful at " + date);
                });

            }
        }
    });
}

client.on('message', function (topic, msg) {
    // console.log(topic);
    var no = parseInt(topic.split('e')[1]);
    massage[no] = [];
    var json = JSON.parse(msg.toString());
    for (var i = 0; i < json.length; i++) {
        if (json[i]['flight'] != null && json[i]['lat'] != null) {
            massage[no].push(json[i]);
            createAircraft(json[i], no);
        }
    }
});

AircraftController.readJSON = function (req, res) {
    if (massage[req.params.id] == null) {
        res.send("Invalid path");
    }
    res.send(massage[req.params.id]);
}

AircraftController.home = function (req, res) {
    Aircraft.aggregate([{ $group: { _id: "$node_number" } }]).exec(function (err, result) {
        if (err) console.log("Error:", err);
        else {
            Aircraft.aggregate([{ $group: { _id: {}, mindate: { $min: "$date" } } }]).exec(function (erro, date) {
                date = moment(date[0].mindate).format("MM/DD/YYYY HH:mm");
                res.render('index', { title: 'ADS-B Data Center', node_number: result.length, date: date });
            })

        }
    });
}
AircraftController.view = function (req, res) {
    var qry = {};
    if (req.query.node != "all") qry.node_number = req.query.node;
    if (req.query.flight != "all") qry.flight = req.query.flight;
    if (req.query.stime != "all" && req.query.etime != "all") {
        var stime = moment(req.query.stime).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
        var etime = moment(req.query.etime).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
        qry.date = { $gte: stime, $lte: etime };
    }
    else if (req.query.stime != "all") {
        var stime = moment(req.query.stime).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
        qry.date = { $gte: stime };
    } else if (req.query.etime != "all") {
        var etime = moment(req.query.etime).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
        qry.date = { $lte: etime };
    }
    // console.log(qry);
    Aircraft.find(qry).exec(function (err, result) {
        if (err) res.send(err);
        res.render('table', { data: result });
    });
}
AircraftController.getdata = function (req, res) {

    var qry = {};
    if (req.params.node != "all") qry.node_number = req.params.node;
    if (req.params.flight != "all") qry.flight = req.params.flight;
    if (req.params.stime != "all" && req.params.etime != "all") {
        var stime = moment(req.params.stime).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
        var etime = moment(req.params.etime).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
        qry.date = { $gte: stime, $lte: etime };
    }
    else if (req.params.stime != "all") {
        var stime = moment(req.params.stime).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
        qry.date = { $gte: stime };
    } else if (req.params.etime != "all") {
        var etime = moment(req.params.etime).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
        qry.date = { $lte: etime };
    }
    // console.log(qry);
    Aircraft.find(qry).exec(function (err, result) {
        if (err) res.send(err);
        res.json(result);
    });
}

AircraftController.comparetime = function (req, res) {

    var qry = {};
    if (req.params.flight != "all") qry.flight = req.params.flight;
    Aircraft.find(qry).exec(function (err1, result1) {
        if (err1) res.send(err1);
        else{
            Node1.find(qry).exec(function(err2,result2){
                if (err2) res.send(err2);
                else{
                    Node2.find(qry).exec(function(err3,result3){
                        if (err3) res.send(err3);
                        else{
                            var min = Math.min(result1.length , Math.min(result2.length , result3.length));
                            for(var i =0 ;i< min ;i++){
                                result1[i].unixtime = moment(result1[i].unixtime).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
                                result2[i].unixtime = moment(result2[i].unixtime).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
                                result3[i].unixtime = moment(result3[i].unixtime).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
                            }
                            res.render('compare',{node1 : result2 , node2 : result3 , filter : result1 , min : min});
                        }
                    });
                }
            });
        }
    });
}
module.exports = AircraftController;