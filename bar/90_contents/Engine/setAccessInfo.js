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
     *           GET:    Get AccessInfo.json
     */

   // POST, PUT, DELETE, GET 以外は405
   if(request.method !== "POST" && request.method !== "PUT" && request.method !== "DELETE" && request.method !== "GET") {
     return {
       status : 405,
       headers : {"Content-Type":"application/json"},
       body : ['{"error":"method not allowed"}']
     };
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
           setInfo.srcUrl = ews.autodiscoverUrl(setInfo.id);
         } catch (e) {
           return {
             status : 400,
             headers : {"Content-Type":"application/json"},
             body: ['{"error": "Required paramter is not access ews server."}']
           };
         }

         accessInfo.push(setInfo);
         personalBoxAccessor.put(pathDavName, "application/json", JSON.stringify(accessInfo));

         try {
           var pathDavTokenName = pathDavToken + setInfo.id + ".json";
           var tokenSet = personalBoxAccessor.getString(pathDavTokenName);

           return {
               status : 500,
               headers : {"Content-Type":"application/json"},
               body: [JSON.stringify({"error": "Required paramter set is already."})]
           };

         } catch (e) {
           if (e.code != 404) {
             return {
                 status : 500,
                 headers : {"Content-Type":"application/json"},
                 body: [JSON.stringify({"error": "Box access error."})]
             };
           }
         }

         setInfo.syncType = "FIRST";
         setInfo.nextStart = null;
         setInfo.maxSyncResults = null;

         personalBoxAccessor.put(pathDavTokenName, "application/json", JSON.stringify(setInfo));

       } else { // e.g. Google
         // srcType is not EWS.
         // not supported now!
         return {
           status : 400,
           headers : {"Content-Type":"application/json"},
           body: ['{"error": "Required srcType is not supported."}']
         };
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
         }
       } catch (e) {
         return {
           status : e.code,
           headers : {"Content-Type":"application/json"},
           body: [JSON.stringify({"code": e.code, "message": e.message})]
         };
       }

     } else if (request.method === "DELETE") {
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
     } else { //GET
       try {
         var info = personalBoxAccessor.getString(pathDavName);
         accessInfo = JSON.parse(info);

         var resultsInfo = [];
         for(var i = 0; i < accessInfo.length; i++) {
           var resultInfo = {};
           if (accessInfo[i].srcType == "EWS") {
             resultInfo.srcType = accessInfo[i].srcType;
             resultInfo.id = accessInfo[i].id;
           } else {
             resultInfo.srcType = accessInfo[i].srcType;
             resultInfo.id = accessInfo[i].id;
             resultInfo.srcUrl = accessInfo[i].srcUrl;
           }
           resultsInfo.push(resultInfo);
         }
       } catch (e) {
         if (e.code == 404) {
           return {
             status : 200,
             headers : {"Content-Type":"application/json"},
             body: [JSON.stringify([])]
           };
         } else {
           return {
             status : 500,
             headers : {"Content-Type":"application/json"},
             body: [JSON.stringify({"error": "Box access error."})]
           };
         }
       }
       return {
         status : 200,
         headers : {"Content-Type":"application/json"},
         body: [JSON.stringify(resultsInfo)]
       };
     }
   } catch (e) {
       return {
         status: 500,
         headers: { "Content-Type": "application/json" },
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
