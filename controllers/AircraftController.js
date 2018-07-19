var mongoose = require("mongoose");
var Aircraft = require("../models/Aircraft");
var Node1 = require("../models/Node1");
var Node2 = require("../models/Node2");
var Hololens = require("../models/Hololens");
var Device = require("../models/Device");
var moment = require('moment-timezone');
var url = require('url');
var express = require('express');
var request = require('request-promise');
var backup = require('mongodb-backup');
var fs = require('fs');
var csvpath = '/home/adsb/domains/mongodump/csv';
var CronJob = require('cron').CronJob;
var router = express.Router();
var AircraftController = {};



var jsonData = [];
var tempData = [];
var aircraftData = [];
var OlderCollection = {};
function createNew(json) {
    var date = moment(new Date(Date.now())).tz("Asia/Bangkok").format("YYYY-MM-DD");
    var schema = {};
    Hololens.findOne({ date: date }).exec(function (err, result) {
        if (err) res.send(err);
        else if (result.data == null) {
            var schema = {
                date: date,
                data: [
                    {
                        flight: json.flight,
                        first_time: date,
                        lastest_time: date,
                        points: [
                            {
                                lat: json.lat,
                                lon: json.lon,
                                altitude: json.altitude,
                                speed: json.speed,
                                time: date
                            }
                        ]
                    }

                ]
            }
            var hololens = new Hololens(schema);
            hololens.save(function (err) {
                if (err) console.log("Error:", err);
                else console.log("New data");
            });

        }
        else {
            var schema = {
                lat: json.lat,
                lon: json.lon,
                altitude: json.altitude,
                speed: json.speed,
                time: date
            }
            Hololens.update({ date: date, "data.flight": json.flight }, { lastest_time: date, $push: { "data.$.points": { schema } } }, function (err, result) {
                if (err) console.log(err);
                else {
                    console.log("update complete!!");
                }
            });


        }
    })
}
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

    Aircraft.findOne({ flight: json.flight, lat: json.lat, lon: json.lon, altitude : json.altitude }).exec(function (err, result) {
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
            } else if (result.unixtime > schema.unixtime && Math.abs(schema.unixtime - unixtimes) <= 5) { //find minimum time
                console.log("update to minimum");
                Aircraft.findOne({ flight: json.flight, lat: json.lat, lon: json.lon }).update(schema);
                jsonData.push(schema);
                console.log("update " + schema.flight + " dbtime :" + result.unixtime.toString() + " adsb :" + schema.unixtime.toString() + " adsb - now :" + (schema.unixtime - unixtimes).toString());
            }
        }
    });

}



AircraftController.adsbData = function (msg) {
    if (msg.flight.trim() != "" && msg.flight.trim() != "????????") {
        createAircraft(msg, msg['node_number']);
    }


}
AircraftController.putdata = function (req, res) {
    var prev = new Date() / 1000;
    // console.log(prev)
    var data = req.body.data;
    if (jsonData.length > 0) {
        tempData = jsonData;
    }
    
    jsonData = [];
    var node_number = data[0]['node_number'];
    var filename = "/home/adsb/domains/mongodump/json/aircraft_"+node_number+".json";
    fs.writeFile(filename,JSON.stringify(data),function(err){
        if (err) throw err;
        console.log("write data to "+filename);
    });
    
    for (var i = 0; i < data.length; i++) {
        console.log(data[i].unixtime);
        
        
        if (data[i].flight == "" || data[i].flight == "????????") {
            console.log("skip flight name is null");
        }else{
            createAircraft(data[i], data[i]['node_number']);
        }
        
    }
    
    var curr = new Date() / 1000;
    // console.log(curr)
    console.log(parseFloat(curr) - parseFloat(prev));
    res.sendStatus(200);
}

