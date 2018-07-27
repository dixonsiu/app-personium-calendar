/*
 * Create / Update / Delete a single VEvent, reflecting the result to the source service.
 *   HTTP Method :
 *           POST:   Create
 *           PUT:    Update
 *           DELETE: Delete
 *
 *   HTTP Request Body :  JSON with following parameters
 *           DELETE
 *            must key and value
 *              __id : OData id
 *           CREATE
 *            must key and value
 *              srcType : Google / Office365 / EWS
 *              srcAccountName : calendar service account name
 *              dtstart: start time
 *              dtend: end time
 *            Option(caution point)
 *              attendees: array of attendees account name    // e.g. ['hoge@xxx.com', 'hogehoge@xxx.com']
 *           UPDATE
 *            must key and value
 *              __id : OData id
 *              dtstart: start time
 *              dtend: end time
 *            must key
 *              summary:
 *              location:
 *              description:
 *              attendees: array of attendees account name    // e.g. ['hoge@xxx.com', 'hogehoge@xxx.com']
 *
 */

function(request){

  // It return 405 except for POST, PUT, DELETE.
  if(request.method !== "POST" && request.method !== "PUT" && request.method !== "DELETE") {
    return createResponse(405, {"error": "method not allowed"})
  }

  if(request.method === "POST" || request.method === "PUT") {
    bodyAsString = request.input.readAll();
  } else {
    bodyAsString = request.queryString;
    }
  if (bodyAsString === "") {
    return createResponse(400, {"error": "required parameter not exist."})
  }

  var collectionName = "OData";
  var davName = "AccessInfo";
  var entityType = "vevent";
  var pathDavName = "AccessInfo/AccessInfo.json";

  var calendarUrl = "https://www.googleapis.com/calendar/v3/calendars/";
  var outlookUrl = "https://outlook.office.com/api/v2.0/me/events";
  //var graphUrl = "https://graph.microsoft.com/v1.0/me/events";
  // In the future, office365Url changes from outlookUrl to graphUrl after Data Synchronization adds.
  var office365Url = outlookUrl;

  var params = _p.util.queryParse(bodyAsString);
  var returnParam = null;

  try {
    var personalBoxAccessor = _p.as("client").cell(pjvm.getCellName()).box(pjvm.getBoxName());
    var personalCollectionAccessor = personalBoxAccessor.odata(collectionName);
    var personalEntityAccessor = personalCollectionAccessor.entitySet(entityType);

    var vEvent = null;
    var accessInfo = {};

    var info = personalBoxAccessor.getString(pathDavName);
    var accInfo = JSON.parse(info);

    var check = checkParams(request, params);
    if (check){
      return createResponse(400, {"error": "missing required(" + check + ") parameter." })
    }

    if (request.method === "PUT" || request.method === "DELETE") {
      try {
        vEvent = personalEntityAccessor.retrieve(params.__id);
      } catch (e) {
        return createResponse(e.code, {"error": "no such __id"})
      }
      accessInfo = getAccessInfo(accInfo, vEvent);
    } else { // POST
      accessInfo = getAccessInfo(accInfo, params);
      if(params.srcType != "Personium" && !accessInfo.srcAccountName){
        return createResponse(400, {"error": "no such srcType or srcAccountName" })
      }
    }

    if (request.method === "PUT") {

      if (vEvent.srcType == "EWS") {
        try {
          ews = new _p.extension.Ews();
          ews.createService(accessInfo.srcAccountName, accessInfo.pw);
          ews.setUrl(accessInfo.srcUrl);
        } catch (e) {
          return createResponse(400, {"srcType": "EWS"})
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
        returnParam = personalEntityAccessor.retrieve(exData.__id);
      } else if(vEvent.srcType == "Google"){
        var accessToken = null;
        var refreshToken = null;
        var calendarId = null;
        // get setting data
        accessToken = accessInfo.accessToken;
        refreshToken = accessInfo.refreshToken;
        calendarId = accessInfo.calendarId;

        if (params.srcId == null || params.srcId == "") {
          params.srcId = vEvent.srcId;
        }

        try{
          var httpClient = new _p.extension.HttpClient();
          var body = "";
          var headers = {'Authorization': 'Bearer ' + accessToken};
          var contentType = "application/json";
          var url = calendarUrl + calendarId + "/events" + "/" + params.__id;

          // params to Json
          body = googleCal.params2Event(params);

          var response = { status: "", headers : {}, body :"" };
          response = httpClient.patch(url, headers, contentType, body);

          if(null == response || response.status == 401){
            // access token expire
            var tempData = {"refresh_token": refreshToken , "srcType": "Google"}
            accessToken = getAccessToken(tempData);
            // retry
            headers = {'Authorization': 'Bearer ' + accessToken};
            response = httpClient.patch(url, headers, contentType, body);
            if (response == null || response.status == 401) {
              return createResponse(400, {"error": "refresh token is wrong"})
            }

            // save accessToken
            for (var i = 0; i < accInfo.length; i++){
              if(accInfo[i].srcType == accessInfo.srcType && accInfo[i].srcAccountName == accessInfo.srcAccountName){
                accInfo[i].accessToken = accessToken;
              }
            }
            personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accInfo));
          }
        }catch(e){
          return createResponse(400, {"srcType": "Google"})
        }

        if (null == response || response.status != 200){
          return createResponse(400, {"error": response.body})
        }

        var item = JSON.parse(response.body);

        var exData = googleCal.parseEvent(item);
        exData.__id = vEvent.__id;
        exData.srcType = "Google";
        exData.srcUrl = "";
        exData.srcAccountName = accessInfo.srcAccountName;

        personalEntityAccessor.update(exData.__id, exData, "*");
        returnParam = personalEntityAccessor.retrieve(exData.__id);

      } else if(vEvent.srcType == "Office365"){
        var accessToken = null;
        var refreshToken = null;
        var calendarId = null;
        // get setting data
        accessToken = accessInfo.accessToken;
        refreshToken = accessInfo.refreshToken;
        calendarId = accessInfo.calendarId;

        if (params.srcId == null || params.srcId == "") {
          params.srcId = vEvent.srcId;
        }

        try{
          var httpClient = new _p.extension.HttpClient();
          var body = "";
          var headers = {'Authorization': 'Bearer ' + accessToken,
                         'Prefer': 'outlook.body-content-type="text"'};
          var contentType = "application/json";
          var url = office365Url + "/" + params.__id;

          // params to Json
          body = outlookCal.params2Event(params);

          var response = { status: "", headers : {}, body :"" };
          response = httpClient.patch(url, headers, contentType, body);

          if(null == response || response.status == 401){
            // access token expire
            var tempData = {"refresh_token": refreshToken , "srcType": "Office365"}
            accessToken = getAccessToken(tempData);
            // retry
            headers.Authorization = 'Bearer ' + accessToken;
            response = httpClient.patch(url, headers, contentType, body);
            if (response == null || response.status == 401) {
              return createResponse(400, {"error": "refresh token is wrong"})
            }

            // save accessToken
            for (var i = 0; i < accInfo.length; i++){
              if(accInfo[i].srcType == accessInfo.srcType && accInfo[i].srcAccountName == accessInfo.srcAccountName){
                accInfo[i].accessToken = accessToken;
              }
            }
            personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accInfo));
          }
        }catch(e){
          return createResponse(400, {"srcType": "Office365"})
        }

        if (null == response || response.status != 200){
          return createResponse(400, {"error": response.body})
        }

        var item = JSON.parse(response.body);

        var exData = outlookCal.parseEvent(item);
        exData.__id = vEvent.__id;
        exData.srcType = "Office365";
        exData.srcUrl = "";
        exData.srcAccountName = accessInfo.srcAccountName;

        personalEntityAccessor.update(exData.__id, exData, "*");
        returnParam = personalEntityAccessor.retrieve(exData.__id);
      } else { // Personium only
        params.dtstart = pCal.toPersoniumDatetimeFormat(params.dtstart);
        params.dtend = pCal.toPersoniumDatetimeFormat(params.dtend);
        //return createResponse(200, params);
        //return createResponse(200, params.__id);
        personalEntityAccessor.update(params.__id, params, "*");
        returnParam = personalEntityAccessor.retrieve(params.__id);
      }

    } else if (request.method === "DELETE") {

      if (vEvent.srcType == "EWS") {
        try {
          ews = new _p.extension.Ews();
          ews.createService(accessInfo.srcAccountName, accessInfo.pw);
          ews.setUrl(accessInfo.srcUrl);
        } catch (e) {
          return createResponse(400, {"srcType": "EWS"})
        }

        var result = ews.deleteVEvent(vEvent);

        if (result == "OK") {
          personalEntityAccessor.del(vEvent.__id);
        } else {
          return createResponse(500, {"error": "Not delete vEvent of EWS server."})
        }
      } else if(vEvent.srcType == "Google"){
        var accessToken = null;
        var calendarId = null;
        var refreshToken = null;
        var NO_CONTENT = 204;
        // get setting data
        accessToken = accessInfo.accessToken;
        refreshToken = accessInfo.refreshToken;
        calendarId = accessInfo.calendarId;

        try{
          var httpClient = new _p.extension.HttpClient();
          var headers = {'Authorization': 'Bearer ' + accessToken};
          var response = { status: "", headers : {}, body :"" };
          var url = calendarUrl + calendarId + "/events" + "/" + vEvent.__id;

          // delete execute
          response = httpClient.delete(url, headers);
          if(null == response || response.status == 401){
            // access token expire
            var tempData = {"refresh_token": refreshToken , "srcType": "Google"}
            accessToken = getAccessToken(tempData);
            // retry
            headers = {'Authorization': 'Bearer ' + accessToken};
            response = httpClient.delete(url, headers);
            if (response == null || response.status == 401) {
              return createResponse(400, {"error": "refresh token is wrong"})
            }

            // save accessToken
            for (var i = 0; i < accInfo.length; i++){
              if(accInfo[i].srcType == accessInfo.srcType && accInfo[i].srcAccountName == accessInfo.srcAccountName){
                accInfo[i].accessToken = accessToken;
              }
            }
            personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accInfo));
          }
        }catch(e){
          return createResponse(400, {"srcType": "Google"})
        }

        if(response){
          var status = JSON.parse(response.status);
          if(NO_CONTENT == status || 404 == status || 410 == status){
            // success delete or already remove event on google calendar
            personalEntityAccessor.del(vEvent.__id);
          } else {
            return createResponse(500, {"error": "Not delete vEvent of Google server."})
          }
        }
      } else if(vEvent.srcType == "Office365"){
        var accessToken = null;
        var calendarId = null;
        var refreshToken = null;
        var NO_CONTENT = 204;
        // get setting data
        accessToken = accessInfo.accessToken;
        refreshToken = accessInfo.refreshToken;
        calendarId = accessInfo.calendarId;

        try{
          var httpClient = new _p.extension.HttpClient();
          var headers = {'Authorization': 'Bearer ' + accessToken,
                         'Prefer': 'outlook.body-content-type="text"'};
          var response = { status: "", headers : {}, body :"" };
          var url = office365Url + "/" + vEvent.__id;

          // delete execute
          response = httpClient.delete(url, headers);
          if(null == response || response.status == 401){
            // access token expire
            var tempData = {"refresh_token": refreshToken , "srcType": "Office365"}
            accessToken = getAccessToken(tempData);
            // retry
            headers.Authorization = 'Bearer ' + accessToken;
            response = httpClient.delete(url, headers);
            if (response == null || response.status == 401) {
              return createResponse(400, {"error": "refresh token is wrong"})
            }

            // save accessToken
            for (var i = 0; i < accInfo.length; i++){
              if(accInfo[i].srcType == accessInfo.srcType && accInfo[i].srcAccountName == accessInfo.srcAccountName){
                accInfo[i].accessToken = accessToken;
              }
            }
            personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accInfo));
          }
        }catch(e){
          return createResponse(400, {"srcType": "Office365"})
        }

        if(response){
          var status = JSON.parse(response.status);
          if(NO_CONTENT == status || 404 == status || 410 == status){
            // success delete or already remove event on google calendar
            personalEntityAccessor.del(vEvent.__id);
          } else {
            return createResponse(500, {"error": "Not delete vEvent of Office365 server."})
          }
        }
      } else { // Personium only
        personalEntityAccessor.del(vEvent.__id);
      }

    } else { // POST

      if (params.srcType == "EWS") {
        try {
          ews = new _p.extension.Ews();
          ews.createService(accessInfo.srcAccountName, accessInfo.pw);
          ews.setUrl(accessInfo.srcUrl);
        } catch (e) {
          return createResponse(400, {"srcType": "EWS"})
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
            returnParam = personalEntityAccessor.retrieve(exData.__id);
          } else {
            return createResponse(500, {"error": e.message})
          }
        }

        if (exist != null) {
          var addNum = "1";
          var loopStatus = true;
          do {
            if (exist.srcId == exData.srcId) {
              return createResponse(400, {"error": "A strange condition occurred."})
            } else {
              exData.__id = exist.__id + "_recur_" + addNum;
              try {
                var exist2 = personalEntityAccessor.retrieve(exData.__id);
              } catch (e) {
                if (e.code == 404) {
                  personalEntityAccessor.create(exData);
                  loopStatus = false;
                } else {
                  return createResponse(500, {"error": e.message})
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
        var calendarId = null;
        var refreshToken = null;
        // get setting data
        accessToken = accessInfo.accessToken;
        refreshToken = accessInfo.refreshToken;
        calendarId = accessInfo.calendarId;

        try {
          var URL = calendarUrl + calendarId + "/events";
          var body = "";
          var headers = {'Authorization': 'Bearer ' + accessToken};
          var contentType = "application/json";
          var httpClient = new _p.extension.HttpClient();

          // params to json
          body = googleCal.params2Event(params);

          // post execute
          var response = { status: "", headers : {}, body :"" };
          response = httpClient.post(URL, headers, contentType, body);

          if(null == response || response.status == 401){
            // access token expire
            var tempData = {"refresh_token": refreshToken , "srcType": "Google"}
            accessToken = getAccessToken(tempData);
            // retry
            headers = {'Authorization': 'Bearer ' + accessToken};
            response = httpClient.post(URL, headers, contentType, body);
            if (response == null || response.status == 401) {
              return createResponse(400, {"error": "refresh token is wrong"})
            }

            // save accessToken
            for (var i = 0; i < accInfo.length; i++){
              if(accInfo[i].srcType == accessInfo.srcType && accInfo[i].srcAccountName == accessInfo.srcAccountName){
                accInfo[i].accessToken = accessToken;
              }
            }
            personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accInfo));
          }
        }catch(e){
          return createResponse(400, {"srcType": "Google"})
        }

        if (null == response || response.status != 200){
          return createResponse(400, {"error": response.body})
        }

        // register
        // parse calendar -> json
        var item = JSON.parse(response.body);
        var exData = {};

        // parse
        exData = googleCal.parseEvent(item);

        exData.srcType = "Google";
        exData.srcUrl = "";
        exData.srcAccountName = accessInfo.srcAccountName;
        var exist = null;

        try {
          exist = personalEntityAccessor.retrieve(exData.__id);
        } catch (e) {
          if (e.code == 404) {
            personalEntityAccessor.create(exData);
            returnParam = personalEntityAccessor.retrieve(exData.__id);
          } else {
            return createResponse(500, {"error": e.message})
          }
        }
      } else if(params.srcType == "Office365"){
        var accessToken = null;
        var calendarId = null;
        var refreshToken = null;
        // get setting data
        accessToken = accessInfo.accessToken;
        refreshToken = accessInfo.refreshToken;
        calendarId = accessInfo.calendarId;

        try {
          var URL = office365Url;
          var body = "";
          var headers = {'Authorization': 'Bearer ' + accessToken,
                         'Prefer': 'outlook.body-content-type="text"'};
          var contentType = "application/json";
          var httpClient = new _p.extension.HttpClient();

          // params to json
          body = outlookCal.params2Event(params);
          // post execute
          var response = { status: "", headers : {}, body :"" };
          response = httpClient.post(URL, headers, contentType, body);

          if(null == response || response.status == 401){
            // access token expire
            var tempData = {"refresh_token": refreshToken , "srcType": "Office365"}
            accessToken = getAccessToken(tempData);
            // retry
            headers.Authorization = 'Bearer ' + accessToken;
            response = httpClient.post(URL, headers, contentType, body);
            if (response == null || response.status == 401) {
              return createResponse(400, {"error": "refresh token is wrong"})
            }

            // save accessToken
            for (var i = 0; i < accInfo.length; i++){
              if(accInfo[i].srcType == accessInfo.srcType && accInfo[i].srcAccountName == accessInfo.srcAccountName){
                accInfo[i].accessToken = accessToken;
              }
            }
            personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accInfo));
          }
        }catch(e){
          return createResponse(400, {"srcType": "Office365"})
        }

        if (null == response || response.status != 201){
          return createResponse(400, {"error": response.body})
        }

        // register
        // parse calendar -> json
        var item = JSON.parse(response.body);
        var exData = {};

        // parse
        exData = outlookCal.parseEvent(item);

        exData.srcType = "Office365";
        exData.srcUrl = "";
        exData.srcAccountName = accessInfo.srcAccountName;
        var exist = null;

        try {
          exist = personalEntityAccessor.retrieve(exData.__id);
        } catch (e) {
          if (e.code == 404) {
            personalEntityAccessor.create(exData);
            returnParam = personalEntityAccessor.retrieve(exData.__id);
          } else {
            return createResponse(500, {"error": e.message})
          }
        }
      } else { // Personium only
        params.dtstart = pCal.toPersoniumDatetimeFormat(params.dtstart);
        params.dtend = pCal.toPersoniumDatetimeFormat(params.dtend);
        //return createResponse(200, params);
        returnParam = personalEntityAccessor.create(params);
        //returnParam = personalEntityAccessor.retrieve(exData.__id);
      }

    }

  } catch (e) {
      return createResponse(500, {"error": e.message})
  }

  if (request.method == "POST" || request.method == "PUT"){
    return createResponse(200, returnParam)

  } else{
    return createResponse(204, [])
  }
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

