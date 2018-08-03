/*
 * Create VCalendar's events from the specified server.
 *  Input:
 *     srcUrl, srcAccountName
 *     syncPeriod
 *
 */

function(request){

    // only GET
    if(request.method !== "GET") {
      return {
        status : 405,
        headers : {"Content-Type":"application/json"},
        body : ['{"error":"method not allowed"}']
      };
    }

    var initMaxSyncResults = maxSyncResults = "10";
    var syncStartDate = "2017/4/1 00:00:00";  // "1970/1/1 00:00:00";
    var syncEndDate = "2019/4/1 00:00:00";  // "2100/1/1 00:00:00";
    var diffSyncStart = "1";
    var diffSyncEnd = "1";

    var collectionName = "OData";
    var davName = "AccessInfo";
    var entityType = "vevent";
    var pathDavName = "AccessInfo/AccessInfo.json";

    var calendarUrl = "https://www.googleapis.com/calendar/v3/calendars/";
    var outlookUrl = "https://outlook.office.com/api/v2.0/me/calendarview";
    //var graphUrl = "https://graph.microsoft.com/v1.0/me/calendarView";
    // In the future, office365Url changes from outlookUrl to graphUrl after Data Synchronization adds.
    var office365Url = outlookUrl;

    try {
        var personalBoxAccessor = _p.localbox();
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

            if (accessTokenSet.srcType == "EWS") {
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
            }
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
            var calendarId = null;
            var refreshToken = null;
            var pageToken = "";
            var syncToken = "";
            // get setting data
            accessToken = accessTokenSet.accessToken;
            refreshToken = accessTokenSet.refreshToken;
            calendarId = accessTokenSet.calendarId;
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
                if(null == response || response.status != 200){
                    // access token expire
                    var tempData = {"refresh_token": refreshToken , "srcType": "Google"}
                    accessToken = getAccessToken(tempData);
                    // retry
                    headers = {'Authorization': 'Bearer ' + accessToken};
                    response = httpClient.get(url, headers);
                    if (response == null || response.status != 200) {
                        return createResponse(400, {"error": "refresh token is wrong"})
                    }

                    // save accessToken
                    for (var i = 0; i < accessInfo.length; i++) {
                        if(accessInfo[i].srcType == accessTokenSet.srcType && accessInfo[i].srcAccountName == accessTokenSet.srcAccountName){
                            accessInfo[i].accessToken = accessToken;
                        }
                    }
                    personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accessInfo));
                }
            } catch (e) {
              return createResponse(400, {"srcType": "Google"})
            }

            if (null == response || response.status != 200){
                return createResponse(400, {"error": response.body})
            }

            // parse calendar -> json
            var responseJSON = JSON.parse(response.body);
            var items = [];
            items = responseJSON["items"];
            pageToken = responseJSON["nextPageToken"];
            syncToken = responseJSON["nextSyncToken"];
            var results = [];

            //parse
            results = googleCal.parseEvents(items);

            if (pageToken){
                // save pageToken
                accessTokenSet.pageToken = pageToken;
                personalBoxAccessor.put(pathDavTokenName, "application/json", JSON.stringify(accessTokenSet));
            }
            if (syncToken){
                // save synctoken
                for (var i = 0; i < accessInfo.length; i++) {
                    if(accessInfo[i].srcType == accessTokenSet.srcType && accessInfo[i].srcAccountName == accessTokenSet.srcAccountName){
                        accessInfo[i].syncToken = syncToken;
                    }
                }
                personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accessInfo));
            }
            // data regist
            for(var i = 0; i < results.length; i++) {
                var exData = results[i];
                exData.srcType = "Google";
                exData.srcUrl = "";
                exData.srcAccountName = accessTokenSet.srcAccountName;

                var exist = null;
                try {
                    exist = personalEntityAccessor.retrieve(exData.__id);
                } catch (e) {
                    if (e.code == 404) {
                        delete exData['status'];
                        personalEntityAccessor.create(exData);
                    } else {
                        return createResponse(500, {"error": e.message})
                    }
                }
                if (exist) {
                    if (Number(exist.srcUpdated.match(/\d+/)) < Number(exData.srcUpdated.match(/\d+/))) {
                        delete exData['status'];
                        personalEntityAccessor.update(exist.__id, exData, "*");
                    }
                }
            }
            var nextStatus = null;
            if (results.length == Number(maxSyncResults)) {
                nextStatus = false;
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
        } else if (accessTokenSet.srcType == "Office365") {   //First sync

            if (accessTokenSet.maxSyncResults == null) {
                maxSyncResults = initMaxSyncResults;
            } else {
                maxSyncResults = accessTokenSet.maxSyncResults;
            }

            try {
                var httpClient = new _p.extension.HttpClient();
                // https://msdn.microsoft.com/en-us/office/office365/api/calendar-rest-operations#get-events
                var headers = {'Authorization': 'Bearer ' + accessTokenSet.accessToken,
                               'Prefer': 'outlook.body-content-type="text",odata.track-changes,odata.maxpagesize=' + maxSyncResults};
                var response = { status: "", headers : {}, body :"" };

                var url = "";
                if (accessTokenSet.skipToken) {
                    url = accessTokenSet.skipToken;
                } else if (accessTokenSet.deltaToken) {
                    url = accessTokenSet.deltaToken;
                } else {
                    var reqStart = JSON.stringify(new Date(syncStartDate));
                    reqStart = reqStart.slice(1);
                    reqStart = reqStart.slice(0, -1);
                    var reqEnd = JSON.stringify(new Date(syncEndDate));
                    reqEnd = reqEnd.slice(1);
                    reqEnd = reqEnd.slice(0, -1);
                    var url = office365Url + "?startDateTime=" + reqStart + "&endDateTime=" + reqEnd;
                }

                response = httpClient.get(url, headers);
                if(null == response || response.status != 200){
                    // access token expire
                    var tempData = {"refresh_token": accessTokenSet.refreshToken , "srcType": "Office365"};
                    accessTokenSet.accessToken = getAccessToken(tempData);
                    // retry
                    headers.Authorization = 'Bearer ' + accessTokenSet.accessToken;
                    response = httpClient.get(url, headers);
                    if (response == null || response.status != 200) {
                        return createResponse(400, {"error": "refresh token is wrong"})
                    }

                    // save accessToken
                    for (var i = 0; i < accessInfo.length; i++) {
                        if(accessInfo[i].srcType == accessTokenSet.srcType && accessInfo[i].srcAccountName == accessTokenSet.srcAccountName){
                            accessInfo[i].accessToken = accessTokenSet.accessToken;
                        }
                    }
                    personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accessInfo));
                }

            } catch (e) {
                return createResponse(400, '{"srcType" : "Office365"}');
            }

            if (null == response || response.status != 200){
                return createResponse(400, {"error": response.body})
            }

            // parse calendar -> json
            var responseJSON = JSON.parse(response.body);
            var items = [];
            items = responseJSON.value;

            var deltaToken = responseJSON['@odata.deltaLink'];
            var skipToken = responseJSON['@odata.nextLink'];

            var results = [];

            //parse
            results = outlookCal.parseEvents(items);

            // data regist
            for(var i = 0; i < results[0].length; i++) {
                var exData = results[0][i];
                exData.srcType = "Office365";
                exData.srcUrl = "";
                exData.srcAccountName = accessTokenSet.srcAccountName;
                var exist = null;
                try {
                    exist = personalEntityAccessor.retrieve(exData.__id);
                } catch (e) {
                    if (e.code == 404) {
                        personalEntityAccessor.create(exData);
                    } else {
                        return createResponse(500, {"error": e.message})
                    }
                }
                if (exist != null) {
                    if (Number(exist.srcUpdated.match(/\d+/)) < Number(exData.srcUpdated.match(/\d+/))) {
                        personalEntityAccessor.update(exist.__id, exData, "*");
                    }
                }
            }

            var nextStatus = false;
            if (deltaToken) {
                if(deltaToken.indexOf("deltaToken") > -1) {
                    // save deltToken(sync finish)
                    for (var i = 0; i < accessInfo.length; i++) {
                        if(accessInfo[i].srcType == accessTokenSet.srcType && accessInfo[i].srcAccountName == accessTokenSet.srcAccountName){
                            accessInfo[i].deltaToken = deltaToken;
                        }
                    }
                    personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accessInfo));
                    personalBoxAccessor.del(pathDavTokenName);
                    if (syncDavCnt == 1) {
                        nextStatus = true;
                    }
                } else {
                    // next sync
                    accessTokenSet.skipToken = deltaToken;
                    personalBoxAccessor.put(pathDavTokenName, "application/json", JSON.stringify(accessTokenSet));
                }
            }
            if (skipToken) {
                accessTokenSet.skipToken = skipToken;
                personalBoxAccessor.put(pathDavTokenName, "application/json", JSON.stringify(accessTokenSet));
            }

            if (nextStatus) {
                return createResponse(200, {"syncCompleted": true})
            } else {
                return createResponse(200, {"syncCompleted": false})
            }

        } else {  // e.g. Yahoo!
          // srcType is not EWS.
          // not supported now!
            return createResponse(400, {"error": "Required srcType is not supported."})
        }

    } else { // diffSync
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
            // check recur
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
        var calendarId = null;
        var refreshToken = null;
        var syncToken = "";
        // get setting data
        accessToken = accessTokenSet.accessToken;
        refreshToken = accessTokenSet.refreshToken;
        calendarId = accessTokenSet.calendarId;
        syncToken = accessTokenSet.syncToken;
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
          if(null == response || response.status == 401){
            // access token expire
            var tempData = {"refresh_token": refreshToken , "srcType": "Google"}
            accessToken = getAccessToken(tempData);
            // retry
            headers = {'Authorization': 'Bearer ' + accessToken};
            response = httpClient.get(url, headers);
            if (response == null || response.status == 401) {
              return createResponse(400, {"error": "refresh token is wrong"})
            }
            // save accessToken
            for (var i = 0; i < accessInfo.length; i++) {
              if(accessInfo[i].srcType == accessTokenSet.srcType && accessInfo[i].srcAccountName == accessTokenSet.srcAccountName){
                accessInfo[i].accessToken = accessToken;
              }
            }
            personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accessInfo));
          }
        } catch (e) {
          return createResponse(400, {"srcType": "Google"})
        }

        if (null == response || response.status != 200){
          return createResponse(400, {"error": response.body})
        }

        // parse calendar -> json
        var responseJSON = JSON.parse(response.body);
        var items = [];
        items = responseJSON["items"];
        syncToken = responseJSON["nextSyncToken"];
        var results = [];

        //parse
        results = googleCal.parseEvents(items);

        if (syncToken){
          // save synctoken
          for (var i = 0; i < accessInfo.length; i++) {
            if(accessInfo[i].srcType == accessTokenSet.srcType && accessInfo[i].srcAccountName == accessTokenSet.srcAccountName){
              accessInfo[i].syncToken = syncToken;
            }
          }
          personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accessInfo));
        }
        // data regist
        for(var i = 0; i < results.length; i++) {
          var exData = results[i];
          exData.srcType = "Google";
          exData.srcUrl = "";
          exData.srcAccountName = accessTokenSet.srcAccountName;
          var exist = null;
          try {
            exist = personalEntityAccessor.retrieve(exData.__id);
          } catch (e) {
            if (e.code == 404) {
              if (exData.status != "cancelled"){
                delete exData['status'];
                personalEntityAccessor.create(exData);
              }
            } else {
              return createResponse(500, {"error": e.message})
            }
          }
          if (exist) {
            if (exData.status == "cancelled"){
              personalEntityAccessor.del(exist.__id);
            } else {
              delete exData['status'];
              personalEntityAccessor.update(exist.__id, exData, "*");
            }
          }
        }
        var nextStatus = null;
        if (results.length == Number(maxSyncResults)) {
          nextStatus = false;
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

    } else if (accessTokenSet.srcType == "Office365") {     // Diff sync

      if (accessTokenSet.maxSyncResults == null) {
        maxSyncResults = initMaxSyncResults;
      } else {
        maxSyncResults = accessTokenSet.maxSyncResults;
      }

      try {
        var httpClient = new _p.extension.HttpClient();
        var headers = {'Authorization': 'Bearer ' + accessTokenSet.accessToken,
                       'Prefer': 'outlook.body-content-type="text",odata.track-changes,odata.maxpagesize=' + maxSyncResults};
        var response = { status: "", headers : {}, body :"" };

        var url = "";
        if (accessTokenSet.skipToken) {
          url = accessTokenSet.skipToken;
        } else if (accessTokenSet.deltaToken) {
          url = accessTokenSet.deltaToken;
        } else {
            var reqStart = JSON.stringify(new Date(syncStartDate));
            reqStart = reqStart.slice(1);
            reqStart = reqStart.slice(0, -1);
            var reqEnd = JSON.stringify(new Date(syncEndDate));
            reqEnd = reqEnd.slice(1);
            reqEnd = reqEnd.slice(0, -1);
            var url = office365Url + "?startDateTime=" + reqStart + "&endDateTime=" + reqEnd;
        }

        response = httpClient.get(url, headers);

        if (null == response || response.status != 200) {
          // access token expire
          var tempData = {"refresh_token": accessTokenSet.refreshToken , "srcType": "Office365"};
          accessTokenSet.accessToken = getAccessToken(tempData);
          // retry
          headers.Authorization = 'Bearer ' + accessTokenSet.accessToken;
          response = httpClient.get(url, headers);

          if (null == response || response.status != 200) {
            return createResponse(400, {"error": "refresh token is wrong"})
          }

          // save accessToken
          for (var i = 0; i < accessInfo.length; i++) {
            if(accessInfo[i].srcType == accessTokenSet.srcType && accessInfo[i].srcAccountName == accessTokenSet.srcAccountName){
              accessInfo[i].accessToken = accessTokenSet.accessToken;
            }
          }
          personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accessInfo));
          personalBoxAccessor.put(pathDavTokenName, "application/json", JSON.stringify(accessTokenSet));

        }
      } catch (e) {
        return createResponse(400, {"srcType" : "Office365"})
      }

      // parse calendar -> json
      var responseJSON = JSON.parse(response.body);
      var items = [];
      items = responseJSON.value;

      var deltaToken = responseJSON['@odata.deltaLink'];
      var skipToken = responseJSON['@odata.nextLink'];

      //update
      updateOffice365Events(items, personalEntityAccessor, accessTokenSet);

      var nextStatus = false;
      if (deltaToken) {
        if(deltaToken.indexOf("deltatoken") > -1) {
          // first step sync return "deltatoken".
          accessTokenSet.skipToken = deltaToken;
          personalBoxAccessor.put(pathDavTokenName, "application/json", JSON.stringify(accessTokenSet));
        } else {  // sync finished "deltaToken". "Token"/"token", upper/lower case different mean.
          // save deltaToken
          for (var i = 0; i < accessInfo.length; i++) {
            if(accessInfo[i].srcType == accessTokenSet.srcType && accessInfo[i].srcAccountName == accessTokenSet.srcAccountName){
              accessInfo[i].deltaToken = deltaToken;
            }
          }
          personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accessInfo));
          personalBoxAccessor.del(pathDavTokenName);
          if (syncDavCnt == 1) {
            nextStatus = true;
          }
        }
      }
      if (skipToken) {
        accessTokenSet.skipToken = skipToken;
        personalBoxAccessor.put(pathDavTokenName, "application/json", JSON.stringify(accessTokenSet));
      }

      if (nextStatus) {
          return createResponse(200, {"syncCompleted": true})
      } else {
          return createResponse(200, {"syncCompleted": false})
      }

    } else {  // e.g. Yahoo!
        // srcType is not EWS, Google, Office365.
        // not supported now!
        return createResponse(400, {"error": "Required srcType is not supported."})
      }

    }

  } catch (e) {
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: [JSON.stringify({"error": e.message})]
    };
  }

  // res
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

