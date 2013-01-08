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
    this.tweetTable = options.tweetTable;
    this.emotionTable = options.emotionTable;
    this.userTable = options.userTable;
    this.topicTable = options.topicTable;
}

/**
 * Create new connection object
 */
 
exports.createConnection = function(config) {
    return new Connection(config);
}

Connection.prototype.initialize = function() {
    var self = this;
    self.getEmotionCategories(function() {
        self.getMedian(0);
    });
    self.getTableMax();
}

/**
 * Method handles a result row and sums the values for each category up
 *
 * @param row
 * @param previousData
 */
Connection.prototype.handleRow = function(row, previousData) {
    for(var index in row) {
      if(!isNaN(row[index])) {
        if(previousData[index] == undefined) {
            previousData[index] = 0;
        }
        if(0 < row[index]) {
            previousData[index]++;
        }
      }
    }
    return previousData;
}

Connection.prototype.sumValues = function(values) {
    if(values == undefined) {
        return 0;
    }

    var sum = 0;
    for(var i = 0; i < values.length; i++) {
        sum += values[i];
    }

    return sum;
}

/**
 * Queries the emotional tweets and computes the values
 *
 * @param currentDate
 * @param step
 * @param finalEndDate
 * @param response
 * @param callback
 */
Connection.prototype.queryData = function(startDateTime, endDateTime, keyword, step, response, callback) {
    var self = this;
    var minutes = step / 60;
    var hour = minutes / 60;

    // Query if we have minutes-intervals
    var timeQuery =  "EXTRACT(HOUR FROM wo.`dateTime`) AS hour, "+
                     "EXTRACT(MINUTE FROM wo.`dateTime`) DIV "+minutes+" * "+minutes+" AS minute, "+
                     "EXTRACT(SECOND FROM wo.`dateTime`) DIV "+60+" * "+60+" AS second, ";
    // Query if we have less than one minute intervals
    if(minutes < 1) {
      timeQuery =  "EXTRACT(HOUR FROM wo.`dateTime`) AS hour, "+
                   "EXTRACT(MINUTE FROM wo.`dateTime`) AS minute,"+
                   "EXTRACT(MINUTE FROM wo.`dateTime`) DIV "+step+" * "+step+" AS second, ";
    } else if(hour > 1) {
      // Query if we have bigger intervals than one hour
      timeQuery =  "EXTRACT(HOUR FROM DATE_SUB(wo.`dateTime`, INTERVAL "+startDateTime.getHours()+" HOUR)) DIV "+hour+" * "+hour+" + "+startDateTime.getHours()+" AS hour, "+
                   "EXTRACT(MINUTE FROM wo.`dateTime`) DIV "+60+" * "+60+" AS minute, ";
                   "EXTRACT(SECOND FROM wo.`dateTime`) DIV "+60+" * "+60+" AS second, ";
    }

    var query = self.connection.query(
        "SELECT EXTRACT(YEAR FROM wo.`dateTime`) AS year, "+
               "EXTRACT(MONTH FROM wo.`dateTime`) AS month, "+
               "EXTRACT(DAY FROM wo.`dateTime`) AS day, "+
               timeQuery+
               "SUM(wc.`love`) AS love, "+
               "SUM(wc.`pride`) AS pride, "+
               "SUM(wc.`surprise`) as surprise, "+
               "SUM(wc.`excitement`) as excitement, "+
               "SUM(wc.`joy`) as joy, "+
               "SUM(wc.`like`) as liking, "+
               "SUM(wc.`anger`) as anger, "+
               "SUM(wc.`shame`) as shame, "+
               "SUM(wc.`shock`) as shock, "+
               "SUM(wc.`anxiety`) as anxiety, "+
               "SUM(wc.`sadness`) as sadness, "+
               "SUM(wc.`dislike`) as dislike, "+
               "COUNT(*) AS total "+
        "FROM "+
            this.tweetTable+" AS wo, "+
            this.emotionTable+" AS wc, "+
            this.topicTable+" AS tt, "+
            this.userTable+" AS ut "+
        "WHERE "+
            "wo.`dateTime` > ? AND "+
            "wo.`dateTime` < ? AND "+
            "wc.`id` = wo.`id` AND "+
            "tt.`tweet` = wo.`id` AND "+
            "ut.`tweet` = wo.`id` AND "+
            "(tt.`hashtag` = ? OR "+
            "ut.`user` = ?) "+
        "GROUP BY year, month, day, hour, minute, second", [startDateTime.toMysqlFormat(), endDateTime.toMysqlFormat(), keyword, keyword]);

    console.log(query.sql);

    query.on('error', function(err) {
        console.log('Query error in queryData!');
        console.log(query.sql);
    });

    query.on('result', function(row) {
        // Month between 0-11   
        var dateTime = new Date(row['year'], row['month']-1, row['day'], row['hour'], row['minute']);
        var total = row['total'];

        delete row['total'];
        delete row['year'];
        delete row['month'];
        delete row['day'];
        delete row['hour'];
        delete row['minute'];

        var emotions = new Array();

        var max = 0;
        var maxLabel;

        for(var index in row) {
            if(!isNaN(row[index]) && max < row[index]) {
                max = row[index];
            }
        }

        for(var index in row) {
            if(!isNaN(row[index])) {
                var value = row[index] / (total / 2) > 1 ? 1 : row[index] / max;
                var emotion = { emotion: index, value: value }
                emotions.push(emotion);
            }
        }

        response[dateTime] = { "emotions": emotions, "frequency": total };
    });

    query.on('end', function() {
         callback(response);
    });
};

