/**
 * Personium
 * Copyright 2017 FUJITSU LIMITED
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var Common = Common || {};

Common.approvalRel = function(extCell, uuid, msgId, callback) {
    Common.showConfirmDialog("msg.info.requestApproval", function() {
        Common.changeStatusMessageAPI(uuid, "approved").done(function() {
            $("#" + msgId).remove();
            var title = i18next.t("readResponseTitle");
            var body = i18next.t("readResponseApprovedBody");
            Common.sendMessageAPI(uuid, extCell, "message", title, body).done(function(data) {
                $("#modal-common").modal('hide');
                if ((typeof callback !== "undefined") && $.isFunction(callback)) {
                    callback();
                }
            });
        }).fail(function(data) {
            Common.showWarningDialog("msg.error.failedChangeStatus", function(){
                $("#modal-common").modal('hide'); 
            });
        });
    });
};

Common.rejectionRel = function(extCell, uuid, msgId, callback) {
    Common.showConfirmDialog("msg.info.requestRejection", function() {
        Common.changeStatusMessageAPI(uuid, "rejected").done(function() {
            $("#" + msgId).remove();
            var title = i18next.t("readResponseTitle");
            var body = i18next.t("readResponseDeclinedBody");
            Common.sendMessageAPI(uuid, extCell, "message", title, body).done(function(data) {
                $("#modal-common").modal('hide');
                if ((typeof callback !== "undefined") && $.isFunction(callback)) {
                    callback();
                }
            });
        }).fail(function(data) {
            Common.showWarningDialog("msg.error.failedChangeStatus", function(){
                $("#modal-common").modal('hide'); 
            });
        });
    });
};

Common.changeStatusMessageAPI = function(uuid, command) {
    var data = {};
    data.Command = command;
    return $.ajax({
        type: "POST",
        url: Common.getCellUrl() + '__message/received/' + uuid,
        data: JSON.stringify(data),
        headers: {
            'Authorization':'Bearer ' + Common.getToken()
        }
    })
};

Common.getAllowedCellList = function(role) {
    let extCellUrl = [
        Common.getCellUrl(),
        '__ctl/Role(Name=\'',
        role,
        '\',_Box\.Name=\'',
        Common.getBoxName(),
        '\')/$links/_ExtCell'
    ].join("");

    $.ajax({
        type: "GET",
        url: extCellUrl,
        headers: {
            'Authorization':'Bearer ' + Common.getToken(),
            'Accept':'application/json'
        }
    }).done(function(data) {
        Common.dispAllowedCellList(data);
    });
};

Common.dispAllowedCellList = function(json) {
    $("#allowedCellList").empty();
    var results = json.d.results;
    if (results.length > 0) {
        results.sort(function(val1, val2) {
          return (val1.uri < val2.uri ? 1 : -1);
        })

        for (var i in results) {
            var uri = results[i].uri;
            var matchUrl = uri.match(/\(\'(.+)\'\)/);
            var extUrl = matchUrl[1];

            Common.dispAllowedCellListAfter(extUrl, i);
        }
    }
};

Common.dispAllowedCellListAfter = function(extUrl, no) {
    Common.getProfile(extUrl, function(profObj) {
        Common.appendAllowedCellList(extUrl, profObj.dispName, no)
    });
};

/**
 * url : Get cellURL
 * callback : After acquiring, function to operate
 * paramObj : An argument object to be passed to callback
 **/
Common.getProfile = function(url, callback) {
    let profObj = {
        dispName: url,
        description: "",
        dispImage: Common.getJdenticon(url)
    }
    Common.getCell(url).done(function(cellObj) {
        profObj.dispName = cellObj.cell.name;
    }).fail(function(xmlObj) {
        if (xmlObj.status == "200" || xmlObj.status == "412") {
            profObj.dispName = Common.getCellNameFromUrl(url);
        } else {
            profObj.dispName = url;
        }
    }).always(function() {
        Common.getProfileLocalesAPI(url).done(function(data) {
            if (data.DisplayName) {
                profObj.dispName = data.DisplayName;
            }
            if (data.Description) {
                profObj.description = data.Description;
            }
            if (data.Image) {
                profObj.dispImage = data.Image;
            }
    
            if ((typeof callback !== "undefined") && $.isFunction(callback)) {
                callback(profObj);
            }
        }).fail(function(error) {
            Common.getProfileDefaultAPI(url).done(function(data) {
                if (data.DisplayName) {
                    profObj.dispName = data.DisplayName;
                }
                if (data.Description) {
                    profObj.description = data.Description;
                }
                if (data.Image) {
                    profObj.dispImage = data.Image;
                }
            }).always(function() {
                if ((typeof callback !== "undefined") && $.isFunction(callback)) {
                    callback(profObj);
                }
            })
        });  
    })
};

