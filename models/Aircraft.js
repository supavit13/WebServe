var mongoose = require('mongoose');
var express = require('express');
var Schema = mongoose.Schema;
var Aircraft = new Schema({
    hex: {
        type: String
    },
    squawk: {
        type: String
    },
    flight: {
        type: String
    },
    lat: {
        type: Number
    },
    lon: {
        type: Number
    },
    nucp: {
        type: Number
    },
    seen_pos: {
        type: Number
    },
    altitude: {
        type: Number
    },
    vert_rate: {
        type: Number
    },
    track: {
        type: Number
    },
    speed: {
        type: Number
    },
    category: {
        type: String
    },
    mlat: {
        type: Object
    },
    tisb: {
        type: Object
    },
    messages: {
        type: Number
    },
    seen: {
        type: Number
    },
    rssi: {
        type: Number
    },
    node_number: {
        type: Number
    },
    unixtime: {
        type: Number
    },
    date: {
        type: String
    }
});

module.exports = mongoose.model('Aircraft', Aircraft);