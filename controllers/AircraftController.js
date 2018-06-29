var mongoose = require("mongoose");
var Aircraft = require("../models/Aircraft");
var Node1 = require("../models/Node1");
var Node2 = require("../models/Node2");
var moment = require('moment-timezone');
var url = require('url');
var express = require('express');
var request = require('request-promise');
var router = express.Router();
var AircraftController = {};



var jsonData = [];
var tempData = [];
function createAircraft(json, no) {
    var date = moment(new Date(Date.now())).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
    var str = json.flight;
    // console.log(json);
    json.flight = str.trim();
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
   
    Aircraft.findOne({ flight: json.flight, lat: json.lat, lon: json.lon }).exec(function (err, result) {
        if (err) console.log("Error:", err);
        else if (result == null) {
            var newAircraft = new Aircraft(schema);
            jsonData.push(schema);
            newAircraft.save(function (err) {
                if (err) console.log("Error:", err);
                else console.log("insert " + schema.flight + " " + schema.altitude + " aircraft successful at " + date);
            });
        } else {
            var unixtimes = new Date() / 1000;
            if (result.lat != schema.lat) {
                var newAircraft = new Aircraft(schema);
                jsonData.push(schema);
                newAircraft.save(function (err) {
                    if (err) console.log("Error:", err);
                    else console.log("insert " + schema.flight + " " + schema.altitude + " aircraft successful at " + date);
                });
            } else if (result.unixtime > schema.unixtime && schema.unixtime - unixtimes <= 5) { //find minimum time
                console.log("update to minimum");
                Aircraft.findOne({ flight: json.flight, lat: json.lat, lon: json.lon }).update(schema);
                jsonData.push(schema);
                console.log("update " + schema.flight + " dbtime :" + result.unixtime +" adsb :"+schema.unixtime+ " adsb - now :" + schema.unixtime - unixtimes);
            }
        }
    });
}



AircraftController.adsbData = function (msg) {
    createAircraft(msg, msg['node_number']);

}
AircraftController.putdata = function (req, res) {
    var prev = new Date() / 1000;
    console.log(prev)
    var data = req.body;
    if(jsonData.length > 0){
        tempData = jsonData;
    }
    jsonData = [];
    for (var i = 0; i < 4; i++) {
        console.log(data[i].unixtime);
        createAircraft(data[i], data[i]['node_number']);
    }
    var curr = new Date() / 1000;
    console.log(curr)
    console.log(parseFloat(curr) - parseFloat(prev));
    res.sendStatus(200);
}

AircraftController.readJSON = function (req, res) {

    if (jsonData.length > 0) {
        res.json(jsonData);
    }else{
        res.json(tempData);
    }
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
    Aircraft.find(qry).limit( 1000 ).sort({ unixtime : -1 }).exec(function (err, result) {
        if (err) res.send(err);
        else{
            // var len = result.length;
            // var json = [];
            // if(len >= 10000){
            //     for(var i=len-1;i>len-10000;i--){
            //         json.push(result[i]);
            //     }
            //     res.json(json);
            // }else{
            //     res.json(result);
            // }
            res.json(result);
        }
        
    });
}

AircraftController.comparetime = function (req, res) {

    var qry = {};
    if (req.params.flight != "all") qry.flight = req.params.flight;
    Aircraft.find(qry).exec(function (err1, result1) {
        if (err1) res.send(err1);
        else {
            Node1.find(qry).exec(function (err2, result2) {
                if (err2) res.send(err2);
                else {
                    Node2.find(qry).exec(function (err3, result3) {
                        if (err3) res.send(err3);
                        else {
                            var min = Math.min(result1.length, Math.min(result2.length, result3.length));
                            for (var i = 0; i < min; i++) {
                                result1[i].unixtime = moment(result1[i].unixtime).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
                                result2[i].unixtime = moment(result2[i].unixtime).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
                                result3[i].unixtime = moment(result3[i].unixtime).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss");
                            }
                            res.render('compare', { node1: result2, node2: result3, filter: result1, min: min });
                        }
                    });
                }
            });
        }
    });
}
module.exports = AircraftController;