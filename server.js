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

// var table = 'weibo_category';
// var table2 = 'weibo_olympics';
var table = 'tweets_allGymnastics_emotionRel';
var table2 = 'tweets_allGymnastics';
// Get Median and max

var emotionScale = new Array();

var maxQuery = connection.query("SELECT MAX(wc.`love`) AS love , MAX(wc.`pride`) AS pride, MAX(wc.`surprise`) as surprise, MAX(wc.`excitement`) as excitement, MAX(wc.`joy`) as joy, MAX(wc.`like`) as `like`, MAX(wc.`anger`) as anger, MAX(wc.`shame`) as shame, MAX(wc.`shock`) as shock, MAX(wc.`anxiety`) as anxiety, MAX(wc.`sadness`) as sadness, MAX(wc.`dislike`) as dislike FROM "+table+" as wc", function(err, rows) {
  console.log(rows);
  
  if(err) throw err;

  var row = rows[0];
  console.log(row);
  for(var index in row) {
    if(!isNaN(row[index])) {
      var x = { "label": index, "values": { "max": row[index] } };
      emotionScale.push(x);
    }
  }

  queryMedianPosition(0);
});

function queryMedian(index, pos, medianPosition) {
  var medianQuery = connection.query("SELECT wc.`"+index+"` as `"+index+"` FROM "+table+" as wc WHERE wc.`"+index+"` != 0 ORDER BY wc.`"+index+"` ASC LIMIT ?, 1", [medianPosition]);
  medianQuery
    .on('result', function(row) {
      emotionScale[pos].values.median = row[index];
      console.log("Median for "+index+" "+row[index]);
    })
    .on('end', function() {
      if(pos < 11) {
        queryMedianPosition(pos+1);
      }
    });

  return;
}

function queryMedianPosition(pos) {
  var index = emotionScale[pos]['label'];
  var medianPositionQuery = connection.query("SELECT COUNT(*) AS total FROM "+table+" as wc WHERE wc.`"+index+"` != 0", function(err, results) {
    var medianPosition = Math.floor(results[0]['total'] / 2);

    queryMedian(index, pos, medianPosition);
  });
  var medianPosition
}




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

function queryMax(callback) {
  var query = connection.query("SELECT MAX(wc.`love`) AS love , MAX(wc.`pride`) AS pride, MAX(wc.`surprise`) as surprise, MAX(wc.`excitement`) as excitement, MAX(wc.`joy`) as joy, MAX(wc.`like`) as liking, MAX(wc.`anger`) as anger, MAX(wc.`shame`) as shame, MAX(wc.`shock`) as shock, MAX(wc.`anxiety`) as anxiety, MAX(wc.`sadness`) as sadness, MAX(wc.`dislike`) as dislike FROM "+table+" as wc", function(err, rows) {
    callback(rows);
  });

  return undefined;
}

function queryData(index, currentDate, step, emotions, maxvalues, callback) {
  console.log(index+", "+currentDate+", "+step+", ");
  if(index > 0) {
    endDate = new Date(currentDate.getTime() + step * 1000);
    var results = 0;
    
    var query = connection.query("SELECT AVG(wc.`love`) AS love , AVG(wc.`pride`) AS pride, AVG(wc.`surprise`) as surprise, AVG(wc.`excitement`) as excitement, AVG(wc.`joy`) as joy, AVG(wc.`like`) as liking, AVG(wc.`anger`) as anger, AVG(wc.`shame`) as shame, AVG(wc.`shock`) as shock, AVG(wc.`anxiety`) as anxiety, AVG(wc.`sadness`) as sadness, AVG(wc.`dislike`) as dislike  FROM "+table+" as wc, "+table2+" as wo WHERE wc.id = wo.id AND wo.dateTime > ? AND wo.dateTime < ?", [currentDate.toMysqlFormat(), endDate.toMysqlFormat()]);
    //console.log(query.sql);
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
          var i = 0;
          for(var index in row) {
            if(!isNaN(row[index])) {
              console.log("-----");
              console.log("Index: "+index+" (value: "+row[index]+"max: "+emotionScale[i].values.max+" Median: "+emotionScale[i].values.median+"result: "+parseFloat(row[index]) / maxvalues[index]);
              if(row[index] > emotionScale[i].values.median) {
                element.push( { "emotion": index, "value": 0.5 + 0.5 * parseFloat(row[index]) / emotionScale[i].values.max} );
              } else {
                element.push( { "emotion": index, "value": parseFloat(row[index]) / emotionScale[i].values.median} );
              }
              i++;
            }
          }
          emotions.push(element);
          console.log(element);
        }
      })

      .on('end', function() {

        index--;
        console.log(index);
        queryData(index, endDate, step, emotions, maxvalues, callback);
      });

  } else {
    console.log(emotions);
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

  queryMax(function(max) {
    queryData(windowSize, startDate, step, emotions, max[0], function(emotions) {
      //console.log(emotions);
      res.send(emotions);
    }); 
  });
  
  
}

server.get('/emotionTweets', getEmotionTweets);

server.listen(8080, function() {
  console.log('%s listening at %s, love & peace', server.name, server.url);
});