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
}

/**
 * Create new connection object
 */
 
exports.createConnection = function(config) {
    console.log('create new connection');
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
 * Method maps a certain category value on the circle
 *
 * @param value
 * @param median
 * @param max
 */
Connection.prototype.mapValue = function(value, index, count, median) {
    var self = this;
    value = value / count;
    console.log("Index: "+index+", value: "+value+", median: "+median+", maxValue:"+self.maxValues[index]);
    if(value > median) {
        console.log("Value bigger than median: "+(0.5 + 0.5 * value / self.maxValues[index]));
      return 0.5 + 0.5 * value / self.maxValues[index];
    } else {
        //console.log(value / median);
      return 0.5*value / median;
    }
}


/**
 * Returns the median of a an array with values
 *
 */
Connection.prototype.getLocalMedian = function(values) {
    if(values.length) {
        var sortedValues = values.sort();
        var length = sortedValues.length;
        var medianPosition = Math.floor(length / 2);
        console.log("Get local median from these values (sorted): "+sortedValues);

        return sortedValues[medianPosition];
    } else {
        return 0.5;
    }
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
Connection.prototype.queryData = function(startDateTime, endDateTime, step, response, callback) {
    var self = this;

    var query = self.connection.query(
        "SELECT EXTRACT(YEAR FROM wo.`dateTime`) AS year, "+
               "EXTRACT(MONTH FROM wo.`dateTime`) AS month, "+
               "EXTRACT(DAY FROM wo.`dateTime`) AS day, "+
               "EXTRACT(HOUR FROM wo.`dateTime`) AS hour, "+
               "EXTRACT(MINUTE FROM wo.`dateTime`) DIV "+step+" * "+step+" AS minute,"+
               "SUM(wc.`love`) AS love , "+
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
        "FROM "+this.tweetTable+" AS wo, "+this.emotionTable+" AS wc "+
        "WHERE wo.`dateTime` > ? AND wo.`dateTime` < ? AND wc.`id` = wo.`id` "+
        "GROUP BY year, month, day, hour, minute", [startDateTime.toMysqlFormat(), endDateTime.toMysqlFormat()]);
    
    console.log(query.sql);

    query.on('error', function(err) {
        console.log('Query error!')
    });

    query.on('result', function(row) {
        var dateTime = new Date(row['year'], row['month'], row['day'], row['hour'], row['minute']);
        var total = row['total'];

        delete row['total'];
        delete row['year'];
        delete row['month'];
        delete row['day'];
        delete row['hour'];
        delete row['minute'];

        var emotions = new Array();

        for(var index in row) {
            console.log("Index: "+index);
            emotions[index] = row[index] / (total / 2);
            if(emotions[index] > 1) {
                emotions[index] = 1;
            }
        }

        var object = { "dateTime": dateTime, "emotions": emotions, "frequency": total };

        response.push(object);
    });

    query.on('end', function() {
         callback(response);   
    });
};

Connection.prototype.computeSpeed = function() {

};

Connection.prototype.computeInternalMedian = function() {

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
Connection.prototype.getFrequency = function(interval, startDateTime, endDateTime, response, callback) {
    var query = this.connection.query(
        "SELECT COUNT(*) AS frequency "+
        "FROM `"+this.tweetTable+"` "+
        "WHERE `dateTime` > '"+startDateTime.toMysqlFormat()+"' AND `dateTime` < '"+endDateTime.toMysqlFormat()+"' "+
        "GROUP BY EXTRACT(HOUR FROM `dateTime`), EXTRACT(MINUTE FROM `dateTime`) DIV "+interval+" * "+interval);

    query.on('error', function(err) {
        console.log("Error in the getFrequency method: "+err);
    });

    query.on('result', function(result) {
        response.push(result);
    });

    query.on('end', function() {
        callback(response);
    });
};

// Connection.prototype.countTweets = function(category, callback) {
//     var self = this;
//     if(undefined == category) {
//         var query = self.
//     }
// }

Connection.prototype.queryTweets = function(startDateTime, endDateTime, keyword, emotion, response, callback) {
    console.log("In db: "+startDateTime.toMysqlFormat());

    var self = this;
    if(undefined !== emotion) {
        var query = self.connection.query("SELECT wo.`user` AS user, wo.`text` AS text, wo.`datetime` AS dateTime, wo.`id` AS id FROM "+self.tweetTable+" AS wo, "+self.emotionTable+" AS wc WHERE wc.`id` = wo.`id` AND wc.`"+emotion+"` > 0 AND wo.`dateTime` >= ? AND wo.`dateTime` < ? LIMIT 10", [startDateTime.toMysqlFormat(), endDateTime.toMysqlFormat()]);
    } else {
        var query = self.connection.query("SELECT wo.`user` AS user, wo.`text` AS text, wo.`datetime` AS dateTime, wo.`id` AS id  FROM "+self.tweetTable+" AS wo WHERE wo.`dateTime` >= ? AND wo.`dateTime` < ? LIMIT 10", [startDateTime.toMysqlFormat(), endDateTime.toMysqlFormat()]);   
    }

    query.on('err', function(err) {
        console.log("Error in queryTweets: "+err);
    });

    query.on('result', function(result) {
        //console.log(result);
        var tweet = { "id": result['id'], "user": result['user'], "tweet": result['text'], "datetime": result['dateTime'].toMysqlFormat() };
        response.push(tweet);
    });

    query.on('end', function() {
        callback(response);
    });
}