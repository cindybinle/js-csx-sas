var express = require('express');
var app = express();

// static folder
app.use('/',express.static(__dirname+'/'));
// static folder

app.listen(4545, function () {
  console.log('App Started!');
});