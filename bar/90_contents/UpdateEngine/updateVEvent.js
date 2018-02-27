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

  var calendarUrl = "https://www.googleapis.com/calendar/v3/calendars/";

  var params = _p.util.queryParse(bodyAsString);

  try {
    var personalBoxAccessor = _p.as("client").cell(pjvm.getCellName()).box(pjvm.getBoxName());
    var personalCollectionAccessor = personalBoxAccessor.odata(collectionName);
    var personalEntityAccessor = personalCollectionAccessor.entitySet(entityType);

    var vEvent = null;
    var accessInfo = {};

    var info = personalBoxAccessor.getString(pathDavName);
    var accInfo = JSON.parse(info);

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
      accessInfo = getAccessInfo(accInfo, vEvent);
    } else { // POST
      accessInfo = getAccessInfo(accInfo, params);
    }


    if (request.method === "PUT") {

      if (vEvent.srcType == "EWS") {
        try {
          ews = new _p.extension.Ews();
          ews.createService(accessInfo.srcAccountName, accessInfo.pw);
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
        exData.srcAccountName = accessInfo.srcAccountName;

        personalEntityAccessor.update(exData.__id, exData, "*");
      } else if(vEvent.srcType == "Google"){
        var accessToken = null;
        var host = null;
        var port = null;
        var user = null;
        var pass = null;
        var calendarId = null;
        var NO_CONTENT = 204;
        // get setting data
        host = accessInfo.host;
        port = accessInfo.port;
        user = accessInfo.user;
        pass = accessInfo.pass;
        accessToken = accessInfo.accesstoken;
        calendarId = accessInfo.calendarid;

        if (params.srcId == null || params.srcId == "") {
          params.srcId = vEvent.srcId;
        }

        try{
          var httpClient = new _p.extension.HttpClient();
          httpClient.setProxy(host, Number(port), user, pass);
          var body = "";
          var headers = {'Authorization': 'Bearer ' + accessToken};
          var contentType = "application/json";
          var url = calendarUrl + calendarId + "/events" + "/" + params.__id;

          // params to Json
          body = toGoogleEvent(params);


          var response = httpClient.putParam(url, headers, contentType, body);
          if(null == response){
            // access token expire
            // TODO:get accessToken
            // retry
            headers = {'Authorization': 'Bearer ' + accessToken};
            response = httpClient.put(url, headers, contentType, body);
          }
        }catch(e){
          return {
            status : 400,
            headers : {"Content-Type":"application/json"},
            body: ['{"srcType": "Google"}']
          };
        }

        var item = JSON.parse(response.body);

        var exData = parseGoogleEvent(item);
        exData.__id = vEvent.__id;
        exData.srcType = "Google";
        exData.srcUrl = "";
        exData.srcAccountName = accessInfo.srcAccountName;

        personalEntityAccessor.update(exData.__id, exData, "*");
      } else if(vEvent.srcType == "Google"){
        var accessToken = null;
        var host = null;
        var port = null;
        var user = null;
        var pass = null;
        var calendarId = null;
        var NO_CONTENT = 204;
        // get setting data
        for(var i = 0; i < accessInfo.length; i++){
          if (accessInfo[i].srcType == "Google") {
            host = accessInfo[i].host;
            port = accessInfo[i].port;
            user = accessInfo[i].user;
            pass = accessInfo[i].pass;
            accessToken = accessInfo[i].accesstoken;
            calendarId = accessInfo[i].calendarid;
          }
        }

        if (params.srcId == null || params.srcId == "") {
          params.srcId = vEvent.srcId;
        }

        var httpClient = new _p.extension.HttpClient();
        httpClient.setProxy(host, Number(port), user, pass);
        var body = "";
        var headers = {'Authorization': 'Bearer ' + accessToken};
        var contentType = "application/json";
        var url = "https://www.googleapis.com/calendar/v3/calendars/" + calendarId + "/events" + "/" + params.__id;

        // params to Json
        body = toGoogleEvent(params);


        var response = httpClient.put(url, headers, contentType, body);
        if(null == response){
          // access token expire
          // TODO:get accessToken
          // retry
          headers = {'Authorization': 'Bearer ' + accessToken};
          response = httpClient.put(url, headers, contentType, body);
        }

        var item = JSON.parse(response.body);

        var exData = parseGoogleEvent(item);
        exData.__id = vEvent.__id;
        exData.srcType = "Google";
        exData.srcUrl = "";
        exData.srcAccountName = calendarId;

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
          ews.createService(accessInfo.srcAccountName, accessInfo.pw);
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
      } else if(vEvent.srcType == "Google"){
        var accessToken = null;
        var host = null;
        var port = null;
        var user = null;
        var pass = null;
        var calendarId = null;
        var NO_CONTENT = 204;
        // get setting data
        host = accessInfo.host;
        port = accessInfo.port;
        user = accessInfo.user;
        pass = accessInfo.pass;
        accessToken = accessInfo.accesstoken;
        calendarId = accessInfo.calendarid;

        try{
          var httpClient = new _p.extension.HttpClient();
          httpClient.setProxy(host, Number(port), user, pass);
          var headers = {'Authorization': 'Bearer ' + accessToken};
          var response = { status: "", headers : {}, body :"" };
          var url = calendarUrl + calendarId + "/events" + "/" + vEvent.__id;

          // delete execute
          response = httpClient.delete(url, headers);
          if(null == response){
            // access token expire
            // TODO:get accessToken
            // retry
            headers = {'Authorization': 'Bearer ' + accessToken};
            response = httpClient.delete(url, headers);
          }
        }catch(e){
          return {
            status : 400,
            headers : {"Content-Type":"application/json"},
            body: ['{"srcType": "Google"}']
          };
        }

        if(response){
          var status = JSON.parse(response.status);
          if(NO_CONTENT == status){
            personalEntityAccessor.del(vEvent.__id);
          } else {
            return {
              status: 500,
              headers: {"Content-Type":"application/json"},
              body: [JSON.stringify({"error": "Not delete vEvent of Google server."})]
            };
          }
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
          ews.createService(accessInfo.srcAccountName, accessInfo.pw);
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
        exData.srcAccountName = accessInfo.srcAccountName;
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
      } else if(params.srcType == "Google"){
        var accessToken = null;
        var host = null;
        var port = null;
        var user = null;
        var pass = null;
        var calendarId = null;
        var refreshToken = null;
        // get setting data
        host = accessInfo.host;
        port = accessInfo.port;
        user = accessInfo.user;
        pass = accessInfo.pass;
        accessToken = accessInfo.accesstoken;
        refreshToken = accessInfo.refreshtoken;
        calendarId = accessInfo.calendarid;

        try {
          var URL = calendarUrl + calendarId + "/events";
          var body = "";
          var headers = {'Authorization': 'Bearer ' + accessToken};
          var contentType = "application/json";
          var httpClient = new _p.extension.HttpClient();
          httpClient.setProxy(host, Number(port), user, pass);

          // params to json
          body = toGoogleEvent(params);

          // post execute
          var response = { status: "", headers : {}, body :"" };
          response = httpClient.postParam(URL, headers, contentType, body);

          if(null == response){
            // access token expire
            // TODO: get new access token
            // retry
            headers = {'Authorization': 'Bearer ' + accessToken};
            response = httpClient.postParam(URL, headers, contentType, body);
          }


        }catch(e){
          return {
            status : 400,
            headers : {"Content-Type":"application/json"},
            body: ['{"srcType": "Google"}']
          };
        }

        // register
        // parse calendar -> json
        var item = JSON.parse(response.body);
        var exData = {};

        // parse
        exData = parseGoogleEvent(item);

        exData.srcType = "Google";
        exData.srcUrl = "";
        exData.srcAccountName = accessInfo.srcAccountName;
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

        if (exist) {
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

//yyyy-MM-ddTHH:mm:ss+09:00 -> yyyy/MM/dd HH:mm:ss
function toUTC(str){
  var split = str.split("+");
  var repl = split[0].replace("T"," ");
  repl = repl.replace(/-/g, "/");
  var newdate = Date.parse(new Date(repl));
  return newdate;
}

function parseGoogleEvent(item){

  var result = {};
  result.__id = item.id;
  result.srcId = item.id;

  var newdate = toUTC(item.start.dateTime);
  result.uxtDtstart = newdate;
  result.dtstart = "/Date(" + newdate + ")/";

  newdate = toUTC(item.end.dateTime);
  result.uxtDtend = newdate;
  result.dtend = "/Date(" + newdate + ")/";

  newdate = Date.parse(new Date(item.updated));
  result.uxtUpdated = newdate;
  result.srcUpdated = "/Date(" + newdate + ")/";

  result.summary = item.summary;
  result.description = item.description;
  result.location = item.location;
  result.organizer = item.organizer.email;

  if(item.attendees){
    var list = [];
    for(var j = 0; j < item.attendees.length; j++){
      list.push(item.attendees[j].email);
    }
    result.attendees = list;
  }

  return result;
}

function toGoogleEvent(params){

  var result = {};
  result.start = {};
  result.end = {};
  result.updated = {};
  result.organizer = {};

  // require dataTime:yyyy-MM-ddTHH:mm:ss.SSSZ
  var date = {"dateTime": params.dtstart}
  result.start = date;

  var date = {"dateTime": params.dtend}
  result.end = date;

  // result.updated = params.Updated;
  result.summary = params.summary;
  result.description = params.description;
  result.location = params.location;

  var org = {"email":params.organizer}
  result.organizer = org;

  if(params.attendees){
    var list = [];
    for(var j = 0; j < params.attendees.length; j++){
      list.push(params.attendees[j].email);
    }
    result.attendees = list;
  }

  return JSON.stringify(result);
}

function getAccessInfo(accInfo, temp){
  var accessInfo = {};
  for (var i = 0; i < accInfo.length; i++) {
    if (accInfo[i].srcType == temp.srcType && accInfo[i].srcAccountName == temp.srcAccountName) {
      accessInfo = accInfo[i];
      break;
    }
  }
  return accessInfo;
}
