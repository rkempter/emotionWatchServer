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
    this.topicTable = options.topicTable;
}

/**
 * Create new connection object
 */
 
exports.createConnection = function(config) {
    return new Connection(config);
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
                     "(EXTRACT(MINUTE FROM wo.`dateTime`) - "+startDateTime.getMinutes()+") DIV "+minutes+" * "+minutes+" + "+startDateTime.getMinutes()+" AS minute, "+
                     "EXTRACT(SECOND FROM wo.`dateTime`) DIV "+60+" * "+60+"+ "+startDateTime.getSeconds()+" AS second, ";
    // Query if we have less than one minute intervals
    if(minutes < 1) {
      timeQuery =  "EXTRACT(HOUR FROM wo.`dateTime`) AS hour, "+
                   "EXTRACT(MINUTE FROM wo.`dateTime`) AS minute,"+
                   "(EXTRACT(SECOND FROM wo.`dateTime`) - "+startDateTime.getSeconds()+") DIV "+step+" * "+step+" + "+startDateTime.getSeconds()+" AS second, ";
    } else if(hour > 1) {
      // Query if we have bigger intervals than one hour
      timeQuery =  "EXTRACT(HOUR FROM DATE_SUB(wo.`dateTime`, INTERVAL "+startDateTime.getHours()+" HOUR)) DIV "+hour+" * "+hour+" + "+startDateTime.getHours()+" AS hour, "+
                   "EXTRACT(MINUTE FROM wo.`dateTime`) DIV "+60+" * "+60+"+ "+startDateTime.getMinutes()+" AS minute, "+
                   "EXTRACT(SECOND FROM wo.`dateTime`) DIV "+60+" * "+60+"+ "+startDateTime.getSeconds()+" AS second, ";
    }

    var query = self.connection.query(
        "SELECT EXTRACT(YEAR FROM wo.`dateTime`) AS year, "+
        "EXTRACT(MONTH FROM wo.`dateTime`) AS month, "+
        "EXTRACT(DAY FROM wo.`dateTime`) AS day, "+
        timeQuery+
        "SUM(COALESCE(wc.`Involvement`,0)) as `Involvement`, "+
        "SUM(COALESCE(wc.`Amusement`,0)) as `Amusement`, "+
        "SUM(COALESCE(wc.`Pride`,0)) as `Pride`, "+
        "SUM(COALESCE(wc.`Happiness`,0)) as `Happiness`, "+
        "SUM(COALESCE(wc.`Pleasure`,0)) as `Pleasure`, "+
        "SUM(COALESCE(wc.`Love`,0)) as `Love`, "+
        "SUM(COALESCE(wc.`Awe`,0)) as `Awe`, "+
        "SUM(COALESCE(wc.`Relief`,0)) as `Relief`, "+
        "SUM(COALESCE(wc.`Surprise`,0)) as `Surprise`, "+
        "SUM(COALESCE(wc.`Nostalgia`,0)) as `Nostalgia`, "+
        "SUM(COALESCE(wc.`Pity`,0)) as `Pity`, "+
        "SUM(COALESCE(wc.`Sadness`,0)) as `Sadness`, "+
        "SUM(COALESCE(wc.`Worry`,0)) as `Worry`, "+
        "SUM(COALESCE(wc.`Shame`,0)) as `Shame`, "+
        "SUM(COALESCE(wc.`Guilt`,0)) as `Guilt`, "+
        "SUM(COALESCE(wc.`Regret`,0)) as `Regret`, "+
        "SUM(COALESCE(wc.`Envy`,0)) as `Envy`, "+
        "SUM(COALESCE(wc.`Disgust`,0)) as `Disgust`, "+
        "SUM(COALESCE(wc.`Contempt`,0)) as `Contempt`, "+
        "SUM(COALESCE(wc.`Anger`,0)) as `Anger`, "+
        "COUNT(*) AS total "+
        "FROM "+
            this.tweetTable+" AS wo, "+
            this.topicTable+" AS tt "+
        "LEFT JOIN "+
            this.emotionTable+" AS wc "+
        "ON wc.id = tt.tweet "+
        "WHERE "+
            "wo.`dateTime` BETWEEN ? AND ? AND "+
            "tt.`tweet` = wo.`id` AND "+
            "tt.`hashtag` = ? "+
        "GROUP BY year, month, day, hour, minute, second", [startDateTime.toMysqlFormat(), endDateTime.toMysqlFormat(), keyword]);
    console.log('----- Query the emotional data -------');
    console.log(query.sql);

    query.on('error', function(err) {
        console.log('Query error in queryData!');
        console.log(query.sql);
    });

    query.on('result', function(row) {
        // Month between 0-11   
        var dateTime = new Date(row['year'], row['month']-1, row['day'], row['hour'], row['minute'], row['second']);
        var total = row['total'];

        delete row['total'];
        delete row['year'];
        delete row['month'];
        delete row['day'];
        delete row['hour'];
        delete row['minute'];
        delete row['second'];

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
              var value = 0;
              if(max != 0) {
                var value = row[index] / max;
              }
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

/**
 * Get frequency of each timeinterval between a startDateTime and an endDateTime
 */
Connection.prototype.getFrequency = function(startDateTime, endDateTime, keyword, step, response, callback) {
    
    var minutes = step / 60;
    var hour = minutes / 60;
    // Query if we have minutes-intervals
    var timeQuery =  "EXTRACT(HOUR FROM wo.`dateTime`) AS hour, "+
                     "(EXTRACT(MINUTE FROM wo.`dateTime`) - "+startDateTime.getMinutes()+") DIV "+minutes+" * "+minutes+" + "+startDateTime.getMinutes()+" AS minute, "+
                     "EXTRACT(SECOND FROM wo.`dateTime`) DIV "+60+" * "+60+"+ "+startDateTime.getSeconds()+" AS second, ";
    // Query if we have less than one minute intervals
    if(minutes < 1) {
      timeQuery =  "EXTRACT(HOUR FROM wo.`dateTime`) AS hour, "+
                   "EXTRACT(MINUTE FROM wo.`dateTime`) AS minute,"+
                   "(EXTRACT(SECOND FROM wo.`dateTime`) - "+startDateTime.getSeconds()+") DIV "+step+" * "+step+" + "+startDateTime.getSeconds()+" AS second, ";
    } else if(hour > 1) {
      // Query if we have bigger intervals than one hour
      timeQuery =  "EXTRACT(HOUR FROM DATE_SUB(wo.`dateTime`, INTERVAL "+startDateTime.getHours()+" HOUR)) DIV "+hour+" * "+hour+" + "+startDateTime.getHours()+" AS hour, "+
                   "EXTRACT(MINUTE FROM wo.`dateTime`) DIV "+60+" * "+60+"+ "+startDateTime.getMinutes()+" AS minute, "+
                   "EXTRACT(SECOND FROM wo.`dateTime`) DIV "+60+" * "+60+"+ "+startDateTime.getSeconds()+" AS second, ";
    }

    var query = this.connection.query(
        "SELECT EXTRACT(YEAR FROM wo.`dateTime`) AS year, "+
               "EXTRACT(MONTH FROM wo.`dateTime`) AS month, "+
               "EXTRACT(DAY FROM wo.`dateTime`) AS day, "+
               timeQuery+
               "COUNT(*) AS frequency "+
        "FROM `"+this.tweetTable+"` AS wo, "+
              this.topicTable+" AS tt "+
        "WHERE `dateTime` > '"+startDateTime.toMysqlFormat()+"' AND "+
              "`dateTime` < '"+endDateTime.toMysqlFormat()+"' AND "+
              "tt.`tweet` = wo.`id` AND "+
              "tt.`hashtag` = ? "+
        "GROUP BY year, month, day, hour, minute, second", [keyword, keyword]);

    query.on('error', function(err) {
        console.log("Error in the getFrequency method: "+err);
    });

    query.on('result', function(result) {
        var dateTime = new Date(result['year'], result['month']-1, result['day'], result['hour'], result['minute'], result['second']).getTime();
        response[dateTime] = result.frequency;
    });

    query.on('end', function() {
      console.log(response);
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
                   "wc.`involvement` AS involvement, "+
                   "wc.`amusement` AS amusement, "+
                   "wc.`pride` AS pride, "+
                   "wc.`happiness` AS happiness, "+
                   "wc.`pleasure` AS pleasure, "+
                   "wc.`love` AS love, "+
                   "wc.`awe` AS awe, "+
                   "wc.`relief` AS relief, "+
                   "wc.`surprise` AS surprise, "+
                   "wc.`nostalgia` AS nostalgia, "+
                   "wc.`pity` AS pity, "+
                   "wc.`sadness` AS sadness, "+
                   "wc.`worry` AS worry, "+
                   "wc.`shame` AS shame, "+
                   "wc.`guilt` AS guilt, "+
                   "wc.`regret` AS regret, "+
                   "wc.`envy` AS envy, "+
                   "wc.`disgust` AS disgust, "+
                   "wc.`contempt` AS contempt, "+
                   "wc.`anger` AS anger "+
            "FROM "+self.tweetTable+" AS wo, "+
                    self.emotionTable+" AS wc, "+
                    self.topicTable+" AS wt "+
            "WHERE wc.`id` = wo.`id` AND "+
                  "wc.`"+emotion+"` > 0.2 AND "+
                  "wo.`dateTime` >= ? AND "+
                  "wo.`dateTime` < ? AND "+
                  "wt.`tweet` = wo.`id` AND "+
                  "wt.`hashtag` = '"+keyword+"' "+
            "ORDER BY RAND() LIMIT 10", [startDateTime.toMysqlFormat(), endDateTime.toMysqlFormat()]);

    } else {
        var query = self.connection.query(
            "SELECT wo.`user` AS user, "+
                   "wo.`text` AS text, "+
                   "wo.`datetime` AS dateTime, "+
                   "wo.`id` AS id, "+
                   "wc.`involvement` AS involvement, "+
                   "wc.`amusement` AS amusement, "+
                   "wc.`pride` AS pride, "+
                   "wc.`happiness` AS happiness, "+
                   "wc.`pleasure` AS pleasure, "+
                   "wc.`love` AS love, "+
                   "wc.`awe` AS awe, "+
                   "wc.`relief` AS relief, "+
                   "wc.`surprise` AS surprise, "+
                   "wc.`nostalgia` AS nostalgia, "+
                   "wc.`pity` AS pity, "+
                   "wc.`sadness` AS sadness, "+
                   "wc.`worry` AS worry, "+
                   "wc.`shame` AS shame, "+
                   "wc.`guilt` AS guilt, "+
                   "wc.`regret` AS regret, "+
                   "wc.`envy` AS envy, "+
                   "wc.`disgust` AS disgust, "+
                   "wc.`contempt` AS contempt, "+
                   "wc.`anger` AS anger "+
            "FROM "+self.tweetTable+" AS wo, "+
                   self.emotionTable+" AS wc, "+
                   self.topicTable+" AS wt "+
            "WHERE wo.`dateTime` >= ? AND "+
                  "wo.`dateTime` < ? AND "+
                  "wt.`tweet` = wo.`id` AND "+
                  "wc.`id` = wo.`id` AND "+
                  "wt.`hashtag` = '"+keyword+"' "+
            "ORDER BY RAND() LIMIT 10", [startDateTime.toMysqlFormat(), endDateTime.toMysqlFormat()]); 
    }
    console.log('------- query tweets ------');
    console.log(query.sql);

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