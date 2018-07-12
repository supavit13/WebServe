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
var router = express.Router();
var AircraftController = {};



var jsonData = [];
var tempData = [];

var Older;
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
    console.log(prev)
    var data = req.body.data;
    if (jsonData.length > 0) {
        tempData = jsonData;
    }
    jsonData = [];
    for (var i = 0; i < data.length; i++) {
        console.log(data[i].unixtime);
        // createNew(data[i]);
        if (data[i].flight == "" || data[i].flight == "????????") {
            console.log("skip flight name is null");
        }else{
            createAircraft(data[i], data[i]['node_number']);
        }
        
        // Aircraft.insertMany(jsonData);
    }
    var curr = new Date() / 1000;
    console.log(curr)
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

    
    
    if(req.params.stime != 'all' && req.params.stime < today ){
        var syear = req.params.stime.split('-')[0];
        var smonth = req.params.stime.split('-')[1];
        var sday = (req.params.stime.split('-')[2]).split('T')[0];
        if(smonth[0] == '0') smonth = smonth[1];
        if(sday[0] == '0') sday = sday[1];
        if(Older == null) Older = mongoose.model('backup'+sday+smonth+syear,{});
        Older.find(qry).limit(1000).sort({ unixtime: -1 }).exec(function (err, result) { //limit data 1000 records
            if (err) throw err;
            else {
                res.json(result);
            }
    
        });
    }else if(req.params.stime == 'all' &&req.params.etime != 'all' && req.params.etime < today){
        var eyear = req.params.etime.split('-')[0];
        var emonth = req.params.etime.split('-')[1];
        var eday = (req.params.etime.split('-')[2]).split('T')[0];
        if(emonth[0] == '0') emonth = emonth[1];
        if(eday[0] == '0') eday = eday[1];
        if(Older == null) Older = mongoose.model('backup'+eday+emonth+eyear,{});
        console.log(Older);
        Older.find(qry).limit(1000).sort({ unixtime: -1 }).exec(function (err, result) { //limit data 1000 records
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

// AircraftController.older = function (req, res) {

//     var Old = mongoose.model('backup1172018',{});
//     Old.find({}).limit(1000).sort({ unixtime: -1 }).exec(function (err, result) {
//         if(err) throw err;
//         res.json(result);
//     });
    
// }

AircraftController.backup = function (req, res) {
    var time = moment(new Date()).tz("Asia/Bangkok").format("YYYY-MM-DD");

    backup({
        uri: 'mongodb://127.0.0.1:27017/adsb',
        root: '/var/mongodump/dump' + time,
        collections: ['aircrafts'],
        parser: 'json'
    })
    Aircraft.remove({}).exec(function (err, result) {
        console.log("Aircrafts collection removed");
    });
    res.sendStatus(200);

}
module.exports = AircraftController;