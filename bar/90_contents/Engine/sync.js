/*
 * Create VCalendar's events from the specified server.
 *  Input:
 *     srcUrl, Id
 *     syncPeriod
 *
 */

 function(request){

   var collectionName = "OData";
   var entityType = "vevent";

   try {
       var personalBoxAccessor = _p.as("client").cell(pjvm.getCellName()).box(pjvm.getBoxName());
       var personalCollectionAccessor = personalBoxAccessor.odata(collectionName);
       var personalEntityAccessor = personalCollectionAccessor.entitySet(entityType);

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
