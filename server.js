var mysql = require('mysql');
var sanitize = require('validator').sanitize;
var check = require('validator').check;
var vidStreamer = require("vid-streamer");
var startConnector = require('./lib/queryFrontPage');
var tableConnector = require('./lib/queryTopic');
var eventConnector = require('./lib/queryEvents');
var sportConnector = require('./lib/querySports');
var CONFIG = require('config').Database;

// Create connection object
var connection = mysql.createConnection({
    host: CONFIG.dbHost,
    user: CONFIG.dbUser,
    password: CONFIG.dbPassword,
    database: CONFIG.dbName
});

if(!CONFIG.debug) {
    console.log = function() {};
}

connection.connect(function(err) {
    if(err) throw err;
});

var tweets = tableConnector.createConnection({
    tweetTable: 'merged_tweets',
    connection: connection
});

var frontPage = startConnector.createConnection({
    table: 'hashtag_profile',
    connection: connection
});

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
     // Step in sec
    var step = parseInt(req.params.timeStep);
    var network = req.params.network;
    var keyword = req.params.keyword.join("','");
    var startDateTime = new Date(req.params.startDateTime);
    var endDateTime = new Date(req.params.endDateTime);
    var keywordType = req.params.keywordType;
    var cid = req.params.cid;

    try {
        // Validate user input
        check(step).isInt();
        check(startDateTime).isDate();
        check(endDateTime).isDate();

        // Sanitize user input
        sanitize(keyword).xss();
        sanitize(network).xss();
    } catch (e) {
        console.log('error in getEmotionTweets: '+e);
        res.send([]);
        return;
    }
    
    var response = new Object();

    if(keywordType === 'event') {
        events.queryHashtags(parseInt(keyword), network, step, response, function(startDateTime, endDateTime, network, keyword, step, response) {
            tweets.queryData(startDateTime, endDateTime, network, keyword, step, response, function(response) {
                res.send(response);
            });
        });
    } else {
        tweets.queryData(startDateTime, endDateTime, network, keyword, step, response, function(response) {
            res.send(response);
        });
    }
}

function getTweets(req, res, next) {
    var response = new Array();

    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    var requestType = req.params.keywordType;
    var keyword = req.params.hashtag || '';
    var network = req.params.network || 'twitter';
    var windowsize = parseInt(req.params.windowsize) || 120;
    var startDateTime = new Date(req.params.datetime);
    var endDateTime = new Date(startDateTime.getTime() + windowsize * 1000);

    var response = [];

    try {
        // Validate user input
        check(windowsize).isInt();
        check(startDateTime).isDate();
        check(endDateTime).isDate();

        // Sanitize user input
        sanitize(keyword).xss();
        sanitize(requestType).xss();
        sanitize(network).xss();
    } catch (e) {
        console.log('error in getTweets: '+e);
        res.send([]);
        return;
    }

    if(requestType === 'event') {
        events.queryHashtags(parseInt(keyword), network, windowsize, response, function(startDateTime, endDateTime, network, keyword, response) {
            tweets.queryTweets(startDateTime, endDateTime, network, keyword, response, function(array) {
                res.send(array);
            });
        }, startDateTime, endDateTime);
    } else {
        tweets.queryTweets(startDateTime, endDateTime, network, keyword, response, function(array) {
            res.send(array);
        });
    };
}

function getEvents(req, res, next) {

    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    var response = new Array();

    var datetime = req.params.datetime;

    try {
        // Validate user input
        check(datetime).isDate();
    } catch (e) {
        console.log('error in getEvents: '+e);
        var empty = new Array();
        res.send(empty);
        return;
    }

    events.getCurrentEvents(datetime, response, function(array) {
        res.send(array);
    });
}

function getEventInfo(req, res, next) {
    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    var id = parseInt(req.params.id);

    try {
        check(id).isInt();    
    } catch(e) {
        console.log('error in getEventInfo: '+e);
        var empty = new Array();
        res.send(empty);
        return;
    }

    var response = new Array();

    events.getEventInfo(id, response, function(array) {
        res.send(array);
    });
}

function getEventVideo(req, res, next) {
    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    var id = parseInt(req.params.id);

    try {
        check(id).isInt();   
    } catch(e) {
        console.log('error in getEventVideo: '+e);
        var empty = new Array();
        res.send(empty);
        return;
    }

    var response = new Array();

    events.getEventVideo(parseInt(id), response, function(array) {
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

    try {
        // Sanitize user input
        sanitize(gender).xss();
        sanitize(sport).xss();
    } catch (e) {
        console.log('error in getSpecEvents: '+e);
        var empty = new Array();
        res.send(empty);
        return;
    }

    var response = new Array();

    events.getEvents(gender, sport, response, function(array) {
        res.send(array);
    });
}

function getHashtagProfil(req, res, next) {
    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    var response = new Array();

    frontPage.queryData(response, function(array) {
        res.send(array);
    });
}

function getFrequency(req, res, next) {

    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");


    var requestType = req.params.keywordType;
    var response = {};
    response['cid'] = req.params.cid;
    var network = req.params.network;
    var step = parseInt(req.params.windowsize);
    var keyword = req.params.keyword;

    try{
        sanitize(keyword).xss();
        sanitize(network).xss();
        check(step).isInt();
    } catch(e) {
        console.log('error: '+e);
        res.send([]);
        return;
    }

    if(requestType === 'event') {
        events.queryHashtags(parseInt(keyword), network, step, response, function(startDateTime, endDateTime, network, keywords, step, response) {
            tweets.getFrequency(startDateTime, endDateTime, network, keywords, step, response, function(array) {
                res.send(array);
            });
        });
    } else {
        var startDateTime = new Date(req.params.startDateTime);
        var endDateTime = new Date(req.params.endDateTime);
        var step = parseInt(req.params.windowsize);

        try {
            // Validate user input
            check(startDateTime).isDate();
            check(endDateTime).isDate();
        } catch (e) {
            console.log('error in getFrequency: '+e);
            res.send([]);
            return;
        }

        tweets.getFrequency(startDateTime, endDateTime, network, keyword, step, response, function(array) {
            res.send(array);
        });
    };
}

function getEvent(req, res, next) {
    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
}

var restify = require('restify');
var server = restify.createServer();
server.use( restify.queryParser() );
server.use( restify.bodyParser() );

server.get('/emotionTweets', getEmotionTweets);

server.get('/tweets', getTweets);

server.get('/frequency', getFrequency);

server.get('/frontPage', getHashtagProfil);

server.get('/getEventInfo', getEventInfo);

server.get('/getEventVideo', getEventVideo);

server.get('/videos/:video', vidStreamer);

server.get('/events', getEvents);

server.get('/event/:id', getEvent);

server.get('/specEvents', getSpecEvents);

server.listen(8080, function() {
  console.log('%s listening at %s, love & peace', server.name, server.url);
});