Connection.prototype.getMedian = function(index) {
    var self = this;
    if(index == 0) {
        this.medians = new Array();
    }

    if(index < this.categories.length) {
        var category = this.categories[index];
        var medianPosition = 0;
        // get median position
        var positionQuery = this.connection.query("SELECT COUNT(*) AS total FROM "+self.emotionTable+" as wc WHERE wc.`"+category+"` != 0");

        positionQuery.on('error', function(err) {
            console.log("Error happened in getMedian: "+err);
        });

        positionQuery.on('result', function(results) {
            medianPosition = Math.floor(results['total'] / 2);
        });

        positionQuery.on('end', function() {
            self.queryMedian(index, medianPosition);
        });
    } else {
        return;
    }
};

Connection.prototype.queryMedian = function(index, position) {
    var self = this;
    var category = this.categories[index];
    var medianQuery = self.connection.query("SELECT wc.`"+category+"` as `"+category+"` FROM "+self.emotionTable+" as wc WHERE wc.`"+category+"` != 0 ORDER BY wc.`"+category+"` ASC LIMIT ?, 1", [position]);

    medianQuery.on('result', function(row) {
        self.medians[category] = row[category];
    });
    
    medianQuery.on('end', function() {
        index++;
        self.getMedian(index);
    });
}

/**
 * Creates an array with all categories from the category table
 * Does not include the column names "id", "neutral", "contextual";
 */
Connection.prototype.getEmotionCategories = function(callback) {
    var self = this;
    var query = this.connection.query("SELECT * FROM "+this.emotionTable+" LIMIT 1");

    query.on('error', function(err) {
        console.log("Error happend in getEmotionCategories: "+err);
    });

    query.on('fields', function(fields) {
        self.categories = new Array();
        for(var index = 0; index < fields.length; index++) {
            if(fields[index].name != "id" && fields[index].name != "neutral" && fields[index].name != "contextual") {
                self.categories.push(fields[index].name);
            }
        }
    });

    query.on('end', function() {
        callback();
    });
}

/**
 * Queries the maximal values in the emotion table
 */
