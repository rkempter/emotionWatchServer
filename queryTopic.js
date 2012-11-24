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


Connection.prototype.setConnection =  function(connection) {
    module.connection = connection;
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
