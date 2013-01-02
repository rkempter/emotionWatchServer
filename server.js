var mysql = require('mysql');
var sanitize = require('validator').sanitize;
var tableConnector = require('./lib/queryTopic');
var eventConnector = require('./lib/queryEvents');

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
    topicTable: 'topic',
    userTable: 'users',
    connection: connection
});
// var twitter = tableConnector.createConnection({
//     emotionTable: 'tweets_eventsExcerpt_emotionRel',
//     tweetTable: 'tweets_eventsExcerpt',
//     connection: connection
// });


twitter.initialize();

var weibo = tableConnector.createConnection({
    emotionTable: 'weibo_category',
    tweetTable: 'weibo_olympics',
    connection: connection
});

weibo.initialize();

var events = eventConnector.createConnection({
    eventsTable: 'events',
    sportsTable: 'sports',
    connection: connection
});

function getEmotionTweets(req, res, next) {
    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    var network = req.params.network;

    console.log("Query emotions!!!!");

    //console.log(req.params);
    
    // Step in sec
    var step = parseInt(req.params.timeStep / 60);
    var response = new Array();

    var keyword = req.params.topic;
    
    var startDateTime = new Date(req.params.startDateTime);
    var endDateTime = new Date(req.params.endDateTime);

    if(network == 'weibo') {
        weibo.queryData(startDateTime, endDateTime, keyword, step, response, function(response) {
            res.send(response);
        });
    } else {
        twitter.queryData(startDateTime, endDateTime, keyword, step, response, function(response) {
            res.send(response);
        });
    }
}

function getTweets(req, res, next) {
    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    var emotion = req.params.emotion || undefined;
    var keyword = req.params.hashtag || undefined;
    var network = req.params.network || 'twitter';
    var windowsize = req.params.windowsize || 120;
    var startDateTime = new Date(req.params.datetime);
    var endDateTime = new Date(startDateTime.getTime() + windowsize * 1000);
    var response = new Array();

    console.log(req.params);

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

function getSpecEvents(req, res, next) {
    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    var gender = req.params.gender;
    var sport = req.params.sport;

    var response = new Array();

    events.getEvents(gender, sport, response, function(array) {
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

function getFrequency(req, res, next) {
    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    console.log(req.params);

    var startDateTime = new Date(req.params.startDateTime);
    var endDateTime = new Date(req.params.endDateTime);
    var windowSize = parseInt(req.params.windowsize / 60);
    var keyword = req.params.keyword;
    var network = req.params.network;

    console.log(windowSize);

    var response = new Object();

    if(network == 'weibo') {
        weibo.getFrequency(windowSize, keyword, startDateTime, endDateTime, response, function(array) {
            res.send(array);
        });
    } else {
        twitter.getFrequency(windowSize, keyword, startDateTime, endDateTime, response, function(array) {
            res.send(array);
        });
    }
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

server.get('/frequency', getFrequency);

server.get('/events', getEvents);

server.get('/specEvents', getSpecEvents);

server.get('/athlete', getAthlete);

server.get('/getPatternWatches', getPatternWatches)

server.listen(8080, function() {
  console.log('%s listening at %s, love & peace', server.name, server.url);
});


