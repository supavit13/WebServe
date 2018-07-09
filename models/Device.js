var mongoose = require('mongoose');
var express = require('express');
var Schema = mongoose.Schema;
var Device = new Schema({
    name : {
        type : String
    },
    key : {
        type : String
    },
    discription : {
        type : String
    },
    date : {
        type : String
    }

});

module.exports = mongoose.model('Device', Device);