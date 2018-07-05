exports.outlookCal = (function() {
    var outlookCal = {};
    var _ = require("underscore")._;
    var pCal = require("personium_cal").personiumCal;

    /*
     * items: events of Office365 REST API (GET)
     * check: null - return results=[addList=[]];
     *        or masterId - return results=[addList=[], masterList=[]];
     */
    outlookCal.parseEvents = function(items, check) {
        var results = [];
        var addList = [];
        var masterList = [];
        var masters = [];

        for(var i = 0; i < items.length; i++){
            var item = items[i];
            // SingleInstance, Occurrence, Exception, & SeriesMaster
            // https://msdn.microsoft.com/en-us/office/office365/api/complex-types-for-mail-contacts-calendar#EventResource
            var eventType = item.Type;
            var result;

            if (eventType == "Occurrence") {
                // Duplicate master info for child/recurrsive events
                var masterEvent = _.findWhere(masters, { srcId: item.SeriesMasterId });
                if (_.isEmpty(masterEvent)) {
                    continue;
                }
                result = outlookCal.parseChildEvent(masterEvent, item);
                addList.push(result);
            } else {
                // Parent event - SingleInstance, Exception, & SeriesMaster
                result = outlookCal.parseEvent(item);
                if (eventType == "SeriesMaster") {
                    // ToDo: Need to remember the master if we want to delete all events
                    masters.push(result);
                    if (check == "masterId") {
                        masterList.push(item.Id);
                    }
                } else {
                    // SingleInstance/ Exception
                    addList.push(result);
                }
            }
        }

        results.push(addList);
        if (check == "masterId") {
            results.push(masterList);
        }

        return results;
    };

    /*
     * Since Office365 always has proper to determine all-day and timezone,
     * we don't need to save info to start/end (keep them as null)
     */
    outlookCal.parseEvent = function(item) {
        var result = {};
        result.__id = item.Id;
        result.srcId = item.Id;
        result.raw = JSON.stringify(item);
        result.url = item.WebLink;
        result.allDay = item.IsAllDay;

        result.dtstart = pCal.toPersoniumDatetimeFormatTZ(item.Start.DateTime, item.Start.TimeZone);
        result.dtend = pCal.toPersoniumDatetimeFormatTZ(item.End.DateTime, item.End.TimeZone);
        result.srcUpdated = pCal.toPersoniumDatetimeFormat(item.LastModifiedDateTime);

        result.summary = item.Subject;
        result.description = item.Body.Content;
        result.location = item.Location.DisplayName; //https://msdn.microsoft.com/en-us/office/office365/api/complex-types-for-mail-contacts-calendar#LocationV2
        result.organizer = item.Organizer.EmailAddress.Address;

        if(!_.isEmpty(item.Attendees)){
            var list = [];
            for(var j = 0; j < item.Attendees.length; j++){
                list.push(item.Attendees[j].EmailAddress.Address);
            }
            if (list){
                result.attendees = list;
            }
        }

        return result;
    };

    outlookCal.parseChildEvent = function(masterEvent, item) {
        var result = _.clone(masterEvent); // shallow-copied
        var masterItem = JSON.parse(result.raw);
        result.__id = item.Id;
        result.raw = JSON.stringify(_.extend(masterItem, item));

        // overwrite with child data if exists
        if (item.Start) {
            result.dtstart = pCal.toPersoniumDatetimeFormatTZ(item.Start.DateTime, item.Start.TimeZone);
        }

        if (item.End) {
            result.dtend = pCal.toPersoniumDatetimeFormatTZ(item.End.DateTime, item.End.TimeZone);
        }

        if (item.LastModifiedDateTime) {
            result.srcUpdated = pCal.toPersoniumDatetimeFormat(item.LastModifiedDateTime);
        }

        if (item.Subject) {
            result.summary = item.Subject;
        }

        if (item.Body) {
            result.description = item.Body.Content;
        }

        if (item.Location) {
            result.location = item.Location.DisplayName; //https://msdn.microsoft.com/en-us/office/office365/api/complex-types-for-mail-contacts-calendar#LocationV2
        }

        if (item.Organizer) {
            result.organizer = item.Organizer.EmailAddress.Address;
        }

        if(!_.isEmpty(item.Attendees)){
            var list = [];
            for(var j = 0; j < item.Attendees.length; j++){
                list.push(item.Attendees[j].EmailAddress.Address);
            }
            if (list){
                result.attendees = list;
            }
        }

        return result;
    };

    outlookCal.params2Event = function(params) {
        var result = {};
        result.Start = {};
        result.End = {};
        result.IsAllDay = false || params.allDay;

        // require dataTime:yyyy-MM-ddTHH:mm:ss.SSSZ
        var date;
        if (params.start.indexOf("T") > 0) {
            date = {
                "DateTime": params.dtstart,
                "TimeZone": "UTC"
            };
        } else {
            date = {
                "DateTime": pCal.toDatetimeLocalMS(params.start),
                "TimeZone": "UTC"
            };
        }
        result.Start = date;

        if (params.end.indexOf("T") > 0) {
            date = {
                "DateTime": params.dtend,
                "TimeZone": "UTC"
            };
        } else {
            date = {
                "DateTime": pCal.toDatetimeLocalMS(params.end),
                "TimeZone": "UTC"
            };
        }
        result.End = date;

        result.Subject = params.summary;
        result.Body = { Content: params.description };
        result.Location = { DisplayName: params.location };

        return JSON.stringify(result);
    };

    return outlookCal;
}());
