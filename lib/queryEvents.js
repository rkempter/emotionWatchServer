/**
 * This module queries events from the event table
 */

/****** HELPERS ********/

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
    return this.getFullYear() + "-" + twoDigits(1 + this.getMonth()) + "-" + twoDigits(this.getDate()) + " " + twoDigits(this.getHours()) + ":" + twoDigits(this.getMinutes()) + ":" + twoDigits(this.getSeconds());
};

/********* Modul ***********/

function Connection(options) {
    this.connection = options.connection;
    this.eventsTable = options.eventsTable;
    this.sportsTable = options.sportsTable;
}

exports.createConnection = function(config) {
    console.log('Connect with the events table');
    return new Connection(config);
}


Connection.prototype.getCurrentEvents = function(datetime, response, callback) {
    var query = this.connection.query("SELECT sport, event, startdate, enddate FROM ? WHERE startDateTime < ? AND endDateTime > ?", [this.eventsTable, datetime.toMysqlFormat(), datetime.toMysqlFormat()]);

    query.on('error', function(err) {
        console.log("Error in getCurrentEvents: "+err);
    });

    query.on('result', function(result) {
        var eventElement = { 
            "sport": result['sport'],
            "event": result['event'],
            "startdate": result['startdate'].toMysqlFormat(),
            "enddate": result['enddate'].toMysqlFormat(),
        };
        response.push(eventElement);
    });

    query.on('end', function() {
        callback(response);
    });
}

Connection.prototype.getEventInfo = function(id, response, callback) {
    var query = this.connection.query(
        "SELECT ev.event, ev.gender "+
        "FROM "+this.eventsTable+" AS ev "+
        "WHERE ev.id = ? ", [id]);

    query.on('error', function(err) {
        console.log("Error in getEventInfo: "+err);
    });

    query.on('result', function(result) {
        response.push(result);
    });

    query.on('end', function() {
        callback(response);
    });
}

Connection.prototype.getEventVideo = function(id, response, callback) {
    var query = this.connection.query(
        "SELECT ev.video "+
        "FROM "+this.eventsTable+" AS ev "+
        "WHERE ev.id = ?", [id]);

    query.on('error', function(err) {
        console.log("Error in getAllEvents: "+err);
    });

    query.on('result', function(result) {
        response.push(result);
    });

    query.on('end', function() {
        callback(response);
    });
}

Connection.prototype.getEvents = function(gender, sport, response, callback) {
    var query = this.connection.query(
        "SELECT ev.event, ev.video, ev.startDateTime, ev.endDateTime, sp.hashtag_twitter, sp.hashtag_weibo "+
        "FROM "+this.eventsTable+" AS ev, "+this.sportsTable+" AS sp "+
        "WHERE ev.gender = ? AND "+
        "ev.sport = ? AND "+
        "ev.sport = sp.sport", [gender, sport]);

    query.on('error', function(err) {
        console.log("Error in getAllEvents: "+err);
    });

    query.on('result', function(result) {
        response.push(result);
    });

    query.on('end', function() {
        callback(response);
    });
}

Connection.prototype.queryHashtags = function(id, network, step, response, callback, start, end) {
  var self = this;
  var keywords = '';
  var startDateTime, endDateTime;

  var query = self.connection.query(
      "SELECT `keywords_twitter` AS twitter, "+
             "`keywords_weibo` AS weibo, "+
             "`startDateTime`, "+
             "`endDateTime` "+
      "FROM "+self.eventsTable+" "+
      "WHERE `id` = ?", id);

    query.on('err', function(err) {
        console.log("Error in queryTweets: "+err);
    });

    query.on('result', function(result) {
      if(network === 'twitter') {
        keywords = result['twitter'].split(",");
      } else if(network === 'weibo') {
        keywords = result['weibo'].split(",");
      } else {
        keywords = result['twitter'];
        keywords += ",";
        keywords += result['weibo'];
        keywords = keywords.split(",");
      }
      
      startDateTime = result['startDateTime'];
      endDateTime = result['endDateTime']; 
    });

    query.on('end', function() {

      if(start === undefined && end === undefined)
        callback(startDateTime, endDateTime, network, keywords, step, response);
      else
        callback(start, end, network, keywords, response);
    });
}