Common.getProfileLocalesAPI = function(url) {
    return $.ajax({
        type: "GET",
        url: url + '__/locales/' + i18next.language + '/profile.json',
        dataType: 'json',
        headers: {'Accept':'application/json'}
    })
}

Common.getProfileDefaultAPI = function(url) {
    return $.ajax({
        type: "GET",
        url: url + '__/profile.json',
        dataType: 'json',
        headers: {'Accept':'application/json'}
    });
}

Common.appendAllowedCellList = function(extUrl, dispName, no) {
    $("#allowedCellList")
        .append('<tr id="deleteExtCellRel' + no + '"><td class="paddingTd">' + dispName + '</td><td><button onClick="Common.notAllowedCell(this)" data-ext-url="' + extUrl + '"data-i18n="btn.release">' + '</button></td></tr>')
        .localize();
};

Common.notAllowedCell = function(aDom) {
    let extUrl = $(aDom).data("extUrl");
    Common.deleteExtCellLinkRelation(extUrl, getAppRole()).done(function() {
        $(aDom).closest("tr").remove();
    });
};

Common.deleteExtCellLinkRelation = function(extCell, relName) {
    var cellUrlCnv = encodeURIComponent(extCell);
    return $.ajax({
        type: "DELETE",
        url: Common.getCellUrl() + '__ctl/ExtCell(\'' + cellUrlCnv + '\')/$links/_Role(Name=\'' + relName + '\',_Box.Name=\'' + Common.getBoxName() + '\')',
        headers: {
            'Authorization':'Bearer ' + Common.getToken()
        }
    });
};

Common.getOtherAllowedCells = function() {
    Common.getExtCell().done(function(json) {
        var objSel = document.getElementById("otherAllowedCells");
        if (objSel.hasChildNodes()) {
            while (objSel.childNodes.length > 0) {
                objSel.removeChild(objSel.firstChild);
            }
        }
/*
        objSel = document.getElementById("requestCells");
        if (objSel.hasChildNodes()) {
            while (objSel.childNodes.length > 0) {
                objSel.removeChild(objSel.firstChild);
            }
        }      
*/
        var results = json.d.results;
        if (results.length > 0) {
            results.sort(function(val1, val2) {
                return (val1.Url < val2.Url ? 1 : -1);
            })

            for (var i in results) {
                var url = Common.changeLocalUnitToUnitUrl(results[i].Url);
                Common.dispOtherAllowedCells(url, i);
            }
        }
    });
};

Common.getExtCell = function() {
    return $.ajax({
        type: "GET",
        url: Common.getCellUrl() + '__ctl/ExtCell',
        headers: {
            'Authorization':'Bearer ' + Common.getToken(),
            'Accept':'application/json'
        }
    });
};

Common.dispOtherAllowedCells = function(extUrl, no) {
    Common.getProfileName(extUrl, Common.prepareExtCellForApp, no);
};

Common.getProfileName = function(extUrl, callback, no) {
    let number = no;
    Common.getProfile(extUrl, function(profObj) {
        console.log(profObj.dispName);
        if ((typeof callback !== "undefined") && $.isFunction(callback)) {
            callback(extUrl, profObj, number);
        }
    });
};

/*
 * Get Transcell Token of the external Cell and prepare its data.
 * When done, execute callback (add external Cell to proper list).
 */
Common.prepareExtCellForApp = function(extUrl, profObj, no) {
    $.when(Common.getTranscellToken(extUrl), Common.getAppAuthToken(extUrl))
        .done(function(result1, result2) {
            let tempTCAT = result1[0].access_token; // Transcell Access Token
            let tempAAAT = result2[0].access_token; // App Authentication Access Token
            Common.perpareExtCellInfo(extUrl, tempTCAT, tempAAAT, Common.appendExtCellToList, profObj.dispName, profObj.dispImage, no);
        })
};

/*
 * Perform the followings for an external Cell:
 * 1. Get access token for protected box(es) which is accessible by the App.
 * 2. Get Box URL.
 * 3. Execute callback (add external Cell to proper list).
 */
Common.perpareExtCellInfo = function(cellUrl, tcat, aaat, callback, dispName, dispImage, no) {
    Common.getProtectedBoxAccessToken4ExtCell(cellUrl, tcat, aaat).done(function(appCellToken) {
        Common.getBoxUrlAPI(cellUrl, appCellToken.access_token)
            .done(function(data, textStatus, request) {
                let tempInfo = {
                    data: data,
                    request: request,
                    targetCellUrl: cellUrl
                };
                let boxUrl = Common.getBoxUrlFromResponse(tempInfo);
                console.log(boxUrl);

                if ((typeof callback !== "undefined") && $.isFunction(callback)) {
                    callback(boxUrl, tcat, cellUrl, dispName, dispImage, no);
                }
            })
            .fail(function(error) {
                console.log(error.responseJSON.code);
                console.log(error.responseJSON.message.value);
            });
    }).fail(function(error) {
        console.log(error.responseJSON.code);
        console.log(error.responseJSON.message.value);
    });
};

