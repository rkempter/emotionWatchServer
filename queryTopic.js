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

module.exports = Connection;

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
Connection.prototype.mapValue = function(value, median, max) {
    if(value > median) {
      return 0.5 + 0.5 * value / max;
    } else {
      return value / median;
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
Connection.prototype.queryData = function(currentDate, step, finalEndDate, median, max, response, callback) {
    if(currentDate.getTime() != finalEndDate.getTime()) {
        var endDate = new Date(currentDate.getTime() + step * 1000);
        var resultCount = 0;
        var responseElement = {
            "startdate": currentDate,
            "enddate": endDate,
        };
        var data = new Array();

        var query = this.connection.query("SELECT wc.`love` AS love , wc.`pride` AS pride, wc.`surprise` as surprise, wc.`excitement` as excitement, wc.`joy` as joy, wc.`like` as liking, wc.`anger` as anger, wc.`shame` as shame, wc.`shock` as shock, wc.`anxiety` as anxiety, wc.`sadness` as sadness, wc.`dislike` as dislike  FROM "+this.emotionTable+" as wc, "+this.tweetTable+" as wo WHERE wc.id = wo.id AND wo.dateTime > ? AND wo.dateTime < ?", [currentDate.toMysqlFormat(), endDate.toMysqlFormat()]);
        
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
                avgValue = mapValue(data[index], median, max);

                finalDataObject.push( {"emotion": index, "value": avgValue} );
            }

            responseElement.count = resultCount;
            responseElement.data = finalDataObject;

            response.push(responseElement);
            current
            queryData(endDate, step, finalEndDate, median, max, response, callback);
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
    if(index == 0) {
        this.medians = new Array();
    }

    if(index < this.categories.length) {
        var category = this.categories[index];
        var medianPosition = 0;
        // get median position
        var positionQuery = this.connection.query("SELECT COUNT(*) AS total FROM "+this.emotionTable+" as wc WHERE wc.`"+index+"` != 0");

        positionQuery.on('error', function(err) {
            console.log("Error happened in getMedian: "+err);
        });

        positionQuery.on('result', function(results) {
            medianPosition = Math.floor(results[0]['total'] / 2);
        });

        positionQuery.on('end', function() {
            this.queryMedian(index, medianPosition);
        });
    } else {
        return;
    }
};

Connection.prototype.queryMedian = function(index, position) {
    var category = this.categories[index];
    var medianQuery = connection.query("SELECT wc.`"+category+"` as `"+category+"` FROM "+this.emotionTable+" as wc WHERE wc.`"+category+"` != 0 ORDER BY wc.`"+this.category+"` ASC LIMIT ?, 1", [position]);

    medianQuery.on('result', function(row) {
        this.medians[category] = row[category];
    });
    
    medianQuery.on('end', function() {
        index++;
        this.getMedian(index);
    });
}

/**
 * Creates an array with all categories from the category table
 * Does not include the column names "id", "neutral", "contextual";
 */
Connection.prototype.getEmotionCategories = function(callback) {
    var query = this.connection.query("SELECT * FROM "+this.emotionTable+" LIMIT 1");

    query.on('error', function(err) {
        console.log("Error happend in getEmotionCategories: "+err);
    });

    query.on('fields', function(fields) {
        this.categories = new Array();
        for(var index in fields) {
            if(fields[index] != "id" && fields[index] != "neutral" && fields[index] != "contextual") {
                this.categories.push(fields[index]);
            }
        }
    });

    callback();
}

/**
 * Queries the maximal values in the emotion table
 */
Connection.prototype.getTableMax = function(callback) {
    var maxQuery = this.connection.query("SELECT MAX(wc.`love`) AS love , MAX(wc.`pride`) AS pride, MAX(wc.`surprise`) as surprise, MAX(wc.`excitement`) as excitement, MAX(wc.`joy`) as joy, MAX(wc.`like`) as `like`, MAX(wc.`anger`) as anger, MAX(wc.`shame`) as shame, MAX(wc.`shock`) as shock, MAX(wc.`anxiety`) as anxiety, MAX(wc.`sadness`) as sadness, MAX(wc.`dislike`) as dislike FROM "+this.emotionTable+" as wc", function(err, rows) {
      if(err) throw err;

      this.maxValues = new Array();
      var row = rows[0];

      for(var index in row) {
        if(!isNaN(row[index])) {
          var x = { "label": index, "values": { "max": row[index] } };
          this.maxValues.push(x);
        }
      }

      callback();
    });
};