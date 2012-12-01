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
    return this.getUTCFullYear() + "-" + twoDigits(1 + this.getUTCMonth()) + "-" + twoDigits(this.getUTCDate()) + " " + twoDigits(this.getUTCHours()) + ":" + twoDigits(this.getUTCMinutes()) + ":" + twoDigits(this.getUTCSeconds());
};

/********* Modul ***********/

function Connection(options) {
    this.connection = options.connection;
    this.eventsTable = options.eventsTable;
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
        var eventElement = { "sport": result['sport'],
                      "event": result['event'],
                      "startdate": result['startdate'],
                      "enddate": result['enddate']
                    };
        response.push(eventElement);
    });

    query.on('end', function() {
        callback(response);
    });
}

Connection.prototype.getAllEvents = function(response, callback) {
    console.log(this.connection);
    var query = this.connection.query("SELECT sport, event, startDateTime, endDateTime FROM events");

    query.on('error', function(err) {
        console.log("Error in getAllEvents: "+err);
    });

    query.on('result', function(result) {
        var eventElement = {
            "sport": result['sport'],
            "event": result['event'],
            "startDateTime": result['startDateTime'],
            "endDateTime": result['endDateTime']
        }
        response.push(eventElement);
    });

    query.on('end', function() {
        callback(response);
    });
}