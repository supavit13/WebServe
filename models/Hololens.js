var mongoose = require('mongoose');
var express = require('express');
var Schema = mongoose.Schema;
var Hololens = new Schema({
    date : {
        type: String
    }
    data : {
        type : Object
    }
    
});

module.exports = mongoose.model('Hololens', Hololens);