function(request){
    // GET, PUT 以外は405
    if(request.method !== "GET" && request.method !== "PUT") {
        return createResponse(405, {"error":"method not allowed"});
    }

    var params = null;
    var bodyAsString = "";
    if(request.method === "PUT") {
        bodyAsString = request.input.readAll();
        params = JSON.parse(bodyAsString);
    } else {
        bodyAsString = request.queryString;
        params = _p.util.queryParse(bodyAsString);
    }
    if (bodyAsString === "") {
        return createResponse(400, {"error":"required parameter not exist."});
    }

    // Get App Token
    var appCellAdminInfo = {
        "cellUrl": "https://demo.personium.io/app-personium-calendar/",
        "userId": "***",
        "password": "***"
    };
    try {
        var mainBox = _p.as(appCellAdminInfo).cell().box();
        var info = mainBox.getString("Engine/__src/OAuth2Info.json");
    } catch (e) {
        return createResponse(500, e);
    };

    var oAuthInfo = [];
    oAuthInfo = JSON.parse(info);

    var tokenParams = {};
    if(request.method === "PUT") {  // for get access_token again
        tokenParams = toAccessToken(oAuthInfo, params);
    } else {  // GET  for get access_token and refresh_token
        tokenParams = toAccessRefreshToken(oAuthInfo, params);
    }
    if (tokenParams == "NOT SUPPORT") {
        return createResponse(400, {"error": "Required srcType is not support."});
    }

    try {
        var headers = {'Content-Type': 'application/x-www-form-urlencoded'};
        var contentType = "application/x-www-form-urlencoded";
        var httpClient = new _p.extension.HttpClient();
        var response = { status: "", headers : {}, body :"" };

        response = httpClient.post(tokenParams.tokenEp, headers, contentType, tokenParams.body);

        var httpCode = parseInt(response.status);
        // Both Google and Office365 expected 200.
        if (httpCode !== 200) {
            return createResponse(httpCode, response.body);
        }

        var ret = JSON.parse(response.body);
        delete ret["token_type"];
        delete ret["expires_in"];
        delete ret["scope"];
        delete ret["ext_expires_in"];
        if (request.method === "GET") {
            ret.srcType = tokenParams.srcType;
            return {
                status : 200,
                headers: {"Content-Type":"text/html"},
                body : [createHTML(params, ret)]
            };
        }

        // success (PUT method)
        return createResponse(200, ret);
    } catch (e) {
        return createResponse(500, e);
    }
};


function toAccessRefreshToken(oAuthInfo, params) {
    var clientId = null;
    var clientSecret = null;
    var redirectUri = encodeURIComponent("https://demo.personium.io/app-personium-calendar/__/Engine/oauth2callback");
    var grantType = "authorization_code";
    var tokenEp = null;
    var srcType = null;
    var code = params.code;

    //var param = params.state.split(encodeURIComponent("+"));
    var param = params.state.split("+");

    for (var j = 0; j < param.length; j++) {
        for(var i = 0; i < oAuthInfo.length; i++) {
            if (param[j] == oAuthInfo[i].srcType) {
                srcType = param[j];
                clientId = oAuthInfo[i].client_id;
                clientSecret = oAuthInfo[i].client_secret;
                tokenEp = oAuthInfo[i].tokenEp;
                break;
            }
        }
    }
    if (srcType == null) {
        return "NOT SUPPORT";
    }

    var paramsStr = [
        "client_id=" + clientId,
        "client_secret=" + clientSecret,
        "code=" + code,
        "redirect_uri=" + redirectUri,
        "grant_type=" + grantType
    ].join("&");

    if (srcType == "Google") {
        paramsStr = paramsStr + "&access_type=offline";
    }

    result = {};
    result.srcType = srcType;
    result.tokenEp = tokenEp;
    result.body = paramsStr;
    return result;
};


function toAccessToken(oAuthInfo, params) {
    var clientId = null;
    var clientSecret = null;
    var grantType = "refresh_token";
    var tokenEp = null;
    var refreshToken = params.refresh_token;

    for(var i = 0; i < oAuthInfo.length; i++) {
        if (params.srcType == oAuthInfo[i].srcType) {
            clientId = oAuthInfo[i].client_id;
            clientSecret = oAuthInfo[i].client_secret;
            tokenEp = oAuthInfo[i].tokenEp;
            break;
        }
    }
    if (clientId == null) {
        return "NOT SUPPORT";
    }

    var paramsStr = [
        "client_id=" + clientId,
        "client_secret=" + clientSecret,
        "grant_type=" + grantType,
        "refresh_token=" + refreshToken
    ].join("&");

    result = {};
    result.srcType = params.srcType;
    result.tokenEp = tokenEp;
    result.body = paramsStr;
    return result;
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

function createHTML(params, ret) {
    var pData = ret;
    var html = [
        '<html>',
            '<head>',
                '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.4.0/css/font-awesome.min.css" />',
                '<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>',
            '</head>',
            '<body>',
              "<div id='pData' data-ret='" + JSON.stringify(ret) + "'></div>",
              '<div id="content"></div>',
              '<script>$("body #content").load("../html/templates/_register_oauth2_account.html");</script>',
            '</body>',
        '</html>'
    ].join("");
    return html;
};
