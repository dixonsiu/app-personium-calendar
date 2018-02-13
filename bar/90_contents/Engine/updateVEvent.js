/*
 * Create / Update / Delete a single VEvent, reflecting the result to the source service.
 *   HTTP Method :
 *           POST:   Create
 *           PUT:    Update
 *           DELETE: Delete
 *   HTTP Request Body :  JSON with following parameters
 *
 *           DELETE, UPDATE
 *              __id
 *           CREATE, UPDATE
 *              description
 *              ....
 */

function(request){

  // POST, PUT, DELETE 以外は405
  if(request.method !== "POST" && request.method !== "PUT" && request.method !== "DELETE") {
    return {
      status : 405,
      headers : {"Content-Type":"application/json"},
      body : ['{"error":"method not allowed"}']
    };
  }

  if(request.method === "POST" || request.method === "PUT") {
    bodyAsString = request.input.readAll();
  } else {
    bodyAsString = request.queryString;
  }
  if (bodyAsString === "") {
    return {
      status : 400,
      headers : {"Content-Type":"application/json"},
      body : ['{"error":"required parameter not exist."}']
    };
  }

  var collectionName = "OData";
  var davName = "AccessInfo";
  var entityType = "vevent";
  var pathDavName = "AccessInfo/AccessInfo.json";

  var params = _p.util.queryParse(bodyAsString);

  try {
    var personalBoxAccessor = _p.as("client").cell(pjvm.getCellName()).box(pjvm.getBoxName());
    var personalCollectionAccessor = personalBoxAccessor.odata(collectionName);
    var personalEntityAccessor = personalCollectionAccessor.entitySet(entityType);

    var vEvent = null;
    var accessInfo = {};

    var info = personalBoxAccessor.getString(pathDavName);
    var accInfo = JSON.parse(info);
    for (var i = 0; i < accInfo.length; i++) {
      if (accInfo[i].srcType == params.srcType && accInfo[i].id == params.id) {
        accessInfo = accInfo[i];
      }
    }

    if (request.method === "PUT" || request.method === "DELETE") {
      try {
        vEvent = personalEntityAccessor.retrieve(params.__id);
      } catch (e) {
        return {
          status: e.code,
          headers: { "Content-Type": "application/json" },
          body: [JSON.stringify({"error": e.message})]
        };
      }
    } else { // POST
      // POST method
      // not supported now!
      /*
      return {
        status : 400,
        headers : {"Content-Type":"application/json"},
        body: ['{"error": "POST method is not supported now."}']
      };
      */
    }


    if (request.method === "PUT") {

      if (vEvent.srcType == "EWS") {
        try {
          ews = new _p.extension.Ews();
          ews.createService(accessInfo.id, accessInfo.pw);
          ews.setUrl(accessInfo.srcUrl);
        } catch (e) {
          return {
            status : 400,
            headers : {"Content-Type":"application/json"},
            body: ['{"srcType": "EWS"}']
          };
        }

        if (params.srcId == null || params.srcId == "") {
          params.srcId = vEvent.srcId;
        }

        var result = ews.updateVEvent(params);

        var exData = exchangeDataEwsToJcal(result);
        exData.__id = vEvent.__id;
        exData.srcType = "EWS";
        exData.srcUrl = accessInfo.srcUrl;
        exData.srcAccountName = accessInfo.id;

        personalEntityAccessor.update(exData.__id, exData, "*");

      } else { // e.g. Google
        // srcType is not EWS.
        // not supported now!
        return {
          status : 400,
          headers : {"Content-Type":"application/json"},
          body: ['{"error": "Required srcType is not supported."}']
        };
      }

    } else if (request.method === "DELETE") {

      if (vEvent.srcType == "EWS") {
        try {
          ews = new _p.extension.Ews();
          ews.createService(accessInfo.id, accessInfo.pw);
          ews.setUrl(accessInfo.srcUrl);
        } catch (e) {
          return {
            status : 400,
            headers : {"Content-Type":"application/json"},
            body: ['{"srcType": "EWS"}']
          };
        }

        var result = ews.deleteVEvent(vEvent);

        if (result == "OK") {
          personalEntityAccessor.del(vEvent.__id);
        } else {
          return {
            status: 500,
            headers: {"Content-Type":"application/json"},
            body: [JSON.stringify({"error": "Not delete vEvent of EWS server."})]
          };
        }

      } else { // e.g. Google
        // srcType is not EWS.
        // not supported now!
        return {
          status : 400,
          headers : {"Content-Type":"application/json"},
          body: ['{"error": "Required srcType is not supported."}']
        };
      }

    } else { // POST

      if (params.srcType == "EWS") {
        try {
          ews = new _p.extension.Ews();
          ews.createService(accessInfo.id, accessInfo.pw);
          ews.setUrl(accessInfo.srcUrl);
        } catch (e) {
          return {
            status : 400,
            headers : {"Content-Type":"application/json"},
            body: ['{"srcType": "EWS"}']
          };
        }

        var result = ews.createVEvent(params);

        var exData = exchangeDataEwsToJcal(result);
        exData.srcType = "EWS";
        exData.srcUrl = accessInfo.srcUrl;
        exData.srcAccountName = accessInfo.id;
        var exist = null;
        try {
          exist = personalEntityAccessor.retrieve(exData.__id);
        } catch (e) {
          if (e.code == 404) {
            personalEntityAccessor.create(exData);
          } else {
            return {
              status : 500,
              headers : {"Content-Type":"application/json"},
              body: [JSON.stringify({"error": e.message})]
            };
          }
        }

        if (exist != null) {
          var addNum = "1";
          var loopStatus = true;
          do {
            if (exist.srcId == exData.srcId) {
              return {
                status : 400,
                headers : {"Content-Type":"application/json"},
                body: ['{"error": "A strange condition occurred."}']
              };
            } else {
              exData.__id = exist.__id + "_recur_" + addNum;
              try {
                var exist2 = personalEntityAccessor.retrieve(exData.__id);
              } catch (e) {
                if (e.code == 404) {
                  personalEntityAccessor.create(exData);
                  loopStatus = false;
                } else {
                  return {
                    status : 500,
                    headers : {"Content-Type":"application/json"},
                    body: [JSON.stringify({"error": e.message})]
                  };
                }
              }
              if (loopStatus) {
                var addNumNext = Number(addNum) + Number(1);
                addNum = String(addNumNext);
              }
            }
          } while (loopStatus);
        }
      } else { // e.g. Google
        // srcType is not EWS.
        // not supported now!
        return {
          status : 400,
          headers : {"Content-Type":"application/json"},
          body: ['{"error": "Required srcType is not supported."}']
        };
      }

    }

  } catch (e) {
      return {
        status: 500,
        headers: {"Content-Type":"application/json"},
        body: [JSON.stringify({"error": e.message})]
      };
  }

  // resを定義
  return {
      status: 200,
      headers: {"Content-Type":"application/json"},
      body : ['{"status":"OK"}']
  };
}


exchangeDataEwsToJcal = function(inData) {

  var uxtDtstart = Date.parse(new Date(inData.Start));
  dtstart = "/Date(" + uxtDtstart + ")/";
  var uxtDtend = Date.parse(new Date(inData.End));
  dtend = "/Date(" + uxtDtend + ")/";
  var uxtUpdated = Date.parse(new Date(inData.Updated));
  updated = "/Date(" + uxtUpdated + ")/";

  var attendees = [];
  attendees = inData.Attendees.split(",");

  return {
    __id: inData.ICalUid,
    srcUrl: null,
    srcType: null,
    srcUpdated: updated,
    srcId: inData.Uid,
    dtstart: dtstart,
    dtend: dtend,
    summary: inData.Subject,
    description: inData.Body,
    location: inData.Location,
    organizer: inData.Organizer,
    attendees: attendees
  };
}
