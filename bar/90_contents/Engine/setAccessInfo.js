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