Connection.prototype.getTableMax = function() {
    var self = this;
    var maxQuery = this.connection.query("SELECT MAX(wc.`love`) AS love , MAX(wc.`pride`) AS pride, MAX(wc.`surprise`) as surprise, MAX(wc.`excitement`) as excitement, MAX(wc.`joy`) as joy, MAX(wc.`like`) as `like`, MAX(wc.`anger`) as anger, MAX(wc.`shame`) as shame, MAX(wc.`shock`) as shock, MAX(wc.`anxiety`) as anxiety, MAX(wc.`sadness`) as sadness, MAX(wc.`dislike`) as dislike FROM "+this.emotionTable+" as wc", function(err, rows) {
      if(err) throw err;

      self.maxValues = new Array();
      var row = rows[0];

      for(var index in row) {
        if(!isNaN(row[index])) {
            self.maxValues[index] = row[index];
        }
      }
    });
};


/**
 * Get frequency of each timeinterval between a startDateTime and an endDateTime
 */
Connection.prototype.getFrequency = function(startDateTime, endDateTime, keyword, step, response, callback) {
    
    var minutes = step / 60;
    var hour = minutes / 60;
    // Query if we have minutes-intervals
    var timeQuery =  "EXTRACT(HOUR FROM wo.`dateTime`) AS hour, "+
                     "EXTRACT(MINUTE FROM wo.`dateTime`) DIV "+minutes+" * "+minutes+" AS minute, "+
                     "EXTRACT(SECOND FROM wo.`dateTime`) DIV "+60+" * "+60+" AS second, ";
    // Query if we have less than one minute intervals
    if(minutes < 1) {
      timeQuery =  "EXTRACT(HOUR FROM wo.`dateTime`) AS hour, "+
                   "EXTRACT(MINUTE FROM wo.`dateTime`) AS minute,"+
                   "EXTRACT(MINUTE FROM wo.`dateTime`) DIV "+step+" * "+step+" AS second, ";
    } else if(hour > 1) {
      // Query if we have bigger intervals than one hour
      timeQuery =  "EXTRACT(HOUR FROM DATE_SUB(wo.`dateTime`, INTERVAL "+startDateTime.getHours()+" HOUR)) DIV "+hour+" * "+hour+" + "+startDateTime.getHours()+" AS hour, "+
                   "EXTRACT(MINUTE FROM wo.`dateTime`) DIV "+60+" * "+60+" AS minute, ";
                   "EXTRACT(SECOND FROM wo.`dateTime`) DIV "+60+" * "+60+" AS second, ";
    }

    var query = this.connection.query(
        "SELECT EXTRACT(YEAR FROM wo.`dateTime`) AS year, "+
               "EXTRACT(MONTH FROM wo.`dateTime`) AS month, "+
               "EXTRACT(DAY FROM wo.`dateTime`) AS day, "+
               timeQuery+
               "COUNT(*) AS frequency "+
        "FROM `"+this.tweetTable+"` AS wo, "+
              this.topicTable+" AS tt, "+
              this.userTable+" AS ut "+
        "WHERE `dateTime` > '"+startDateTime.toMysqlFormat()+"' AND "+
              "`dateTime` < '"+endDateTime.toMysqlFormat()+"' AND "+
              "tt.`tweet` = wo.`id` AND "+
              "ut.`tweet` = wo.`id` AND "+
              "(tt.`hashtag` = ? OR "+
              "ut.`user` = ?) "+
        "GROUP BY year, month, day, hour, minute, second", [keyword, keyword]);

    console.log(query.sql);

    query.on('error', function(err) {
        console.log("Error in the getFrequency method: "+err);
    });

    query.on('result', function(result) {
        var dateTime = new Date(result['year'], result['month']-1, result['day'], result['hour'], result['minute']).getTime();
        response[dateTime] = result.frequency;
    });

    query.on('end', function() {
      
        callback(response);
    });
};

