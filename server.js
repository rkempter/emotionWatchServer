var mysql = require('mysql');
var sanitize = require('validator').sanitize;
var tableConnector = require('./lib/queryTopic');
var eventConnector = require('./lib/queryEvents')

// Create connection object
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'olympics'
});

connection.connect(function(err) {
    if(err) throw err;
});

var twitter = tableConnector.createConnection({
    emotionTable: 'tweets_allGymnastics_emotionRel',
    tweetTable: 'tweets_allGymnastics',
    connection: connection
});

twitter.initialize();

var weibo = tableConnector.createConnection({
    emotionTable: 'weibo_category',
    tweetTable: 'weibo_olympics',
    connection: connection
});

weibo.initialize();

var events = eventConnector.createConnection({
    eventsTable: 'events',
    connection: connection
});

function getEmotionTweets(req, res, next) {
    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    
    //console.log(req.params);
    
    var windowSize = parseInt(req.params.windowSize);
    var network = req.params.network;
    
    // Step in sec
    var step = parseInt(req.params.timeStep);
    var response = new Array();
    
    var startDate = new Date(req.params.currentDateTime);
    var endDate;

    if(network == 'weibo') {
        weibo.queryData(windowSize, startDate, step, response, function(response) {
            res.send(response);
        });
    } else {
        twitter.queryData(windowSize, startDate, step, response, function(response) {
            res.send(response);
        });
    }
}

function getTweets(req, res, next) {
    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    console.log("Requested Tweets");

    console.log(req.params);

    var emotion = req.params.emotion || undefined;
    var keyword = req.params.keyword || undefined;
    var network = req.params.network || 'twitter';
    var windowsize = req.params.windowsize || 120;
    console.log("Startdatetime: "+req.params.datetime);
    var startDateTime = new Date(req.params.datetime);
    var endDateTime = new Date(startDateTime.getTime() + windowsize * 1000);
    var response = new Array();

    if(network == 'weibo') {
        weibo.queryTweets(startDateTime, endDateTime, keyword, emotion, response, function(array) {
            res.send(array);
        });
    } else {
        twitter.queryTweets(startDateTime, endDateTime, keyword, emotion, response, function(array) {
            res.send(array);
        });
    }

}

function getEventInformation(req, res, next) {
    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    console.log("Requested Event information");

    // use event connector

}

function getEvents(req, res, next) {
    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    console.log("Requested Events");

    var response = new Array();

    var datetime = req.params.datetime;

    events.getCurrentEvents(datetime, response, function(array) {
        res.send(array);
    });
}

function getAllEvents(req, res, next) {
    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    console.log("Requested list of all events");

    var response = new Array();

    events.getAllEvents(response, function(array) {
        res.send(array);
    });
}

function getAthlete(req, res, next) {
    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    console.log("Requested Athete");

    
}

function getPatternWatches(req, res, next) {
    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    //console.log('Pattern watches requested');

    var response = new Array();

    var startDateTime = new Date(req.params.startDateTime);
    var endDateTime = new Date(req.params.endDateTime);
    var keyword = req.params.keyword;
    var network = req.params.network;
    var windowSize = req.params.windowSize;

    if(network == 'weibo') {
        weibo.queryData(24, startDateTime, windowSize, response, function(array) {
            res.send(array);
        });
    } else {
        twitter.queryData(24, startDateTime, windowSize, response, function(array) {
            res.send(array);
        });
    }
}

var restify = require('restify');
var server = restify.createServer();
server.use( restify.queryParser() );
server.use( restify.bodyParser() );

server.get('/emotionTweets', getEmotionTweets);

server.get('/tweets', getTweets);

server.get('/events', getEvents);

server.get('/allEvents', getAllEvents);

server.get('/athlete', getAthlete);

server.get('/getPatternWatches', getPatternWatches)

server.listen(8080, function() {
  console.log('%s listening at %s, love & peace', server.name, server.url);
});


