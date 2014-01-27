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


Connection.prototype.queryHashtag = function(id, network, response, callback) {
  var self = this;
  var keywords = '';
  var startDateTime, endDateTime;
  var query = self.connection.query(
      "SELECT `keywords_twitter` AS twitter, "+
             "`keywords_weibo` AS weibo, "+
             "`startDateTime` AS startDateTime, "+
             "`endDateTime` AS endDateTime "+
      "FROM "+self.table+" "+
      "WHERE `id` = ?", [id]);

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
      callback(startDateTime, endDateTime, network, keywords, step, response);
    });
}