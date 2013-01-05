/**
* Query topic & author requests from the application
*
* author: Renato Kempter
*
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

function Connection(options) {
    this.connection = options.connection;
    this.table = options.table;
}

/**
 * Create new connection object
 */
 
exports.createConnection = function(config) {
    console.log('create new connection');
    return new Connection(config);
}


Connection.prototype.queryData = function(response, callback) {
  var self = this;
  var query = self.connection.query(
      "SELECT `hashtag` AS hashtag, "+
             "`network` AS network, "+
             "`love` AS love, "+
             "`pride` AS pride, "+
             "`surprise` as surprise, "+
             "`excitement` as excitement, "+
             "`joy` as joy, "+
             "`like` as liking, "+
             "`anger` as anger, "+
             "`shame` as shame, "+
             "`shock` as shock, "+
             "`anxiety` as anxiety, "+
             "`sadness` as sadness, "+
             "`dislike` as dislike "+
      "FROM "+self.table+" "+
      "ORDER BY RAND() "+
      "LIMIT 30");

    query.on('err', function(err) {
        console.log("Error in frontpage: "+err);
    });

    query.on('result', function(result) {
        response.push(result);
    });

    query.on('end', function() {
        callback(response);
    });
}