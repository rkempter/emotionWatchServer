/**
* Query topic & author requests from the application
*
* author: Renato Kempter
*
*/

function Connection(options) {
    this.connection = options.connection;
    this.tweetTable = options.tweetTable;
    this.emotionTable = options.emotionTable;
}

//module.exports = Connection;

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
    var sum = 0;
        
    for(var index in row) {
      if(!isNaN(row[index])) {
        if(previousData[index] == undefined) {
            previousData[index] = 0;
        }

        previousData[index] += parseFloat(row[index]);
      }
    }
    return previousData;
}

/**
 * Method maps a certain category value on the circle
 *
 * @param value
 * @param median
 * @param max
 */
Connection.prototype.mapValue = function(value, index) {
    var self = this;
    if(value > this.medians[index]) {
      return 0.5 + 0.5 * value / self.maxValues[index];
    } else {
      return value / self.medians[index];
    }
}

/**
 * Queries the emotional tweets and computes the values
 *
 * @param currentDate
 * @param step
 * @param finalEndDate
 * @param median
 * @param max
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

            data = handleRow(row, data);
        });

        query.on('end', function() {
            var finalDataObject = new Array();
            // Averaging the data
            for(var index in data) {
                avgValue = mapValue(data[index], index);

                finalDataObject.push( {"emotion": index, "value": avgValue} );
            }

            responseElement.count = resultCount;
            responseElement.data = finalDataObject;

            response.push(responseElement);
            queryData(index, endDate, step, response, callback);
        });
    } else {
        console.log("Got all elements");
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