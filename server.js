var mysql = require('mysql');
var sanitize = require('validator').sanitize;
var tableConnector = require('./lib/queryTopic');

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

function getEmotionTweets(req, res, next) {
    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    
    console.log(req.params);
    
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
    var startDate = new Date('July 28, 2012 22:00:00');//new Date(req.params.startdate);
    var response = new Array();

    if(network == 'weibo') {
        weibo.queryTweets(startDate, keyword, emotion, response, function() {
            res.send(response);
        });
    } else {
        twitter.queryTweets(startDate, keyword, emotion, response, function() {
            res.send(response);
        });
    }

}

function getEventInformation(req, res, next) {
    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    console.log("Requested Event information");

}

function getEvents(req, res, next) {
    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    console.log("Requested Events");
}

function getAthlete(req, res, next) {
    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    console.log("Requested Athete");
}

var restify = require('restify');
var server = restify.createServer();
server.use( restify.queryParser() );
server.use( restify.bodyParser() );

server.get('/emotionTweets', getEmotionTweets);

server.get('/tweets', getTweets);

server.get('/events', getEvents);

server.get('/athlete', getAthlete);

server.listen(8080, function() {
  console.log('%s listening at %s, love & peace', server.name, server.url);
});


