var mongoose = require('mongoose');
var express = require('express');
var Schema = mongoose.Schema;
var Hololens = new Schema({
    date : {
        type: String
    }
    data : [
        {
            flight: {
                type: String
            },
            first_time: {
                type: String
            },
            lastest_time: {
                type: String
            },
            points: [
                {
                    lat : {
                        type :Number
                    },
                    lon : {
                        type :Number
                    },
                    altitude : {
                        type :Number
                    },
                    speed : {
                        type :Number
                    },
                    time : {
                        type :String
                    }
                }
            ]
        }
           
    ]
    
});

module.exports = mongoose.model('Hololens', Hololens);