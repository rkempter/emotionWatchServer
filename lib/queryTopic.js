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
    return this.getUTCFullYear() + "-" + twoDigits(1 + this.getUTCMonth()) + "-" + twoDigits(this.getUTCDate()) + " " + twoDigits(this.getUTCHours()) + ":" + twoDigits(this.getUTCMinutes()) + ":" + twoDigits(this.getUTCSeconds());
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
Connection.prototype.queryData = function(index, currentDate, step, response, callback) {
    var self = this;
    if(index > 0) {
        index--;
        var endDate = new Date(currentDate.getTime() + step * 1000);
        var resultCount = 0;
        var responseElement = {
            "startdate": currentDate,
            "enddate": endDate,
        };
        var data = new Array();

        var query = self.connection.query("SELECT wc.`love` AS love , wc.`pride` AS pride, wc.`surprise` as surprise, wc.`excitement` as excitement, wc.`joy` as joy, wc.`like` as liking, wc.`anger` as anger, wc.`shame` as shame, wc.`shock` as shock, wc.`anxiety` as anxiety, wc.`sadness` as sadness, wc.`dislike` as dislike  FROM "+this.emotionTable+" as wc, "+this.tweetTable+" as wo WHERE wc.id = wo.id AND wo.dateTime > ? AND wo.dateTime < ?", [currentDate.toMysqlFormat(), endDate.toMysqlFormat()]);
        
        query.on('error', function(err) {
            console.log('Query error!')
        });

        query.on('result', function(row) {
            resultCount++;

            data = self.handleRow(row, data);
        });

        query.on('end', function() {
            var finalDataObject = new Array();
            // Averaging the data
            for(var emotionIndex in data) {
                //var values = data[emotionIndex];
                //console.log(values);
                //var median = self.getLocalMedian(values);
                //console.log("Median: "+median+" for index: "+emotionIndex);
                //var sum = self.sumValues(values);
                //console.log(sum);
                console.log("Max value:" +data[emotionIndex]+" Results: "+resultCount);
                var avgValue = data[emotionIndex] / 35;//self.mapValue(sum, emotionIndex, resultCount, median);

                finalDataObject.push( {"emotion": emotionIndex, "value": avgValue} );
            }

            responseElement.count = resultCount;
            responseElement.data = finalDataObject;

            response.push(responseElement);
            //console.log(index);
            self.queryData(index, endDate, step, response, callback);
        });
    } else {
        //console.log(response);
        callback(response);
    }
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

Connection.prototype.queryTweets = function(date, keyword, emotion, response, callback) {
    //console.log(date)
    var self = this;

    var query = self.connection.query("SELECT wo.`user` AS user, wo.`text` AS text, wo.`datetime` AS dateTime FROM "+self.tweetTable+" AS wo, "+self.emotionTable+" AS wc WHERE wc.`id` = wo.`id` AND wc.`"+emotion+"` > 0 AND wo.`dateTime` > ? LIMIT 10", [date.toMysqlFormat()]);
    //console.log(query.sql);

    query.on('err', function(err) {
        console.log("Error in queryTweets: "+err);
    });

    query.on('result', function(result) {
        //console.log(result);
        var tweet = { "id": result['id'], "user": result['user'], "tweet": result['text'], "datetime": result['dateTime'] };
        response.push(tweet);
    });

    query.on('end', function() {
        //console.log(response);
        callback(response);
    });
}