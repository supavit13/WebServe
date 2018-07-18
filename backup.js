var db = connect("localhost:27017/adsb");
var date = new Date();
var day = date.getDate().toString();
var month = (date.getMonth()+1).toString();
var year = date.getFullYear().toString();
if(day.length == 1) day = '0'+day;
if(month.length == 1) month = '0'+month;
var name = "backup"+day+month+year;
db.aircrafts.copyTo(name);
