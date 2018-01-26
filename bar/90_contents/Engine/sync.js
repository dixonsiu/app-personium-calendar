/*
 * Create VCalendar's events from the specified server.
 *  Input:
 *     srcUrl, Id
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

   var collectionName = "OData";
   var davName = "AccessInfo";
   var entityType = "vevent";
   var pathDavName = "AccessInfo/AccessInfo.json";

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
         var pathDavTokenName = pathDavToken + accessInfo[i].id + ".json";
         var tokenSet = personalBoxAccessor.getString(pathDavTokenName);
         var accessTokenSet = JSON.parse(tokenSet);

         if (accessTokenSet.syncType == "FIRST") {
           firstSync = accessTokenSet.id;
           syncDavCnt++;
         } else {
           diffSync = accessTokenSet.id;
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
       for (var i = 0; i < accessInfo.length; i++) {
         var accessTokenSet = accessInfo[i];
         var pathDavTokenName = pathDavToken + accessTokenSet.id + ".json";

         accessTokenSet.syncType = "DIFF";
         //accessTokenSet.nextStart = accessTokenSet.token;
         accessTokenSet.maxSyncResults = initMaxSyncResults;

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
           ews.createService(accessTokenSet.id, accessTokenSet.pw);
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
           var exData = exchangeData(results[i]);
           exData.srcType = "EWS";
           exData.srcUrl = accessTokenSet.srcUrl;
           var exist = null;
           try {
             exist = personalEntityAccessor.retrieve(exData.__id);
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

           if (exist != null) {
             var addNum = "1";
             var loopStatus = true;
             do {
               if (exist.srcId == exData.srcId) {
                 if (Number(exist.srcUpdated.match(/\d+/)) < Number(exData.srcUpdated.match(/\d+/))) {
                   personalEntityAccessor.update(exData.__id, exData, "*");
                   syncCount++;
                 }
                 loopStatus = false;
               } else {
                 exData.__id = exist.__id + "_recur_" + addNum;
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
               }
             } while (loopStatus);
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

       } else {  // e.g. Google
         // srcType is not EWS.
         // not supported now!
         return {
           status : 400,
           headers : {"Content-Type":"application/json"},
           body: ['{"error": "Required srcType is not supported."}']
         };
       }


     } else { //diffSync


       //
       // ここに差分同期の処理を書く
       //


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
