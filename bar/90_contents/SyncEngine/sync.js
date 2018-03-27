/*
 * Create VCalendar's events from the specified server.
 *  Input:
 *     srcUrl, srcAccountName
 *     syncPeriod
 *
 */

function(request){

  // GET 以外は405
  if(request.method !== "GET") {
    return {
      status : 405,
      headers : {"Content-Type":"application/json"},
      body : ['{"error":"method not allowed"}']
    };
  }


  var initMaxSyncResults = maxSyncResults = "10";
  var syncStartDate = "2017/4/1 00:00:00";  // "1970/1/1 00:00:00";
  var syncEndDate = "2018/4/1 00:00:00";  // "2100/1/1 00:00:00";
  var diffSyncStart = "1";
  var diffSyncEnd = "2";

  var collectionName = "OData";
  var davName = "AccessInfo";
  var entityType = "vevent";
  var pathDavName = "AccessInfo/AccessInfo.json";

  var calendarUrl = "https://www.googleapis.com/calendar/v3/calendars/";

  try {
    var personalBoxAccessor = _p.as("client").cell(pjvm.getCellName()).box(pjvm.getBoxName());
    var personalCollectionAccessor = personalBoxAccessor.odata(collectionName);
    var personalEntityAccessor = personalCollectionAccessor.entitySet(entityType);

    var accessInfo = [];
    var ews = null;
    var accessUrl = null;
    var pathDavToken = "AccessInfo/AccessToken";
    var tokenStatus = null;
    var syncDavCnt = 0;

    try {
      var info = personalBoxAccessor.getString(pathDavName);
      accessInfo = JSON.parse(info);

      if (accessInfo.length == 0) {
        return {
          status : 204,
          headers : {"Content-Type":"application/json"},
          body: []
        };
      }

    } catch (e) {
      if (e.code == 404) {
        return {
          status : 204,
          headers : {"Content-Type":"application/json"},
          body: []
        };
      } else {
        return {
          status : 500,
          headers : {"Content-Type":"application/json"},
          body: [JSON.stringify({"error": e.message})]
        };
      }
    }

    var firstSync = null;
    var diffSync = null;

    for (var i = 0; i < accessInfo.length; i++) {
      try {
        var pathDavTokenName = pathDavToken + accessInfo[i].srcAccountName + ".json";
        var tokenSet = personalBoxAccessor.getString(pathDavTokenName);
        var accessTokenSet = JSON.parse(tokenSet);

        if (accessTokenSet.syncType == "FIRST") {
          firstSync = accessTokenSet.srcAccountName;
          syncDavCnt++;
        } else {
          diffSync = accessTokenSet.srcAccountName;
          syncDavCnt++;
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
    }

    if (firstSync == null && diffSync == null) {
      var nowDate = new Date();
      var syncStart = new Date();
      var syncEnd = new Date();
      syncStart.setMonth(nowDate.getMonth() - Number(diffSyncStart));
      syncEnd.setMonth(nowDate.getMonth() + Number(diffSyncEnd));

      for (var i = 0; i < accessInfo.length; i++) {
        var accessTokenSet = accessInfo[i];
        var pathDavTokenName = pathDavToken + accessTokenSet.srcAccountName + ".json";

        accessTokenSet.syncType = "DIFF";
        accessTokenSet.maxSyncResults = initMaxSyncResults;
        accessTokenSet.nextStart = JSON.stringify(syncStart);
        accessTokenSet.syncEnd = JSON.stringify(syncEnd);

        accessTokenSet.nextStart = accessTokenSet.nextStart.slice(1);
        accessTokenSet.nextStart = accessTokenSet.nextStart.slice(0, -1);
        accessTokenSet.syncEnd = accessTokenSet.syncEnd.slice(1);
        accessTokenSet.syncEnd = accessTokenSet.syncEnd.slice(0, -1);

        var uxSyncStart = Date.parse(syncStart);
        var uxSyncEnd = Date.parse(syncEnd);
        var syncFilter = "srcType eq '" + accessTokenSet.srcType + "' and dtstart ge " + uxSyncStart + " and dtstart le " + uxSyncEnd;
        var syncList = personalEntityAccessor.query().filter(syncFilter).top(1000).run();

        var checkList = [];
        for (var j = 0; j < syncList.d.results.length; j++) {
          syncList.d.results[j].srcId.slice(1);
          syncList.d.results[j].srcId.slice(0, -1);
          checkList.push(syncList.d.results[j].srcId);
        }
        accessTokenSet.checkList = checkList;

        personalBoxAccessor.put(pathDavTokenName, "application/json", JSON.stringify(accessTokenSet));

      }
      return {
          status: 200,
          headers: {"Content-Type":"application/json"},
          body : ['{"syncCompleted" : false}']
      };

    } else if (firstSync != null) {

      var pathDavTokenName = pathDavToken + firstSync + ".json";
      var tokenSet = personalBoxAccessor.getString(pathDavTokenName);
      var accessTokenSet = JSON.parse(tokenSet);

      if (accessTokenSet.srcType == "EWS") {
        try {
          ews = new _p.extension.Ews();
          ews.createService(accessTokenSet.srcAccountName, accessTokenSet.pw);
          ews.setUrl(accessTokenSet.srcUrl);
        } catch (e) {
          return {
            status : 400,
            headers : {"Content-Type":"application/json"},
            body: ['{"srcType": "EWS"}']
          };
        }

        var reqStart = null;
        if (accessTokenSet.nextStart == null) {
          reqStart = JSON.stringify(new Date(syncStartDate));
          reqStart = reqStart.slice(1);
          reqStart = reqStart.slice(0, -1);
        } else {
          reqStart = accessTokenSet.nextStart;
        }
        var reqEnd = JSON.stringify(new Date(syncEndDate));
        reqEnd = reqEnd.slice(1);
        reqEnd = reqEnd.slice(0, -1);

        if (accessTokenSet.maxSyncResults == null) {
          maxSyncResults = initMaxSyncResults;
        } else {
          maxSyncResults = accessTokenSet.maxSyncResults;
        }

        var results = ews.findVEvents(reqStart, reqEnd, maxSyncResults);

        var syncCount = 0;
        var lastDate = null;
        for(var i = 0; i < results.length; i++) {
          var exData = exchangeDataEwsToJcal(results[i]);
          exData.srcType = "EWS";
          exData.srcUrl = accessTokenSet.srcUrl;
          exData.srcAccountName = accessTokenSet.srcAccountName;

          var existFilter = "srcId eq '" + exData.srcId + "'";
          var exist = personalEntityAccessor.query().filter(existFilter).run();

          if (exist.d.results.length == 0) {
            //Check whether it is recursive event or not
            var existRecur = null;
            try {
              existRecur = personalEntityAccessor.retrieve(exData.__id);
            } catch (e) {
              if (e.code == 404) {
                personalEntityAccessor.create(exData);
                syncCount++;
              } else {
                return {
                  status : 500,
                  headers : {"Content-Type":"application/json"},
                  body: [JSON.stringify({"error": e.message})]
                };
              }
            }
            if (existRecur != null) {
              var addNum = "1";
              var loopStatus = true;
              do {
                exData.__id = existRecur.__id + "_recur_" + addNum;
                try {
                  var exist2 = personalEntityAccessor.retrieve(exData.__id);
                } catch (e) {
                  if (e.code == 404) {
                    personalEntityAccessor.create(exData);
                    syncCount++;
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
              } while (loopStatus);
            }
          } else if (exist.d.results.length == 1) {
            if (Number(exist.d.results[0].srcUpdated.match(/\d+/)) < Number(exData.srcUpdated.match(/\d+/))) {
              personalEntityAccessor.update(exist.d.results[0].__id, exData, "*");
              syncCount++;
            }
          } else {
            return {
              status : 400,
              headers : {"Content-Type":"application/json"},
              body: [JSON.stringify({"error": "srcId filter is wrong."})]
            };
          }
          lastDate = results[i].Start;
        }

        var nextStatus = null;
        if (results.length == Number(maxSyncResults)) {
          accessTokenSet.nextStart = lastDate;
          nextStatus = false;
          if (syncCount == 0) {
            var nextMax = Number(maxSyncResults) + Number(initMaxSyncResults);
            accessTokenSet.maxSyncResults = String(nextMax);
          } else {
            accessTokenSet.maxSyncResults = initMaxSyncResults;
          }
          personalBoxAccessor.put(pathDavTokenName, "application/json", JSON.stringify(accessTokenSet));
        } else {
          personalBoxAccessor.del(pathDavTokenName);
          if (syncDavCnt == 1) {
            nextStatus = true;
          } else {
            nextStatus = false;
          }
        }

        if (nextStatus) {
          return {
              status: 200,
              headers: {"Content-Type":"application/json"},
              body : ['{"syncCompleted" : true}']
          };
        } else {
          return {
              status: 200,
              headers: {"Content-Type":"application/json"},
              body : ['{"syncCompleted" : false}']
          };
        }
      } else if (accessTokenSet.srcType == "Google"){

        // initialization
        var accessToken = null;
        var host = null;
        var port = null;
        var user = null;
        var pass = null;
        var calendarId = null;
        var refreshToken = null;
        var pageToken = "";
        var syncToken = "";
        // get setting data
        for(var i = 0; i < accessInfo.length; i++){
          if (accessInfo[i].srcType == accessTokenSet.srcType && accessInfo[i].srcAccountName == accessTokenSet.srcAccountName) {
            host = accessInfo[i].host;
            port = accessInfo[i].port;
            user = accessInfo[i].user;
            pass = accessInfo[i].pass;
            accessToken = accessInfo[i].accessToken;
            refreshToken = accessInfo[i].refreshToken;
            calendarId = accessInfo[i].calendarId;
          }
        }
        if (accessTokenSet.maxSyncResults == null) {
          maxSyncResults = initMaxSyncResults;
        } else {
          maxSyncResults = accessTokenSet.maxSyncResults;
        }

        try {
          var url = calendarUrl + calendarId + "/events" + "?maxResults=" + maxSyncResults + "&singleEvents=true";
          var httpClient = new _p.extension.HttpClient();
          var headers = {'Authorization': 'Bearer ' + accessToken};
          var response = { status: "", headers : {}, body :"" };
          if(accessTokenSet.pageToken){
            // set page token
            url += "&pageToken=" + accessTokenSet.pageToken;
          } 

          response = httpClient.get(url, headers);
          if(null == response){
            // access token expire
            // TODO:get accessToken
            // retry
            headers = {'Authorization': 'Bearer ' + accessToken};
            response = httpClient.get(url, headers);
          }
        } catch (e) {
          return createResponse(400, {"srcType": "Google"})
        }

        // parse calendar -> json
        var responseJSON = JSON.parse(response.body);
        var items = [];
        items = responseJSON["items"];
        pageToken = responseJSON["nextPageToken"];
        syncToken = responseJSON["nextSyncToken"];
        var results = [];

        //parse
        results = parseGoogleEvents(items);

        // save pageToken
        accessTokenSet.pageToken = pageToken;
        personalBoxAccessor.put(pathDavTokenName, "application/json", JSON.stringify(accessTokenSet));

        // save accessToken,syncToken
        for (var i = 0; i < accessInfo.length; i++) {
          if(accessInfo[i].srcType == accessTokenSet.srcType && accessInfo[i].srcAccountName == accessTokenSet.srcAccountName){
            accessInfo[i].accessToken = accessToken;
            accessInfo[i].syncToken = syncToken;
          }
        }
        personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accessInfo));

        var syncCount = 0;
        var lastDate = null;
        // data regist
        for(var i = 0; i < results.length; i++) {
          var exData = results[i];
          exData.srcType = "Google";
          exData.srcUrl = "";
          exData.srcAccountName = accessTokenSet.srcAccountName;

          var existFilter = "srcId eq '" + exData.srcId + "'";
          var exist = personalEntityAccessor.query().filter(existFilter).run();

          if (exist.d.results.length == 0) {
            //Check whether it is recursive event or not
            var existRecur = null;
            try {
              existRecur = personalEntityAccessor.retrieve(exData.__id);
            } catch (e) {
              if (e.code == 404) {
                personalEntityAccessor.create(exData);
                syncCount++;
              } else {
                return createResponse(500, {"error": e.message})
              }
            }
            if (existRecur != null) {
              var addNum = "1";
              var loopStatus = true;
              do {
                exData.__id = existRecur.__id + "_recur_" + addNum;
                try {
                  var exist2 = personalEntityAccessor.retrieve(exData.__id);
                } catch (e) {
                  if (e.code == 404) {
                    personalEntityAccessor.create(exData);
                    syncCount++;
                    loopStatus = false;
                  } else {
                    return createResponse(500, {"error": e.message})
                  }
                }
                if (loopStatus) {
                  var addNumNext = Number(addNum) + Number(1);
                  addNum = String(addNumNext);
                }
              } while (loopStatus);
            }
          } else if (exist.d.results.length == 1) {
            if (Number(exist.d.results[0].srcUpdated.match(/\d+/)) < Number(exData.srcUpdated.match(/\d+/))) {
              personalEntityAccessor.update(exist.d.results[0].__id, exData, "*");
              syncCount++;
            }
          } else {
            return createResponse(400, {"error": "srcId filter is wrong."})
          }
          lastDate = results[i].Start;
        }

        var nextStatus = null;
        if (results.length == Number(maxSyncResults)) {
          accessTokenSet.nextStart = lastDate;
          nextStatus = false;
          if (syncCount == 0) {
            var nextMax = Number(maxSyncResults) + Number(initMaxSyncResults);
            accessTokenSet.maxSyncResults = String(nextMax);
          } else {
            accessTokenSet.maxSyncResults = initMaxSyncResults;
          }
          personalBoxAccessor.put(pathDavTokenName, "application/json", JSON.stringify(accessTokenSet));
        } else {
          personalBoxAccessor.del(pathDavTokenName);
          if (syncDavCnt == 1) {
            nextStatus = true;
          } else {
            nextStatus = false;
          }
        }

        if (nextStatus) {
          return createResponse(200, {"syncCompleted": true})
        } else {
          return createResponse(200, {"syncCompleted": false})
        }
      } else {  // e.g. Google
        // srcType is not EWS.
        // not supported now!
          return createResponse(400, {"error": "Required srcType is not supported."})
      }

    } else { // diffSync 差分同期
      var pathDavTokenName = pathDavToken + diffSync + ".json";
      var tokenSet = personalBoxAccessor.getString(pathDavTokenName);
      var accessTokenSet = JSON.parse(tokenSet);

      if (accessTokenSet.srcType == "EWS") {
        try {
          ews = new _p.extension.Ews();
          ews.createService(accessTokenSet.srcAccountName, accessTokenSet.pw);
          ews.setUrl(accessTokenSet.srcUrl);
        } catch (e) {
          return {
            status : 400,
            headers : {"Content-Type":"application/json"},
            body: ['{"srcType": "EWS"}']
          };
        }

        var results = ews.findVEvents(accessTokenSet.nextStart, accessTokenSet.syncEnd, accessTokenSet.maxSyncResults);

        var syncCount = 0;
        var lastDate = null;
        for(var i = 0; i < results.length; i++) {
          var exData = exchangeDataEwsToJcal(results[i]);
          exData.srcType = "EWS";
          exData.srcUrl = accessTokenSet.srcUrl;
          exData.srcAccountName = accessTokenSet.srcAccountName;

          var existFilter = "srcId eq '" + exData.srcId + "'";
          var exist = personalEntityAccessor.query().filter(existFilter).run();

          if (exist.d.results.length == 0) {
            //recur のチェック
            var existRecur = null;
            try {
              existRecur = personalEntityAccessor.retrieve(exData.__id);
            } catch (e) {
              if (e.code == 404) {
                personalEntityAccessor.create(exData);
                syncCount++;
              } else {
                return {
                  status : 500,
                  headers : {"Content-Type":"application/json"},
                  body: [JSON.stringify({"error": e.message})]
                };
              }
            }
            if (existRecur != null) {
              var addNum = "1";
              var loopStatus = true;
              do {
                exData.__id = existRecur.__id + "_recur_" + addNum;
                try {
                  var exist2 = personalEntityAccessor.retrieve(exData.__id);
                } catch (e) {
                  if (e.code == 404) {
                    personalEntityAccessor.create(exData);
                    syncCount++;
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
              } while (loopStatus);
            }
          } else if (exist.d.results.length == 1) {
            exData.__id = exist.d.results[0].__id;
            if (Number(exist.d.results[0].srcUpdated.match(/\d+/)) < Number(exData.srcUpdated.match(/\d+/))) {
              personalEntityAccessor.update(exist.d.results[0].__id, exData, "*");
            }
            var index = -1;
            index = accessTokenSet.checkList.indexOf(exData.srcId);
            if (index != -1) {
              accessTokenSet.checkList.splice(index, 1);
              syncCount++;
            }
          } else {
            return {
              status : 400,
              headers : {"Content-Type":"application/json"},
              body: [JSON.stringify({"error": "srcId filter is wrong."})]
            };
          }
          lastDate = results[i].Start;
        }

        var nextStatus = null;
        if (results.length == Number(accessTokenSet.maxSyncResults)) {
          accessTokenSet.nextStart = lastDate;
          nextStatus = false;
          if (syncCount == 0) {
            var nextMax = Number(accessTokenSet.maxSyncResults) + Number(initMaxSyncResults);
            accessTokenSet.maxSyncResults = String(nextMax);
          } else {
            accessTokenSet.maxSyncResults = initMaxSyncResults;
          }
          personalBoxAccessor.put(pathDavTokenName, "application/json", JSON.stringify(accessTokenSet));
        } else {
          //checkList に残っているsrcIdのエントリーを削除
          for(var i = 0; i < accessTokenSet.checkList.length; i++) {
            var checkFilter = "srcId eq '" + accessTokenSet.checkList[i] + "'";
            var deleteIndex = personalEntityAccessor.query().filter(checkFilter).run();
            personalEntityAccessor.del(deleteIndex.d.results[0].__id);
          }

          personalBoxAccessor.del(pathDavTokenName);
          if (syncDavCnt == 1) {
            nextStatus = true;
          } else {
            nextStatus = false;
          }
        }

        if (nextStatus) {
          return {
              status: 200,
              headers: {"Content-Type":"application/json"},
              body : ['{"syncCompleted" : true}']
          };
        } else {
          return {
              status: 200,
              headers: {"Content-Type":"application/json"},
              body : ['{"syncCompleted" : false}']
          };
        }
      }else if (accessTokenSet.srcType == "Google"){
        // initialization
        var accessToken = null;
        var host = null;
        var port = null;
        var user = null;
        var pass = null;
        var calendarId = null;
        var refreshToken = null;
        var syncToken = "";
        // get setting data
        for(var i = 0; i < accessInfo.length; i++){
          if (accessInfo[i].srcType == accessTokenSet.srcType && accessInfo[i].srcAccountName == accessTokenSet.srcAccountName) {
            host = accessInfo[i].host;
            port = accessInfo[i].port;
            user = accessInfo[i].user;
            pass = accessInfo[i].pass;
            accessToken = accessInfo[i].accessToken;
            refreshToken = accessInfo[i].refreshToken;
            calendarId = accessInfo[i].calendarId;
            syncToken = accessInfo[i].syncToken;
          }
        }
        if (accessTokenSet.maxSyncResults == null) {
          maxSyncResults = initMaxSyncResults;
        } else {
          maxSyncResults = accessTokenSet.maxSyncResults;
        }

        try {
          var url = calendarUrl + calendarId + "/events" + "?maxResults=" + maxSyncResults + "&singleEvents=true";
          var httpClient = new _p.extension.HttpClient();
          var headers = {'Authorization': 'Bearer ' + accessToken};
          var response = { status: "", headers : {}, body :"" };

          if(null == syncToken){
            return createResponse(500, {"Server Error": "Google syncToken is null."})
          }

          url += "&syncToken=" + syncToken;
          response = httpClient.get(url, headers);
          if(null == response){
            // access token expire
            // TODO:get accessToken
            // retry
            headers = {'Authorization': 'Bearer ' + accessToken};
            response = httpClient.get(url, headers);
          }
        } catch (e) {
          return createResponse(400, {"srcType": "Google"})
        }

        // parse calendar -> json
        var responseJSON = JSON.parse(response.body);
        var items = [];
        items = responseJSON["items"];
        syncToken = responseJSON["nextSyncToken"];
        var results = [];

        //parse
        results = parseGoogleEvents(items);
        // save accessToken,syncToken
        for (var i = 0; i < accessInfo.length; i++) {
          if(accessInfo[i].srcType == accessTokenSet.srcType && accessInfo[i].srcAccountName == accessTokenSet.srcAccountName){
            accessInfo[i].accessToken = accessToken;
            accessInfo[i].syncToken = syncToken;
          }
        }
        personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accessInfo));

        for(var i = 0; i < results.length; i++) {
          var exData = results[i];
          exData.srcType = "Google";
          exData.srcUrl = "";
          exData.srcAccountName = accessTokenSet.srcAccountName;

          var existFilter = "srcId eq '" + exData.srcId + "'";
          var exist = personalEntityAccessor.query().filter(existFilter).run();

          if (exist.d.results.length == 0) {
            //Check whether it is recursive event or not
            var existRecur = null;
            try {
              existRecur = personalEntityAccessor.retrieve(exData.__id);
            } catch (e) {
              if (e.code == 404) {
                personalEntityAccessor.create(exData);
                syncCount++;
              } else {
                return {
                  status : 500,
                  headers : {"Content-Type":"application/json"},
                  body: [JSON.stringify({"error": e.message})]
                };
              }
            }
            if (existRecur != null) {
              var addNum = "1";
              var loopStatus = true;
              do {
                exData.__id = existRecur.__id + "_recur_" + addNum;
                try {
                  var exist2 = personalEntityAccessor.retrieve(exData.__id);
                } catch (e) {
                  if (e.code == 404) {
                    personalEntityAccessor.create(exData);
                    syncCount++;
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
              } while (loopStatus);
            }
          } else if (exist.d.results.length == 1) {
            exData.__id = exist.d.results[0].__id;
            if (Number(exist.d.results[0].srcUpdated.match(/\d+/)) < Number(exData.srcUpdated.match(/\d+/))) {
              personalEntityAccessor.update(exist.d.results[0].__id, exData, "*");
            }
            var index = -1;
            index = accessTokenSet.checkList.indexOf(exData.srcId);
            if (index != -1) {
              accessTokenSet.checkList.splice(index, 1);
              syncCount++;
            }
          } else {
            return {
              status : 400,
              headers : {"Content-Type":"application/json"},
              body: [JSON.stringify({"error": "srcId filter is wrong."})]
            };
          }
          lastDate = results[i].Start;
        }

        var nextStatus = null;
        if (results.length == Number(maxSyncResults)) {
          accessTokenSet.nextStart = lastDate;
          nextStatus = false;
          if (syncCount == 0) {
            var nextMax = Number(maxSyncResults) + Number(initMaxSyncResults);
            accessTokenSet.maxSyncResults = String(nextMax);
          } else {
            accessTokenSet.maxSyncResults = initMaxSyncResults;
          }
          personalBoxAccessor.put(pathDavTokenName, "application/json", JSON.stringify(accessTokenSet));
        } else {
          //checkList に残っているsrcIdのエントリーを削除
          for(var i = 0; i < accessTokenSet.checkList.length; i++) {
            var checkFilter = "srcId eq '" + accessTokenSet.checkList[i] + "'";
            var deleteIndex = personalEntityAccessor.query().filter(checkFilter).run();
            personalEntityAccessor.del(deleteIndex.d.results[0].__id);
          }

          personalBoxAccessor.del(pathDavTokenName);
          if (syncDavCnt == 1) {
            nextStatus = true;
          } else {
            nextStatus = false;
          }
        }

        if (nextStatus) {
          return {
              status: 200,
              headers: {"Content-Type":"application/json"},
              body : ['{"syncCompleted" : true}']
          };
        } else {
          return {
              status: 200,
              headers: {"Content-Type":"application/json"},
              body : ['{"syncCompleted" : false}']
          };
        }
      } else {  // e.g. Google
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
      headers: { "Content-Type": "application/json" },
      body: [JSON.stringify({"error": e.message})]
    };
  }

  // resを定義
  return {
    status: 400,
    headers: {"Content-Type":"application/json"},
    body : ['{"error":"Unexpected processing."}']
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

function createResponse(tempCode, tempBody) {
    var isString = typeof tempBody == "string";
    var tempHeaders = isString ? {"Content-Type":"text/plain"} : {"Content-Type":"application/json"};
    return {
        status: tempCode,
        headers: tempHeaders,
        body: [isString ? tempBody : JSON.stringify(tempBody)]
    };
}
//yyyy-MM-ddTHH:mm:ss+09:00 -> yyyy/MM/dd HH:mm:ss
function toUTC(dateObj){
    var str = "";
    if (dateObj.dateTime) {
        str = dateObj.dateTime;
    } else if (dateObj.date) {
        str = dateObj.date;
    } else {
        // throw exception
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

    var split = str.split("+");
    var repl = split[0].replace("T"," ");
    repl = repl.replace(/-/g, "/");
    var newdate = Date.parse(new Date(repl));
    return newdate;
}

function parseGoogleEvents(items){
  var results = [];
  for(var i = 0; i < items.length; i++){

    var result = {};
    result.__id = items[i].id;
    result.srcId = items[i].id;

    var newdate = toUTC(items[i].start);
    result.uxtDtstart = newdate;
    result.dtstart = "/Date(" + newdate + ")/";

    newdate = toUTC(items[i].end);
    result.uxtDtend = newdate;
    result.dtend = "/Date(" + newdate + ")/";

    newdate = Date.parse(new Date(items[i].updated));
    result.uxtUpdated = newdate;
    result.srcUpdated = "/Date(" + newdate + ")/";

    result.summary = items[i].summary;
    result.description = items[i].description;
    result.location = items[i].location;
    result.organizer = items[i].organizer.email;

    if(items[i].attendees != null){
      var list = [];
      for(var j = 0; j < items[i].attendees.length; j++){
        list.push(items[i].attendees[j].email);
      }
      result.attendees = list;
    }
    results.push(result);
  }

  return results;
}
