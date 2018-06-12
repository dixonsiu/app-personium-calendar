exports.personiumCal = (function() {
    var moment = require("moment").moment;
    moment = require("moment_timezone_with_data").mtz;
    
    var personiumCal = {};
    
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
