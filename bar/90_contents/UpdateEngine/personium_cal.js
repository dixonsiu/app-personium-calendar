exports.personiumCal = (function() {
    var moment = require("moment").moment;
    moment = require("moment_timezone_with_data").mtz;
    
    var personiumCal = {};
    var googleCal = require("google_cal").googleCal;

    personiumCal.parseGoogleEvents = function(items) {
        return googleCal.parseGoogleEvents(items);
    };

    personiumCal.parseGoogleEvent = function(item) {
        return googleCal.parseGoogleEvent(item);
    };

    personiumCal.toGoogleEvent = function(params) {
        var result = {};
        result.start = {};
        result.end = {};
        result.updated = {};
        result.organizer = {};

        // require dataTime:yyyy-MM-ddTHH:mm:ss.SSSZ
        var date;
        if (params.start.indexOf("T") > 0) {
            date = {
                "dateTime": params.dtstart
            };
        } else {
            date = {
                "date": params.start
            };
        }
        result.start = date;

        if (params.end.indexOf("T") > 0) {
            date = {
                "dateTime": params.dtend
            };
        } else {
            date = {
                "date": params.end
            };
        }
        result.end = date;

        // result.updated = params.Updated;
        result.summary = params.summary;
        result.description = params.description;
        result.location = params.location;

        return JSON.stringify(result);
    };

    personiumCal.getDateTime = function(obj) {
        if(obj.dateTime){
            return obj.dateTime;
        } else if (obj.date){
            return obj.date;
        } else { // date format error
            var err = [
                "io.personium.client.DaoException: 400,",
                JSON.stringify({
                    "code": "PR400-OD-0047",
                    "message": {
                        "lang": "en",
                        "value": "Operand or argument for date has unsupported/invalid format."
                    }
                })
            ].join("");
            throw new _p.PersoniumException(err);
        }
    };

    // probably not used
    var _toUTC = function(str) {
        var newdate = moment.tz(str, "Asia/Tokyo");
        return newdate.valueOf();
    };
    
    personiumCal.toPersoniumDatetimeFormat = function(str) {
        var newdate = moment(str);
        return "/Date(" + newdate.valueOf() + ")/";
    };
    
    personiumCal.toPersoniumDatetimeFormatTZ = function(str, timezone){
        var newdate = moment.tz(str, timezone);
        return "/Date(" + newdate.valueOf() + ")/";
    };
    
    return personiumCal;
}());
