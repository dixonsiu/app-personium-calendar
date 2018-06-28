exports.googleCal = (function() {
    // https://developers.google.com/calendar/v3/reference/events#resource
    var googleCal = {};
    var _ = require("underscore")._;

    googleCal.parseGoogleEvents = function(items) {
        var results = [];
        for(var i = 0; i < items.length; i++){
            var item = items[i];
            var result = googleCal.parseGoogleEvent(item);
            results.push(result);
        }

        return results;
    };

    googleCal.parseGoogleEvent = function(item) {
        var result = {};
        result.__id = item.id;
        result.srcId = item.id;
        result.url = item.htmlLink;
        
        var startStr = '';
        if (item.start){
            result.start = item.start.date; // for all-day event
            startStr = item.start.date || item.start.dateTime;
            result.dtstart = pCal.toPersoniumDatetimeFormat(startStr);
        }

        var endStr = '';
        if (item.end){
            result.end = item.end.date; // for all-day event
            endStr = item.end.date || item.end.dateTime;
            result.dtend = pCal.toPersoniumDatetimeFormat(endStr);
        }

        result.allDay = _isAllDay(startStr, endStr);

        if (item.updated){
            result.srcUpdated = pCal.toPersoniumDatetimeFormat(item.updated);
        }

        result.summary = item.summary;
        result.description = item.description;
        result.location = item.location;

        if (item.organizer){
            result.organizer = item.organizer.email;
        }

        result.status = item.status;

        if(!_.isEmpty(item.attendees)){
            var list = [];
            for(var j = 0; j < item.attendees.length; j++){
                list.push(item.attendees[j].email);
            }
            if (list){
                result.attendees = list;
            }
        }

        result.raw = JSON.stringify(item);

        return result;
    };

    var _isAllDay = function(start, end) {
        return !(start.includes('T') || end.includes('T'));
    };


    return googleCal;
}());
