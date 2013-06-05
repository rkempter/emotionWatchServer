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

var twitter = tableConnector.createConnection({
    tweetTable: 'merged_tweets',
    connection: connection
});

var frontPage = startConnector.createConnection({
    table: 'hashtag_profile',
    connection: connection
});

var sports = sportConnector.createConnection({
    table: 'sports',
    connection: connection,
})

var weibo = tableConnector.createConnection({
    emotionTable: 'weibo_emotionRelation',
    tweetTable: 'weibo_olympics',
    topicTable: 'weibo_topic',
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
    var keyword = req.params.topic;
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
        var empty = new Array();
        res.send(empty);
        return;
    }
    
    var response = new Object();

    if(keywordType == 'event') {
        sports.queryHashtag(startDateTime, endDateTime, network, keyword, step, response, function(startDateTime, endDateTime, keyword, step, response) {
            if(network == 'weibo') {
                weibo.queryData(startDateTime, endDateTime, keyword, step, response, function(response) {
                    res.send(response);
                });
            } else {
                twitter.queryData(startDateTime, endDateTime, keyword, step, response, function(response) {
                    res.send(response);
                });
            }
        });
    } else {
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
}

function getEmotionPatternTweets(req, res, next) {

    console.log('Pattern tweets');

    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

     // Step in sec
    var step = parseInt(req.params.timeStep);
    var network = req.params.network;
    var keyword = req.params.topic;
    var startDateTime = new Date(req.params.startDateTime);
    var endDateTime = new Date(req.params.endDateTime);

    try {
        // Validate user input
        check(step).isInt();
        check(startDateTime).isDate();
        check(endDateTime).isDate();

        // Sanitize user input
        sanitize(keyword).xss();
        sanitize(network).xss();
    } catch (e) {
        console.log('error in getEmotionPatternTweets: '+e);
        var empty = new Array();
        res.send(empty);
        return;
    }
    
    var response = new Object();

    sports.queryHashtag(startDateTime, endDateTime, network, keyword, step, response, function(startDateTime, endDateTime, keyword, step, response) {
        if(network == 'weibo') {
            weibo.queryData(startDateTime, endDateTime, keyword, step, response, function(array) {
                res.send(array);
            });
        } else {
            twitter.queryData(startDateTime, endDateTime, keyword, step, response, function(array) {
                res.send(array);
            });
        }
    });
}

function getTweets(req, res, next) {
    var response = new Array();

    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    var emotion = req.params.emotion || '';
    var keyword = req.params.hashtag || '';
    var network = req.params.network || 'twitter';
    var windowsize = parseInt(req.params.windowsize) || 120;
    var startDateTime = new Date(req.params.datetime);
    var keywordType = req.params.keywordType;
    var endDateTime = new Date(startDateTime.getTime() + windowsize * 1000);

    try {
        // Validate user input
        check(windowsize).isInt();
        check(startDateTime).isDate();
        check(endDateTime).isDate();

        // Sanitize user input
        sanitize(emotion).xss();
        sanitize(keyword).xss();
        sanitize(keywordType).xss();
        sanitize(network).xss();
    } catch (e) {

        console.log('error in getTweets: '+e);
        var empty = new Array();
        res.send(empty);
        return;
    }

    if(keywordType == 'event') {
        sports.queryHashtag(startDateTime, endDateTime, network, keyword, emotion, response, function(startDateTime, endDateTime, keyword, emotion, response) {
            if(network == 'weibo') {
                weibo.queryTweets(startDateTime, endDateTime, keyword, emotion, response, function(array) {
                res.send(array);
            });
            } else {
                twitter.queryTweets(startDateTime, endDateTime, keyword, emotion, response, function(array) {
                res.send(array);
            });
            }
        });
    } else {
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
}

function getEvents(req, res, next) {

    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    console.log("Requested Events");

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
    console.log('getEventInfo');
    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    var sport = req.params.sport;
    var startDateTime = new Date(req.params.startDateTime);
    var endDateTime = new Date(req.params.endDateTime);

    try {
        check(startDateTime).isDate();
        check(endDateTime).isDate();

        sanitize(sport).xss();       
    } catch(e) {
        console.log('error in getEventInfo: '+e);
        var empty = new Array();
        res.send(empty);
        return;
    }

    var response = new Array();

    sports.queryHashtag(startDateTime, endDateTime, 'twitter', sport, undefined, response, function(startDateTime, endDateTime, sport, emotion, response) {
        events.getEventInfo(startDateTime, endDateTime, sport.slice(1), response, function(array) {
            res.send(array);
        });
    });
}

function getEventVideo(req, res, next) {
    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    var sport = req.params.sport;
    var startDateTime = new Date(req.params.startDateTime);
    var endDateTime = new Date(req.params.endDateTime);

    try {
        check(startDateTime).isDate();
        check(endDateTime).isDate();

        sanitize(sport).xss();       
    } catch(e) {
        console.log('error in getEventInfo: '+e);
        var empty = new Array();
        res.send(empty);
        return;
    }

    var response = new Array();

    sports.queryHashtag(startDateTime, endDateTime, 'twitter', sport, undefined, response, function(startDateTime, endDateTime, sport, emotion, response) {
        events.getEventVideo(sport.slice(1), startDateTime, endDateTime, response, function(array) {
            res.send(array);
        });
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

function getPatternFrequency(req, res, next) {

    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    var startDateTime = new Date(req.params.startDateTime);
    var endDateTime = new Date(req.params.endDateTime);
    var step = parseInt(req.params.windowsize);
    var keyword = req.params.keyword;
    var network = req.params.network;
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
        console.log('error in getPatternFrequency: '+e);
        var empty = new Array();
        res.send(empty);
        return;
    }

    var response = new Object();

    sports.queryHashtag(startDateTime, endDateTime, network, keyword, step, response, function(startDateTime, endDateTime, keyword, step, response) {
        if(network == 'weibo') {
            weibo.getFrequency(startDateTime, endDateTime, keyword, step, response, function(array) {
                res.send(array);
            });
        } else {
            twitter.getFrequency(startDateTime, endDateTime, keyword, step, response, function(array) {
                res.send(array);
            });
        }
    });
}

function getFrequency(req, res, next) {

    // Resitify currently has a bug which doesn't allow you to set default headers
    // This headers comply with CORS and allow us to server our response to any origin
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    var startDateTime = new Date(req.params.startDateTime);
    var endDateTime = new Date(req.params.endDateTime);
    var step = parseInt(req.params.windowsize);
    var keyword = req.params.keyword;
    var network = req.params.network;
    var cid = req.params.cid;
    var keywordType = req.params.keywordType;

    try {
        // Validate user input
        check(step).isInt();
        check(startDateTime).isDate();
        check(endDateTime).isDate();

        // Sanitize user input
        sanitize(keyword).xss();
        sanitize(keywordType).xss();
        sanitize(network).xss();
    } catch (e) {
        console.log('error in getFrequency: '+e);
        var empty = new Array();
        res.send(empty);
        return;
    }

    var response = new Object();
    response['cid'] = cid;

    if(keywordType == 'event') {
            sports.queryHashtag(startDateTime, endDateTime, network, keyword, step, response, function(startDateTime, endDateTime, keyword, step, response) {
                if(network == 'weibo') {
                    weibo.getFrequency(startDateTime, endDateTime, keyword, step, response, function(array) {
                        res.send(array);
                    });
                } else {
                    twitter.getFrequency(startDateTime, endDateTime, keyword, step, response, function(array) {
                        res.send(array);
                    });
                }
            });
    } else {
        if(network == 'weibo') {
            weibo.getFrequency(startDateTime, endDateTime, keyword, step, response, function(array) {
                res.send(array);
            });
        } else {
            twitter.getFrequency(startDateTime, endDateTime, keyword, step, response, function(array) {
                res.send(array);
            });
        }
    }
}

var restify = require('restify');
var server = restify.createServer();
server.use( restify.queryParser() );
server.use( restify.bodyParser() );

server.get('/emotionTweets', getEmotionTweets);

server.get('/emotionPatternTweets', getEmotionPatternTweets);

server.get('/tweets', getTweets);

server.get('/frequency', getFrequency);

server.get('/patternFrequency', getPatternFrequency);

server.get('/frontPage', getHashtagProfil);

server.get('/getEventInfo', getEventInfo);

server.get('/getEventVideo', getEventVideo);

server.get('/videos/:video', vidStreamer);

server.get('/events', getEvents);

server.get('/specEvents', getSpecEvents);

server.listen(8080, function() {
  console.log('%s listening at %s, love & peace', server.name, server.url);
});