function updateOffice365Events(items, personalEntityAccessor, accessTokenSet) {

    if (0 < items.length) {
        var updateList = [];
        try {
            for(var i = 0; i < items.length; i++){
                if (items[i].reason == "deleted") {
                    var deleteId = String(items[i].id.match(/[^(]*'[^\)']*'/));
                    deleteId = deleteId.slice(1);
                    deleteId = deleteId.slice(0, -1);
                    //personalEntityAccessor.del(deleteId);
                    // all recurrence events delete
                    var checkFilter = "srcId eq '" + deleteId + "'";
                    var checkList = personalEntityAccessor.query().filter(checkFilter).top(1000).run();
                    for (var j = 0; j < checkList.d.results.length; j++) {
                        personalEntityAccessor.del(checkList.d.results[j].__id);
                    }
                } else {
                    updateList.push(items[i]);
                }
            }

            var results = outlookCal.parseEvents(updateList, "masterId");

            // check masterId
            var checkList = [];
            for (var i = 0; i < results[1].length; i++) {
                var checkFilter = "srcId eq '" + results[1][i] + "'";
                var tmpList = personalEntityAccessor.query().filter(checkFilter).top(1000).run();
                for (var j = 0; j < tmpList.d.results.length; j++) {
                    checkList.push(tmpList.d.results[j].__id);
                }
            }
            // data regist
            for (var i = 0; i < results[0].length; i++) {
                var exData = results[0][i];
                exData.srcType = "Office365";
                exData.srcUrl = "";
                exData.srcAccountName = accessTokenSet.srcAccountName;
                var exist = null;
                try {
                    exist = personalEntityAccessor.retrieve(exData.__id);
                } catch (e) {
                    if (e.code == 404) {
                        personalEntityAccessor.create(exData);
                    } else {
                        return createResponse(500, {"error": e.message})
                    }
                }
                if (exist) {
                    personalEntityAccessor.update(exist.__id, exData, "*");
                    var index = -1;
                    index = checkList.indexOf(exist.__id);
                    if (index != -1) {
                      checkList.splice(index, 1);
                    }
                }
            }
            for(var i = 0; i < checkList.length; i++) {
              personalEntityAccessor.del(checkList[i]);
            }
        } catch (e) {
            return createResponse(500, {"error": e.message});
        }
    }
}

var googleCal = require("google_cal").googleCal;
var outlookCal = require("outlook_cal").outlookCal;