function createResponse(tempCode, tempBody) {
    var isString = typeof tempBody == "string";
    var tempHeaders = isString ? {"Content-Type":"text/plain"} : {"Content-Type":"application/json"};
    return {
        status: tempCode,
        headers: tempHeaders,
        body: [isString ? tempBody : JSON.stringify(tempBody)]
    };
}

function getAccessToken(bodyData) {
  try {
    var httpClient = new _p.extension.HttpClient();
    var body = "";
    var headers = {'Accept': 'text/plain'};
    var contentType = "application/json";

    var url = "https://demo.personium.io/app-personium-calendar/__/Engine/oauth2callback"
    var body = JSON.stringify(bodyData)
    var headers = {}
    var response = httpClient.put(url, headers, contentType, body)
    if (response == null || response.status != 200) {
      return {
        status : response.status,
        headers : {"Content-Type":"application/json"},
        body : ['{"error": {"status":' + response.body + ', "message": "API call failed."}}']
      };
    }
  } catch (e) {
    return createResponse(400, e.message)
  }
  var res = JSON.parse(response.body);
  return res.access_token;
}

function checkParams(request, params){
  if(request.method == "POST"){
    if(!params.srcType){
      return "srcType";
    }
    if (!params.srcAccountName){
      return "srcAccountName";
    }
    if(!params.dtstart){
      return "dtstart";
    }
    if(!params.dtend){
      return "dtend";
    }
    return null;
  } else if (request.method == "PUT"){
    if(!params.__id){
      return "__id";
    }
    if(!params.dtstart){
      return "dtstart";
    }
    if(!params.dtend){
      return "dtend";
    }
    if(!("summary" in params)){
      return "summary";
    }
    if(!("location" in params)){
      return "location";
    }
    if(!("description" in params)){
      return "description";
    }
    return null;
  } else {
    // delete
    if(!params.__id){
      return "__id";
    }
    return null;
  }
}

var pCal = require("personium_cal").personiumCal;
var googleCal = require("google_cal").googleCal;
var outlookCal = require("outlook_cal").outlookCal;
