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

  var collectionName = "OData";
  var davName = "AccessInfo";
  var entityType = "vevent";
  var pathDavName = "AccessInfo/AccessInfo.json";

  try {
    var personalBoxAccessor = _p.as("client").cell(pjvm.getCellName()).box(pjvm.getBoxName());
    var personalCollectionAccessor = personalBoxAccessor.odata(collectionName);
    var personalEntityAccessor = personalCollectionAccessor.entitySet(entityType);

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

      //
      // ここに差分同期の処理を書く
      //

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
          body: [JSON.stringify({"error": "Box access error."})]
        };
      }
    }

  } catch (e) {
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: [JSON.stringify({"error": e})]
    };
  }

  // resを定義
  return {
    status: 200,
    headers: {"Content-Type":"application/json"},
    body : ['{"status":"OK"}']
  };

}