/* 
 * Check and append the external Cell to either fo the following lists.
 * - List contains Cell which has read permission
 * - List contains Cell which does not has read permission
 */
Common.appendExtCellToList = function(extBoxUrl, extTcat, extUrl, dispName, dispImage, no) {
    let onclick = "Common.execOtherApp('"+extUrl+"');";
    let noId = no;
    let appendId = "otherAllowedCells";
    let notDispFlg = false;
    Common.getAppDataAPI(extBoxUrl, extTcat)
        .fail(function(data) {
            // Insufficient access privileges
            if (data.status === 403) {
                noId = "Share" + no;
                onclick = "dispSendCellInfo('"+extUrl+"');";
                appendId = "sendSharingCells";
            } else {
                notDispFlg = true;
            }
        }).always(function() {
            if (!notDispFlg && !$("#otherCell" + noId).length) {
                if (Object.keys(reqReceivedUUID).length > 0) {
                    noId = "Share" + no;
                    appendId = "sendSharingCells";
                    onclick = "dispReceivedCellInfo('"+extUrl+"', '"+reqReceivedUUID[no]+"', 'otherCell"+noId+"', '"+reqRequestAuthority[no]+"');";
                }

                let html = Common.createOtherCells(extUrl, dispName, dispImage, noId, onclick);
                $("#" + appendId).append(html);
            }
            $('body > div.mySpinner').hide();
        });
};

Common.getTranscellToken = function(extCellUrl) {
    return $.ajax({
        type: "POST",
        url: Common.getCellUrl() + '__token',
        processData: true,
        dataType: 'json',
        data: {
            grant_type: "refresh_token",
            refresh_token: Common.getRefressToken(),
            p_target: extCellUrl
        },
        headers: {
            'Accept':'application/json',
            'content-type': 'application/x-www-form-urlencoded'
        }
    });
};

Common.getAppDataAPI = function(targetBoxUrl, token) {
    let requestInfo = $.extend(true,
        {
            type: 'GET',
            url: targetBoxUrl + getAppDataPath(),
            headers: {
                    'Authorization':'Bearer ' + token,
                    'Accept':'application/json'
            }
        },
        getAppRequestInfo()
    );

    return $.ajax(requestInfo);
};

Common.createOtherCells = function(extUrl, dispName, dispImage, no, onclick) {
    let html = [
        '<li id="otherCell' + no + '">',
            '<a href="javascript:void(0)" onClick="'+onclick+'">',
                '<div class="pn-list">',
                    '<div class="pn-list-icon">',
                        '<img src="'+dispImage+'">',
                    '</div>',
                    '<div class="account-info">',
                        '<div class="user-name">'+dispName+'</div>',
                        '<div>',
                            '<span data-i18n="RegistrationDate"></span>',
                            '<span></span>',
                        '</div>',
                    '</div>',
                '</div>',
            '</a>',
        '</li>'
    ].join("");
    return html;
};

Common.execOtherApp = function(extUrl) {
    let childWindow = window.open('about:blank');
    let url = location.href;
    let urlMatch = url.match(/targetCell=(.+)$/);
    if (urlMatch) {
        let delStr = urlMatch[1];
        url = url.replace(delStr, "");
    } else {
        url = url + "&targetCell=";
    }
    url = url + extUrl;

    childWindow.location.href = url;
    childWindow = null;
}

Common.appendRequestCells = function(extUrl, dispName) {
    $("#requestCells").append('<option value="' + extUrl + '">' + dispName + '</option>');
    $("#bSendAllowed").prop("disabled", false);
};

/*
 * When the following conditions are satisfied, there is no need to include App URL when specifying the role/relation name.
 * 1. BoxBound must set to true
 * 2. Authorization token must be App authenticated token
 */
Common.sendMessageAPI = function(uuid, extCell, type, title, body, reqType, reqRel, reqRelTar) {
    var data = {};
    data.BoxBound = true;
    data.InReplyTo = uuid;
    data.To = extCell;
    data.ToRelation = null
    data.Type = type;
    data.Title = title;
    data.Body = body;
    data.Priority = 3;
    if (reqType) {
        data.RequestObjects = [];
        let objArray = {};
        objArray.RequestType = reqType;
        objArray.Name = reqRel;
        objArray.TargetUrl = reqRelTar;
        data.RequestObjects.push(objArray);
    }

    return $.ajax({
        type: "POST",
        url: Common.getCellUrl() + '__message/send',
        data: JSON.stringify(data),
        headers: {
            'Authorization':'Bearer ' + Common.getToken()
        }
    })
};
