/*
 * Add/Update/Delete an AccessInfo entry (array item in the AccessInfo.json file)
 * ADD
 *  1. Receive access info (srcType, srcUrl, id, pw) from request parameters
 *  2. Validate the access info by user authentication
 *  3. Read the file, add validated access info into the array and save file
 * UPDATE
 *  1. Receive access info (srcType, srcUrl, id, pw) from request parameters
 *  2. Validate the access info by user authentication
 *  3. Read the file, replace the corresponding array item with validated access info and save file
 * DELETE
 *  1. Receive srcUrl and id from request parameters
 *  2. Read the file, remove the corresponding array item and save file
 */

function(request) {
   /*
    * Add/Update/Delete an AccessInfo entry (array item in the AccessInfo.json file)
    *   HTTP Method :
    *           POST:   Add
    *           PUT:    Update
    *           DELETE: Delete
    */

  // POST, PUT, DELETE 以外は405
  if(request.method !== "POST" && request.method !== "PUT" && request.method !== "DELETE") {
    return {
      status : 405,
      headers : {"Content-Type":"application/json"},
      body : ['{"error":"method not allowed"}']
    };
  }

  var bodyAsString = null;
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


  var initMaxSyncResults = maxSyncResults = "10";
  var syncStartDate = "2017/4/1 00:00:00";  // "1970/1/1 00:00:00";
  var syncEndDate = "2018/4/1 00:00:00";  // "2100/1/1 00:00:00";

  var collectionName = "OData";
  var davName = "AccessInfo";
  var entityType = "vevent";
  var pathDavName = "AccessInfo/AccessInfo.json";

  var setInfo = _p.util.queryParse(bodyAsString);

  try {
    var personalBoxAccessor = _p.as("client").cell(pjvm.getCellName()).box(pjvm.getBoxName());
    var personalCollectionAccessor = personalBoxAccessor.odata(collectionName);
    var personalEntityAccessor = personalCollectionAccessor.entitySet(entityType);

    var accessInfo = [];
    var ews = null;
    var accessUrl = null;
    var pathDavToken = "AccessInfo/AccessInfoToken";
    var tokenStatus = null;

    if (request.method === "POST") {
      try {
        var pathDavTokenName = pathDavToken + setInfo.id + ".json";
        var tokenSet = personalBoxAccessor.getString(pathDavTokenName);
        var accessTokenSet = JSON.parse(tokenSet);
        tokenStatus = "next";
      } catch (e) {
        if (e.code == 404) {
          tokenStatus = "first";
        } else {
          return {
              status : 500,
              headers : {"Content-Type":"application/json"},
              body: [JSON.stringify({"error": "Box access error."})]
          };
        }
      }

      if (tokenStatus == "first") {
        try {
          var info = personalBoxAccessor.getString(pathDavName);
          accessInfo = JSON.parse(info);
          for(var i = 0; i < accessInfo.length; i++) {
            if (setInfo.srcType == "EWS") {
              if (setInfo.srcType == accessInfo[i].srcType && setInfo.id == accessInfo[i].id && setInfo.pw == accessInfo[i].pw) {
                return {
                  status : 400,
                  headers : {"Content-Type":"application/json"},
                  body: ['{"error": "Required paramter set is already."}']
                };
              }
            } else {
              if (setInfo.srcType == accessInfo[i].srcType && setInfo.id == accessInfo[i].id && setInfo.pw == accessInfo[i].pw && setInfo.srcUrl == accessInfo[i].srcUrl) {
                return {
                  status : 400,
                  headers : {"Content-Type":"application/json"},
                  body: ['{"error": "Required paramter set is already."}']
                };
              }
            }
          }
        } catch (e) {
          if (e.code != 404) {
            return {
              status : 500,
              headers : {"Content-Type":"application/json"},
              body: [JSON.stringify({"error": "Box access error."})]
            };
          }
        }

        if (setInfo.srcType == "EWS") {
          try {
            ews = new _p.extension.Ews();
            ews.createService(setInfo.id, setInfo.pw);
            accessUrl = ews.autodiscoverUrl(setInfo.id);
          } catch (e) {
            return {
              status : 400,
              headers : {"Content-Type":"application/json"},
              body: ['{"error": "Required paramter is not access ews server."}']
            };
          }

          setInfo.srcUrl = accessUrl;
          accessInfo.push(setInfo);
          personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accessInfo));

          var reqStart = JSON.stringify(new Date(syncStartDate));
          var reqEnd = JSON.stringify(new Date(syncEndDate));
          reqStart = reqStart.slice(1);
          reqStart = reqStart.slice(0, -1);
          reqEnd = reqEnd.slice(1);
          reqEnd = reqEnd.slice(0, -1);

          var results = ews.findAppointments(reqStart, reqEnd, maxSyncResults);

          var syncCount = 0;
          var lastDate = null;
          for(var i = 0; i < results.length; i++) {
            var exData = exchangeData(results[i]);
            exData.srcType = "EWS";
            exData.srcUrl = accessUrl;
            var exist = null;
            try {
              exist = personalEntityAccessor.retrieve(exData.__id);
            } catch (e) {
              try {
                personalEntityAccessor.create(exData);
                syncCount++;
              } catch (e) {
                return {
                  status: 500,
                  headers: { "Content-Type": "text/html" },
                  body: ["Server Error : " + collectionName +" creating : " + e]
                };
              }
            }
            if (exist != null) {
              if (Number(exist.srcUpdated.match(/\d+/)) < Number(exData.srcUpdated.match(/\d+/))) {
                personalEntityAccessor.update(exData.__id, exData, "*");
                syncCount++;
              }
            }
            lastDate = results[i].Start;
          }
          var nextStatus = false;
          if (results.length == Number(maxSyncResults)) {
            setInfo.nextStart = lastDate;
            if (syncCount == 0) {
              maxSyncResults += initMaxSyncResults;
            }
            nextStatus = true;
          }
          setInfo.maxSyncResults = maxSyncResults;

          personalBoxAccessor.put(pathDavTokenName, "application/json", JSON.stringify(setInfo));

          if (nextStatus) {
            return {
                status: 200,
                headers: {"Content-Type":"application/json"},
                body : ['{"syncCompleted" : false}']
            };
          } else {
            return {
                status: 200,
                headers: {"Content-Type":"application/json"},
                body : ['{"syncCompleted" : true}']
            };
          }
        } else {
          // srcType is not EWS.
          // not supported now!
          return {
            status : 400,
            headers : {"Content-Type":"application/json"},
            body: ['{"error": "Required srcType is not supported."}']
          };
        }

      } else {  // tokenStatus = "next";
        if (accessTokenSet.nextStart == null) {
          return {
            status : 400,
            headers : {"Content-Type":"application/json"},
            body: ['{"error": "First sync calendar data is finished."}']
          };
        }
        if (setInfo.srcType == "EWS") {
          if (setInfo.srcType != accessTokenSet.srcType || setInfo.id != accessTokenSet.id || setInfo.pw != accessTokenSet.pw) {
            return {
              status : 400,
              headers : {"Content-Type":"application/json"},
              body: ['{"error": "Required paramter set is wrong."}']
            };
          }
        } else {
          if (setInfo.srcType != accessTokenSet.srcType || setInfo.id != accessTokenSet.id || setInfo.pw != accessTokenSet.pw || setInfo.srcUrl != accessTokenSet.srcUrl) {
            return {
              status : 400,
              headers : {"Content-Type":"application/json"},
              body: ['{"error": "Required paramter set is wrong."}']
            };
          }
        }

        if (setInfo.srcType == "EWS") {
          try {
            ews = new _p.extension.Ews();
            ews.createService(setInfo.id, setInfo.pw);
            ews.setUrl(accessTokenSet.srcUrl);
          } catch (e) {
            return {
              status : 400,
              headers : {"Content-Type":"application/json"},
              body: ['{"error": "Required paramter is not access ews server."}']
            };
          }

          var reqStart = accessTokenSet.nextStart;
          var reqEnd = JSON.stringify(new Date(syncEndDate));
          reqEnd = reqEnd.slice(1);
          reqEnd = reqEnd.slice(0, -1);
          maxSyncResults = accessTokenSet.maxSyncResults;

          var results = ews.findAppointments(reqStart, reqEnd, maxSyncResults);

          var syncCount = 0;
          var lastDate = null;
          for(var i = 0; i < results.length; i++) {
            var exData = exchangeData(results[i]);
            exData.srcType = "EWS";
            exData.srcUrl = accessTokenSet.srcUrl;
            var exist = null;
            try {
              exist = personalEntityAccessor.retrieve(exData.__id);
            } catch (e) {
              try {
                personalEntityAccessor.create(exData);
                syncCount++;
              } catch (e) {
                return {
                  status: 500,
                  headers: { "Content-Type": "text/html" },
                  body: ["Server Error : " + collectionName +" creating : " + e]
                };
              }
            }
            if (exist != null) {
              if (Number(exist.srcUpdated.match(/\d+/)) < Number(exData.srcUpdated.match(/\d+/))) {
                personalEntityAccessor.update(exData.__id, exData, "*");
                syncCount++;
              }
            }
            lastDate = results[i].Start;
          }

          if (results.length == Number(maxSyncResults)) {
            accessTokenSet.nextStart = lastDate;
            var nextStatus = true;
            if (syncCount == 0) {
              var nextMax = Number(maxSyncResults) + Number(initMaxSyncResults);
              accessTokenSet.maxSyncResults = String(nextMax);
            } else {
              accessTokenSet.maxSyncResults = initMaxSyncResults;
            }
          } else {
           accessTokenSet.nextStart = null;
           accessTokenSet.maxSyncResults = initMaxSyncResults;
           var nextStatus = false;
          }

          personalBoxAccessor.put(pathDavTokenName, "application/json", JSON.stringify(accessTokenSet));

          if (nextStatus) {
            return {
                status: 200,
                headers: {"Content-Type":"application/json"},
                body : ['{"syncCompleted" : false}']
            };
          } else {
            return {
                status: 200,
                headers: {"Content-Type":"application/json"},
                body : ['{"syncCompleted" : true}']
            };
          }
        } else {
          // srcType is not EWS.
          // not supported now!
          return {
            status : 400,
            headers : {"Content-Type":"application/json"},
            body: ['{"error": "Required srcType is not supported."}']
          };
        }
      }

    } else if (request.method === "PUT") {
      try {
        var info = personalBoxAccessor.getString(pathDavName);
        accessInfo = JSON.parse(info);
        for(var i = 0; i < accessInfo.length; i++) {
          if (setInfo.srcType == "EWS") {
            if (setInfo.srcType == accessInfo[i].srcType && setInfo.id == accessInfo[i].id && setInfo.pw != accessInfo[i].pw) {
              try {
                ews = new _p.extension.Ews();
                ews.createService(setInfo.id, setInfo.pw);
                accessUrl = ews.autodiscoverUrl(setInfo.id);
              } catch (e) {
                return {
                  status : 400,
                  headers : {"Content-Type":"application/json"},
                  body: ['{"error": "Required paramter is not access ews server."}']
                };
              }
              accessInfo[i].srcUrl = accessUrl;
              accessInfo[i].pw = setInfo.pw;
              personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accessInfo));
            } else if (setInfo.srcType == accessInfo[i].srcType && setInfo.id == accessInfo[i].id && setInfo.pw == accessInfo[i].pw) {
              return {
                status : 400,
                headers : {"Content-Type":"application/json"},
                body: ['{"error": "Required paramter set is not change."}']
              };
            } else {
              return {
                status : 400,
                headers : {"Content-Type":"application/json"},
                body: ['{"error": "Required paramter set is incorrect."}']
              };
            }
          } else {
            if (setInfo.srcType == accessInfo[i].srcType && setInfo.id == accessInfo[i].id && setInfo.pw == accessInfo[i].pw && setInfo.srcUrl == accessInfo[i].srcUrl) {
              return {
                status : 400,
                headers : {"Content-Type":"application/json"},
                body: ['{"error": "Required paramter set is not change."}']
              };
            //} else if () {
            } else {
              // srcType is not EWS.
              // not supported now!
              return {
                status : 400,
                headers : {"Content-Type":"application/json"},
                body: ['{"error": "Required srcType is not supported."}']
              };
            }
          }
        }
      } catch (e) {
        return {
          status : e.code,
          headers : {"Content-Type":"application/json"},
          body: [JSON.stringify({"code": e.code, "message": e.message})]
        };
      }

    } else { // DELETE
      try {
        var pathDavTokenName = pathDavToken + setInfo.id + ".json";
        var tokenSet = personalBoxAccessor.del(pathDavTokenName);
      } catch (e) {
        // No pathData is OK.
      }

      var delNum = null;
      try {
        var info = personalBoxAccessor.getString(pathDavName);
        accessInfo = JSON.parse(info);
        for(var i = 0; i < accessInfo.length; i++) {
          if (setInfo.srcUrl) {
            if (setInfo.id == accessInfo[i].id && setInfo.srcUrl == accessInfo[i].srcUrl) {
              delNum = i;
            }
          } else {
            if (setInfo.id == accessInfo[i].id) {
              delNum = i;
            }
          }
        }
      } catch (e) {
        return {
          status : e.code,
          headers : {"Content-Type":"application/json"},
          body: [JSON.stringify({"code": e.code, "message": e.message})]
        };
      }
      if (delNum != null) {
        accessInfo.splice(delNum, 1);
        personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accessInfo));
      } else {
        return {
          status : 400,
          headers : {"Content-Type":"application/json"},
          body: [JSON.stringify({"error": "Required id(" + setInfo.id + ") not exist."})]
        };
      }
    }
  } catch (e) {
      return {
        status: 500,
        headers: { "Content-Type": "text/html" },
        body: ["Server Error occurred. 01 : " + e]
      };
  }

  // resを定義
  return {
      status: 200,
      headers: {"Content-Type":"application/json"},
      body : ['{"status":"OK"}']
  };
}


exchangeData = function(inData) {

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
