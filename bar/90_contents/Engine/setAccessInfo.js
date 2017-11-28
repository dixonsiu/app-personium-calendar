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

 function(request){
   /*
    * Add/Update/Delete an AccessInfo entry (array item in the AccessInfo.json file)
    *   HTTP Method :
    *           POST:   Add
    *           PUT:    Update
    *           DELETE: Delete
    */

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
//       body: [OK]
   };
 }
