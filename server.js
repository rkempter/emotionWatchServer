var mysql = require('mysql');
var sanitize = require('validator').sanitize;

var connection = mysql.createConnection({
	host	: 'localhost',
	user	: 'root',
	password: '',
  database: 'olympics'
});

connection.connect(function(err) {
  if(err) {
    throw err;
  }
});

var restify = require('restify');
var server = restify.createServer();
server.use( restify.queryParser() );
server.use( restify.bodyParser() );

/**
 * You first need to create a formatting function to pad numbers to two digits…
 **/
function twoDigits(d) {
    if(0 <= d && d < 10) return "0" + d.toString();
    if(-10 < d && d < 0) return "-0" + (-1*d).toString();
    return d.toString();
}

/**
 * …and then create the method to output the date string as desired.
 * Some people hate using prototypes this way, but if you are going
 * to apply this to more than one Date object, having it as a prototype
 * makes sense.
 **/
Date.prototype.toMysqlFormat = function() {
    return this.getUTCFullYear() + "-" + twoDigits(1 + this.getUTCMonth()) + "-" + twoDigits(this.getUTCDate()) + " " + twoDigits(this.getUTCHours()) + ":" + twoDigits(this.getUTCMinutes()) + ":" + twoDigits(this.getUTCSeconds());
};

function queryData(index, currentDate, step, emotions, callback) {
  
  if(index > 0) {
    endDate = new Date(currentDate.getTime() + step * 1000);
    var query = connection.query("SELECT AVG(wc.`love`) AS love , AVG(wc.`pride`) AS pride, AVG(wc.`surprise`) as surprise, AVG(wc.`excitement`) as excitement, AVG(wc.`joy`) as joy, AVG(wc.`like`) as liking, AVG(wc.`anger`) as anger, AVG(wc.`shame`) as shame, AVG(wc.`shock`) as shock, AVG(wc.`anxiety`) as anxiety, AVG(wc.`sadness`) as sadness, AVG(wc.`dislike`) as dislike  FROM weibo_category as wc, weibo_olympics as wo WHERE wc.id = wo.id AND wo.dateTime > ? AND wo.dateTime < ?", [currentDate.toMysqlFormat(), endDate.toMysqlFormat()]);

    query
      .on('error', function(err) {
        console.log('Query error!');
      })

      .on('result', function(row) {
        var element = new Array();
        var sum = 0;
        
        for(var index in row) {
          if(!isNaN(row[index])) {
            sum += parseFloat(row[index]);
          }
        }

        if(sum > 0) {
          for(var index in row) {
            if(!isNaN(row[index])) {
              element.push( { "emotion": index, "value": parseFloat(row[index]) / sum} );
            }
          }
          emotions.push(element); 
        }
      })
      .on('end', function() {
        index--;
        console.log(index);
        queryData(index, endDate, step, emotions, callback);
      })
  } else {
    console.log("Callback calling with "+emotions);
    callback(emotions);
  }
}

function getEmotionTweets(req, res, next) {
  // Resitify currently has a bug which doesn't allow you to set default headers
  // This headers comply with CORS and allow us to server our response to any origin
  res.header("Access-Control-Allow-Origin", "*"); 
  res.header("Access-Control-Allow-Headers", "X-Requested-With");

  console.log(req.params);
  
  var windowSize = parseInt(req.params.windowSize);

  // Step in sec
  var step = parseInt(req.params.timeStep);
  var emotions = new Array();

  var startDate = new Date(req.params.currentDateTime);
  var currentDate = startDate;
  var endDate;
  
  queryData(windowSize, startDate, step, emotions, function(emotions) {
    res.send(emotions);
  }); 
}

server.get('/emotionTweets', getEmotionTweets);

server.listen(8080, function() {
  console.log('%s listening at %s, love & peace', server.name, server.url);
});