AircraftController.readJSON = function (req, res) {

    if (jsonData.length > 0) {
        res.json(jsonData);
    } else {
        res.json(tempData);
    }
}
function mergedata(json){
    var timenow = new Date() /1000;
    if(aircraftData.length == 0){
        aircraftData = json;
    }else{
        var isDuplicate = false;
        json.forEach(jsondata => {
            isDuplicate = false;
            aircraftData.forEach(airdata => {
                if(Math.abs(timenow - jsondata.unixtime)  > 30){
                    isDuplicate = true
                }
                else if(airdata.lat==jsondata.lat && airdata.lon==jsondata.lon && airdata.altitude==jsondata.altitude && airdata.flight==jsondata.flight ){
                    isDuplicate = true;
                }
            });
            if(!isDuplicate){
                aircraftData.push(jsondata);
            }
        });
    }
}
setInterval(function(){
    aircraftData = [];
    var timenow = new Date() /1000;
    fs.readdir("/home/adsb/domains/mongodump/json",(err,files) =>{
        if(err) throw err;
        files.forEach(element => {
            fs.readFileSync("/home/adsb/domains/mongodump/json/"+element,function(err1,data){
                if(err1) throw err1;
                else if(data == null){

                }else{
                    try {
                        var json = JSON.parse(data);
                        if(Math.abs(timenow - json[0].unixtime)  > 30){
                            
                        }else{
                            mergedata(json);
                        }
                    }catch(error){
                        console.log(error.message);
                    }
                    
                }
                
                
            });
        });
    })
},1000);
AircraftController.aircraftdata = function (req, res) {
    res.json(aircraftData);
}

AircraftController.holodata = function (req, res) {
    console.log(req.body);
    var today = moment(new Date(Date.now())).tz("Asia/Bangkok").format("YYYY-MM-DD 00:00:00").valueOf();
    today = moment(today).format('x') / 1000;
    var date = new Date() / 1000;
    var before = date - 20;
    var schema = [];
    console.log("date : " + date.toString());
    console.log("before : " + before.toString());
    Aircraft.find({ unixtime: { $gte: before, $lte: date } }).sort({ unixtime: 1 }).exec(function (err, result) {

        var j = 0, i = 0, check = true;
        for (i = 0; i < result.length; i++) {
            j = 0;
            check = true;
            for (j = 0; j < schema.length; j++) {
                if (result[i].flight == schema[j].flight) {
                    check = false;
                    break;
                }
            }
            if (j == schema.length && check == true) {
                schema.push({
                    flight: result[i].flight,
                    first_time: result[i].date,
                    lastest_time: result[i].date,
                    points: [
                        {
                            lat: result[i].lat,
                            lon: result[i].lon,
                            altitude: result[i].altitude,
                            speed: result[i].speed,
                            time: result[i].date
                        }
                    ]
                });
            }
        }
        for (var m = 0; m < schema.length; m++) {
            for (var n = 0; n < result.length; n++) {
                if (schema[m].flight == result[n].flight && schema[m].lastest_time != result[n].date) {
                    schema[m].lastest_time = result[n].date;
                    schema[m].points.push({
                        lat: result[n].lat,
                        lon: result[n].lon,
                        altitude: result[n].altitude,
                        speed: result[n].speed,
                        time: result[n].date
                    })
                }
            }
        }
        var flight = [];
        for (var m = 0; m < schema.length; m++) {
            flight.push(schema[m].flight);
        }

        Aircraft.find({ flight: { $in: flight }, unixtime: { $gte: before - 40, $lt: before } }, function (err, result1) {
            if (err) throw err;
            var points = [];
            // console.log(result1);
            for (var m = 0; m < schema.length; m++) {
                for (var n = 0; n < result1.length; n++) {
                    if (schema[m].flight == result1[n].flight) {
                        points.push({
                            lat: result1[n].lat,
                            lon: result1[n].lon,
                            altitude: result1[n].altitude,
                            speed: result1[n].speed,
                            time: result1[n].date
                        });
                    }
                }
                schema[m].points.unshift(points);
            }

            res.json(schema);
        });




    });

}

