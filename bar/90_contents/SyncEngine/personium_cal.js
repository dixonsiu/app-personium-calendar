exports.personiumCal = (function() {
    var moment = require("moment").moment;
    moment = require("moment_timezone_with_data").mtz;
    
    var personiumCal = {};

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
    
    
    personiumCal.toDatetimeLocalMS = function(str) {
        return moment(str).format("YYYY-MM-DDTHH:mm:ss.SSS");
    }
    
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
