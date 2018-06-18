var express = require('express');
var mqtt = require('mqtt');
var url = require('url');
var router = express.Router();
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


client.on('message',function(topic,msg){
    var no = parseInt(topic.split('e')[1]);
    massage[no] = [];
    var json = JSON.parse(msg.toString());
    for(var i=0;i<json.length;i++){
        if(json[i]['flight']!=null){
            massage[no].push(json[i]);
        }
    }
});

router.get('/:id', function(req, res, next) {
    if(massage[req.params.id]==null){
        res.send("Invalid path");
    }
    res.json(massage[req.params.id]);
});
  
module.exports = router;