AircraftController.postholodata = function (req, res) {

    var date = new Date() / 1000;
    var before = date - 20;
    var schema = [];
    console.log("date : " + date.toString());
    console.log("before : " + before.toString());

    Aircraft.find({ unixtime: { $gte: before, $lte: date } }).sort({ unixtime: 1 }).exec(function (err, result) {

        var j = 0, i = 0, check = true;
        for (i = 0; i < result.length; i++) {
            j = 0;
            check = true;
            for (j = 0; j < schema.length; j++) {
                if (result[i].flight == schema[j].flight) {
                    check = false;
                    break;
                }
            }
            if (j == schema.length && check == true) {
                schema.push({
                    flight: result[i].flight,
                    first_time: result[i].date,
                    lastest_time: result[i].date,
                    points: [
                        {
                            lat: result[i].lat,
                            lon: result[i].lon,
                            altitude: result[i].altitude,
                            speed: result[i].speed,
                            time: result[i].date
                        }
                    ]
                });
            }
        }
        for (var m = 0; m < schema.length; m++) {
            for (var n = 0; n < result.length; n++) {
                if (schema[m].flight == result[n].flight && schema[m].lastest_time != result[n].date) {
                    schema[m].lastest_time = result[n].date;
                    schema[m].points.push({
                        lat: result[n].lat,
                        lon: result[n].lon,
                        altitude: result[n].altitude,
                        speed: result[n].speed,
                        time: result[n].date
                    })
                }
            }
        }


        res.json(schema);
    });



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
    Aircraft.find(qry).limit(1000).sort({ unixtime: -1 }).exec(function (err, result) {
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

    var today = moment(new Date(Date.now())).tz("Asia/Bangkok").format("YYYY-MM-DD 00:00:00");

    var twoColl = (moment(etime).tz("Asia/Bangkok").format('x')/1000) - (moment(stime).tz("Asia/Bangkok").format('x')/1000);
    console.log(twoColl);
    
    if(req.params.stime != 'all' && req.params.stime < today){
        var syear = req.params.stime.split('-')[0];
        var smonth = req.params.stime.split('-')[1];
        var sday = (req.params.stime.split('-')[2]).split('T')[0];
        if(!OlderCollection.hasOwnProperty('backup'+sday+smonth+syear)) OlderCollection['backup'+sday+smonth+syear] = mongoose.model('backup'+sday+smonth+syear,{});
        OlderCollection['backup'+sday+smonth+syear].find(qry).limit(1000).sort({ unixtime: -1 }).exec(function (err, result) { //limit data 1000 records
            if (err) throw err;
            else {
                res.json(result);
            }
    
        });
    }else if(req.params.stime == 'all' &&req.params.etime != 'all' && req.params.etime < today){
        var eyear = req.params.etime.split('-')[0];
        var emonth = req.params.etime.split('-')[1];
        var eday = (req.params.etime.split('-')[2]).split('T')[0];
        if(!OlderCollection.hasOwnProperty('backup'+eday+emonth+eyear)) OlderCollection['backup'+eday+emonth+eyear] = mongoose.model('backup'+eday+emonth+eyear,{});
        OlderCollection['backup'+eday+emonth+eyear].find(qry).limit(1000).sort({ unixtime: -1 }).exec(function (err, result) { //limit data 1000 records
            if (err) throw err;
            else {
                res.json(result);
            }
    
        });
    }else{
        Aircraft.find(qry).limit(1000).sort({ unixtime: -1 }).exec(function (err, result) { //limit data 1000 records
            if (err) throw err;
            else {
                res.json(result);
            }

        });
    }
    // console.log(qry);
    
}

AircraftController.csv = function (req, res) {
    fs.readdir(csvpath,(err,files) => {
        if(err) throw err;
        // console.log(files);
        res.render('csvlist', {data : files});
    });
    
};
AircraftController.download = function (req, res) {
    res.download(csvpath+'/'+req.params.filename);
    
};

AircraftController.backup = function (req, res) {
    var time = moment(new Date()).tz("Asia/Bangkok").format("YYYY-MM-DD");

    backup({
        uri: 'mongodb://127.0.0.1:27017/adsb',
        root: '/home/adsb/domains/mongodump/dump' + time,
        collections: ['aircrafts'],
        parser: 'bson'
    })
    Aircraft.remove({}).exec(function (err, result) {
        console.log("Aircrafts collection removed");
    });
    res.sendStatus(200);

}
module.exports = AircraftController;