/*
 * Add/Update/Delete an AccessInfo entry (array item in the AccessInfo.json file)
 * ADD
 *  1. Receive access info (srcType, srcUrl, srcAccountName, pw) from request parameters
 *  2. Validate the access info by user authentication
 *  3. Read the file, add validated access info into the array and save file
 * UPDATE
 *  1. Receive access info (srcType, srcUrl, srcAccountName, pw) from request parameters
 *  2. Validate the access info by user authentication
 *  3. Read the file, replace the corresponding array item with validated access info and save file
 * DELETE
 *  1. Receive srcUrl and srcAccountName from request parameters
 *  2. Read the file, remove the corresponding array item and save file
 */

function(request) {
  /*
   * Add/Update/Delete an AccessInfo entry (array item in the AccessInfo.json file)
   *   HTTP Method :
   *           POST:   Add
   *           PUT:    Update
   *           DELETE: Delete
   *           GET:    Get AccessInfo.json
   */

  // POST, PUT, DELETE, GET 以外は405
  if(request.method !== "POST" && request.method !== "PUT" && request.method !== "DELETE" && request.method !== "GET") {
    return createResponse(405, {"error": "method not allowed"})
  }

  var bodyAsString = "";
  if(request.method === "POST" || request.method === "PUT") {
    bodyAsString = request.input.readAll();
  } else if (request.method === "DELETE") {
    bodyAsString = request.queryString;
  } else {
    bodyAsString = " ";
  }
  if (bodyAsString === "") {
    return createResponse(400, {"error": "required parameter not exist."})
  }


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
    var pathDavToken = "AccessInfo/AccessToken";
    var tokenStatus = null;

    if (request.method === "POST") {

      try {
        var info = personalBoxAccessor.getString(pathDavName);
        accessInfo = JSON.parse(info);
        for(var i = 0; i < accessInfo.length; i++) {
          if (setInfo.srcType == "EWS") {
            if (setInfo.srcType == accessInfo[i].srcType && setInfo.srcAccountName == accessInfo[i].srcAccountName && setInfo.pw == accessInfo[i].pw) {
              return createResponse(400, {"error": "required parameter set is already."})
            }
          } else if (setInfo.srcType == "Google") {
            if(setInfo.srcType == accessInfo[i].srcType && setInfo.srcAccountName == accessInfo[i].srcAccountName){
              return createResponse(400, {"error": "required parameter set is already."})
            }
          } else {
            if (setInfo.srcType == accessInfo[i].srcType && setInfo.srcAccountName == accessInfo[i].srcAccountName && setInfo.pw == accessInfo[i].pw && setInfo.srcUrl == accessInfo[i].srcUrl) {
              return createResponse(400, {"error": "required parameter set is already."})
            }
          }
        }
      } catch (e) {
        if (e.code != 404) {
          return createResponse(500, {"error": "Box access error."})
        }
      }

      if (setInfo.srcType == "EWS") {
        try {
          ews = new _p.extension.Ews();
          ews.createService(setInfo.srcAccountName, setInfo.pw);
          setInfo.srcUrl = ews.autodiscoverUrl(setInfo.srcAccountName);
        } catch (e) {
          return createResponse(400, {"error": "Required paramter is not access ews server."})
        }

        accessInfo.push(setInfo);
        personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accessInfo));

        try {
          var pathDavTokenName = pathDavToken + setInfo.srcAccountName + ".json";
          var tokenSet = personalBoxAccessor.getString(pathDavTokenName);

          return createResponse(500, {"error": "Required paramter set is already."})

        } catch (e) {
          if (e.code != 404) {
            return createResponse(500, {"error": "Box access error."})
          }
        }

        setInfo.syncType = "FIRST";
        setInfo.nextStart = null;
        setInfo.maxSyncResults = null;

        personalBoxAccessor.put(pathDavTokenName, "application/json", JSON.stringify(setInfo));

      } else if (setInfo.srcType == "Google"){
        var accessToken = setInfo.accessToken;
        var refreshToken = setInfo.refreshToken;
        var srcAccountName = setInfo.srcAccountName;
        if (!accessToken || !refreshToken || !srcAccountName){
          return createResponse(400, {"error": "Required paramter is not access google server."})
        }

        // check connect server
        try {
          var url = "https://www.googleapis.com/calendar/v3/users/me/calendarList";
          var httpClient = new _p.extension.HttpClient();
          var headers = {'Authorization': 'Bearer ' + accessToken};
          var response = { status: "", headers : {}, body :"" };

          response = httpClient.get(url, headers);
          
          if(200 != response.status){
            return createResponse(400, {"error": "Required paramter is not access google server."})
          }
          var responsejson = JSON.parse(response.body);
          var items = [];
          items = responsejson["items"];

          var calendarId = parseGoogleCalendarList(items);
          
          if(calendarId == null){
            return createResponse(400, {"error": "Required paramter is not access google server."})
          }
        } catch (e) {
          return createResponse(400, {"error": "Required paramter is not access google server."})
        } 
        
        // add calendarId to setInfo
        setInfo.calendarId = calendarId;

        accessInfo.push(setInfo);
        personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accessInfo));

        try {
          var pathDavTokenName = pathDavToken + setInfo.srcAccountName + ".json";
          var tokenSet = personalBoxAccessor.getString(pathDavTokenName);

          return createResponse(500, {"error": "Required paramter set is already."})
        } catch (e) {
          if (e.code != 404) {
            return createResponse(500, {"error": "Box access error."})
          }
        }

        setInfo.syncType = "FIRST";
        setInfo.nextStart = null;
        setInfo.maxSyncResults = null;

        personalBoxAccessor.put(pathDavTokenName, "application/json", JSON.stringify(setInfo));

      } else { // e.g. Google
        // srcType is not EWS.
        // not supported now!
        return createResponse(400, {"error": "Required srcType is not supported."})
      }

    } else if (request.method === "PUT") {
      try {
        var info = personalBoxAccessor.getString(pathDavName);
        accessInfo = JSON.parse(info);
        for(var i = 0; i < accessInfo.length; i++) {
          if (setInfo.srcType == "EWS") {
            if (setInfo.srcType == accessInfo[i].srcType && setInfo.srcAccountName == accessInfo[i].srcAccountName && setInfo.pw != accessInfo[i].pw) {
              try {
                ews = new _p.extension.Ews();
                ews.createService(setInfo.srcAccountName, setInfo.pw);
                accessUrl = ews.autodiscoverUrl(setInfo.srcAccountName);
              } catch (e) {
                return createResponse(400, {"error": "Required paramter is not access ews server."})
              }
              accessInfo[i].srcUrl = accessUrl;
              accessInfo[i].pw = setInfo.pw;
              personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accessInfo));
            } else if (setInfo.srcType == accessInfo[i].srcType && setInfo.srcAccountName == accessInfo[i].srcAccountName && setInfo.pw == accessInfo[i].pw) {
              return createResponse(400, {"error": "Required paramter set is not change."})
            } else {
              return createResponse(400, {"error": "Required paramter set is incorrect."})
            }
          } else if (setInfo.srcType == "Google") {
            if (setInfo.srcType == accessInfo[i].srcType && setInfo.srcAccountName == accessInfo[i].srcAccountName && setInfo.refreshToken != accessInfo[i].refreshToken) {
              try {
                //TODO:check if the refreshToken is correct.
              } catch (e) {
                return createResponse(400, {"error": "Required paramter is not access Google server."})
              }
              accessInfo[i].refreshToken = setInfo.refreshToken;
              personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accessInfo));
            } else if (setInfo.srcType == accessInfo[i].srcType && setInfo.srcAccountName == accessInfo[i].srcAccountName && setInfo.refreshToken == accessInfo[i].refreshToken) {
              return createResponse(400, {"error": "Required paramter set is change."})
            } else {
              return createResponse(400, {"error": "Required paramter set is incorrect."})
            }
          } else {
            if (setInfo.srcType == accessInfo[i].srcType && setInfo.srcAccountName == accessInfo[i].srcAccountName && setInfo.pw == accessInfo[i].pw && setInfo.srcUrl == accessInfo[i].srcUrl) {
              return createResponse(400, {"error": "Required paramter set is not change."})
            //} else if () {
            } else { // e.g. Google
              // srcType is not EWS.
              // not supported now!
              return createResponse(400, {"error": "Required srcType is not supported."})
            }
          }
        }
      } catch (e) {
        return createResponse(500, e)
      }

    } else if (request.method === "DELETE") {
      try {
        var pathDavTokenName = pathDavToken + setInfo.srcAccountName + ".json";
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
            if (setInfo.srcAccountName == accessInfo[i].srcAccountName && setInfo.srcUrl == accessInfo[i].srcUrl) {
              delNum = i;
            }
          } else {
            if (setInfo.srcAccountName == accessInfo[i].srcAccountName) {
              delNum = i;
            }
          }
        }
      } catch (e) {
        return createResponse(500, e)
      }
      if (delNum != null) {
        accessInfo.splice(delNum, 1);
        personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accessInfo));
      } else {
        return createResponse(400, {"error": "Required srcAccountName(" + setInfo.srcAccountName + ") not exist."})
      }
    } else { //GET
      try {
        var info = personalBoxAccessor.getString(pathDavName);
        accessInfo = JSON.parse(info);

        var resultsInfo = [];
        for(var i = 0; i < accessInfo.length; i++) {
          var resultInfo = {};
          if (accessInfo[i].srcType == "EWS") {
            resultInfo.srcType = accessInfo[i].srcType;
            resultInfo.srcAccountName = accessInfo[i].srcAccountName;
          } else {
            resultInfo.srcType = accessInfo[i].srcType;
            resultInfo.srcAccountName = accessInfo[i].srcAccountName;
            resultInfo.srcUrl = accessInfo[i].srcUrl;
          }
          resultsInfo.push(resultInfo);
        }
      } catch (e) {
        if (e.code == 404) {
          return createResponse(200, [])
        } else {
          return createResponse(500, {"error": "Box access error."})
        }
      }
      return createResponse(200, resultsInfo)
    }
  } catch (e) {
      return createResponse(500, {"error": "Server Error occurred. 01 : " + e})
  }

  // resを定義
  return createResponse(200, {"status" : "OK"})
}

function parseGoogleCalendarList(items){
  for(var i = 0; i < items.length; i++){
    if(items[i].primary){ // primary only
      return items[i].id;
    }
  }
  return null;
}

function createResponse(tempCode, tempBody) {
    var isString = typeof tempBody == "string";
    var tempHeaders = isString ? {"Content-Type":"text/plain"} : {"Content-Type":"application/json"};
    return {
        status: tempCode,
        headers: tempHeaders,
        body: [isString ? tempBody : JSON.stringify(tempBody)]
    };
}
