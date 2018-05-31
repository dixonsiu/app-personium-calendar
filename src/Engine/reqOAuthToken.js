// OAuth2/OAuth2Info.json  sample
// [{"srcType":"Google","client_id":"","client_secret":"",
//  "authorizationEp":"https://accounts.google.com/o/oauth2/v2/auth",
//  "tokenEp":"https://www.googleapis.com/oauth2/v4/token",
//  "resouceEp":"https://www.googleapis.com/calendar/v3/calendars",
//  "scope":"https://www.googleapis.com/auth/calendar"},
//  {"srcType":"Office365","client_id":"","client_secret":"",
//  "authorizationEp":"https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
//  "tokenEp":"https://login.microsoftonline.com/common/oauth2/v2.0/token",
//  "resourceEp":"https://outlook.office.com/api",
//  "scope":"offline_access+https://outlook.office.com/Calendars.ReadWrite"}]
//
//  2018/03
//  Office365 memo
//  Outlook API
//  Outlook API is supported data synchronization.
//    resouceEP: https://outlook.office.com/api
//    scope=https://outlook.office.com/Calendars.ReadWrite
//  Graph API
//  Graph API is not supported data synchronization.
//    resourceEP: https://graph.microsoft.com
//    scope=Calendars.ReadWrite

function(request){
    // GET 以外は405
    if(request.method !== "GET") {
        return createResponse(405, {"error":"method not allowed"});
    }

    var queryValue = "";
    queryValue = request.queryString;
    if (queryValue === "") {
        return createResponse(400, {"error":"required parameter not exist."});
    }

    var params = _p.util.queryParse(queryValue);

    var oAuthInfo = require("OAuth2Info").oauth2Info;

    var redirectUrl = getRedirectURL(oAuthInfo, params);

    if (redirectUrl == "NOT SUPPORT") {
        return createResponse(400, {"error": "Required srcType is not support."});
    }

    return {
        status : 200,
        headers: {"Content-Type":"text/html"},
        body : [create301HTML(redirectUrl)]
    };
};


function getRedirectURL(oAuthInfo, params) {
    var redirectUri = encodeURIComponent("https://demo.personium.io/app-personium-calendar/__/Engine/oauth2callback");
    var clientId = null;
    var authorizationEp = null;
    var scope = null;

    for(var i = 0; i < oAuthInfo.length; i++) {
        if (params.srcType == oAuthInfo[i].srcType) {
            clientId = oAuthInfo[i].client_id;
            authorizationEp = oAuthInfo[i].authorizationEp;
            scope = encodeURIComponent(oAuthInfo[i].scope);
            break;
        }
    }
    if (clientId == null) {
        return "NOT SUPPORT";
    }

    if (params.state) {
        var state = encodeURIComponent(params.srcType + "+" + params.state);
    } else {
        var state = encodeURIComponent(params.srcType);
    }

    var paramsStr = [
        "response_type=code",
        "client_id=" + clientId,
        "redirect_uri=" + redirectUri,
        "scope=" + scope,
        "state=" + state
    ].join("&");

    if (params.srcType == "Google") {
        paramsStr = paramsStr + "&access_type=offline&prompt=consent";
    }

    var redirectUrl = [
        authorizationEp,
        "?",
        paramsStr
    ].join("");

    return redirectUrl;
};

function create301HTML(url) {
    var html = [
        '<html>',
            '<head>',
                '<meta http-equiv="refresh" ',
                'content="0;URL=\'' + url + '\'" />',
            '</head>',
            '<body></body>',
        '</html>'
    ].join("");
    return html;
};

function createResponse(tempCode, tempBody) {
    var isString = typeof tempBody == "string";
    var tempHeaders = isString ? {"Content-Type":"text/plain"} : {"Content-Type":"application/json"};
    return {
        status: tempCode,
        headers: tempHeaders,
        body: [isString ? tempBody : JSON.stringify(tempBody)]
    };
};