Connection.prototype.queryTweets = function(startDateTime, endDateTime, keyword, emotion, response, callback) {
    var self = this;
    if('' !== emotion) {
        var query = self.connection.query(
            "SELECT wo.`user` AS user, "+
                   "wo.`text` AS text, "+
                   "wo.`datetime` AS dateTime, "+
                   "wo.`id` AS id, "+
                   "wc.`love` AS love, "+
                   "wc.`pride` AS pride, "+
                   "wc.`surprise` as surprise, "+
                   "wc.`excitement` as excitement, "+
                   "wc.`joy` as joy, "+
                   "wc.`like` as liking, "+
                   "wc.`anger` as anger, "+
                   "wc.`shame` as shame, "+
                   "wc.`shock` as shock, "+
                   "wc.`anxiety` as anxiety, "+
                   "wc.`sadness` as sadness, "+
                   "wc.`dislike` as dislike "+
            "FROM "+self.tweetTable+" AS wo, "+
                    self.emotionTable+" AS wc, "+
                    self.topicTable+" AS wt, "+
                    self.userTable+" AS wu "+
            "WHERE wc.`id` = wo.`id` AND "+
                  "wc.`"+emotion+"` > 0.2 AND "+
                  "wo.`dateTime` >= ? AND "+
                  "wo.`dateTime` < ? AND "+
                  "wt.`tweet` = wo.`id` AND "+
                  "wu.`tweet` = wo.`id` AND "+
                  "(wt.`hashtag` = '"+keyword+"' OR "+
                  "wu.`user` = '"+keyword+"') "+
            "LIMIT 10", [startDateTime.toMysqlFormat(), endDateTime.toMysqlFormat()]);

    } else {
        var query = self.connection.query(
            "SELECT wo.`user` AS user, "+
                   "wo.`text` AS text, "+
                   "wo.`datetime` AS dateTime, "+
                   "wo.`id` AS id, "+
                   "wc.`love` AS love, "+
                   "wc.`pride` AS pride, "+
                   "wc.`surprise` as surprise, "+
                   "wc.`excitement` as excitement, "+
                   "wc.`joy` as joy, "+
                   "wc.`like` as liking, "+
                   "wc.`anger` as anger, "+
                   "wc.`shame` as shame, "+
                   "wc.`shock` as shock, "+
                   "wc.`anxiety` as anxiety, "+
                   "wc.`sadness` as sadness, "+
                   "wc.`dislike` as dislike "+
            "FROM "+self.tweetTable+" AS wo, "+
                   self.emotionTable+" AS wc, "+
                   self.topicTable+" AS wt, "+
                   self.userTable+" AS wu "+
            "WHERE wo.`dateTime` >= ? AND "+
                  "wo.`dateTime` < ? AND "+
                  "wt.`tweet` = wo.`id` AND "+
                  "wc.`id` = wo.`id` AND "+
                  "wu.`tweet` = wo.`id` AND "+
                  "(wt.`hashtag` = '"+keyword+"' OR "+
                  "wu.`user` = '"+keyword+"') "+
            "LIMIT 10", [startDateTime.toMysqlFormat(), endDateTime.toMysqlFormat()]); 
    }

    query.on('err', function(err) {
        console.log("Error in queryTweets: "+err);
    });

    query.on('result', function(result) {
        if('' !== emotion) {
            var tweet = { "id": result['id'], "emotion": emotion, "user": result['user'], "tweet": result['text'], "datetime": result['dateTime'].toMysqlFormat() };
        } else {
            var max = 0;
            var maxLabel = 'empty';
             for(var index in result) {
                if(!isNaN(result[index]) && index !== 'id' && index !== 'dateTime') {
                    if(max < result[index]) {
                        max = result[index];
                        maxLabel = index;
                    }
                }
            }
            var tweet = { "id": result['id'], "user": result['user'], "tweet": result['text'], "datetime": result['dateTime'].toMysqlFormat(), "emotion": maxLabel };
        }
        
        response.push(tweet);
    });

    query.on('end', function() {
        callback(response);
    });
}