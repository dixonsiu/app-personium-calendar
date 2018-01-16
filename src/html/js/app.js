const APP_URL = "https://nks18.zetta.flab.fujitsu.co.jp/app-personium-calendar/";

getEngineEndPoint = function() {
    return Common.getAppCellUrl() + "__/html/Engine/getAppAuthToken";
};

getNamesapces = function() {
    return ['common', 'glossary'];
};

additionalCallback = function() {
    $('#dvOverlay').on('click', function() {
        $(".overlay").removeClass('overlay-on');
        $(".slide-menu").removeClass('slide-on');
    });

    Common.setIdleTime();

    Common.getProfileName(Common.getCellUrl(), displayMyDisplayName);
    createTitleHeader(true, false);

    $('#calendar').fullCalendar({
        header: {
            left: 'prev,next today',
            center: 'title',
            right: 'listDay,listWeek,agendaDay,month'
        },

        // customize the button names,
        // otherwise they'd all just say "list"
        views: {
            listDay: { buttonText: 'list day' },
            listWeek: { buttonText: 'list week' }
        },

        defaultView: 'month',
        defaultDate: moment().format(),
        navLinks: true, // can click day/week names to navigate views
        editable: true,
        eventLimit: true, // allow "more" link when too many events
        events: [
            {
                title: 'All Day Event',
                start: '2017-11-01'
            },
            {
                title: 'Long Event',
                start: '2017-11-07',
                end: '2017-11-10'
            },
            {
                id: 999,
                title: 'Repeating Event',
                start: '2017-11-09T16:00:00'
            },
            {
                id: 999,
                title: 'Repeating Event',
                start: '2017-11-16T16:00:00'
            },
            {
                title: 'Conference',
                start: '2017-11-11',
                end: '2017-11-13'
            },
            {
                title: 'Meeting',
                start: '2017-11-12T10:30:00',
                end: '2017-11-12T12:30:00'
            },
            {
                title: 'Lunch',
                start: '2017-11-12T12:00:00'
            },
            {
                title: 'Meeting',
                start: '2017-11-12T14:30:00'
            },
            {
                title: 'Happy Hour',
                start: '2017-11-12T17:30:00'
            },
            {
                title: 'Dinner',
                start: '2017-11-12T20:00:00'
            },
            {
                title: 'Birthday Party',
                start: '2017-11-13T07:00:00'
            },
            {
                title: 'Click for Google',
                url: 'http://google.com/',
                start: '2017-11-28'
            }
        ]
    });

    getListOfVEvents();

    syncData();
};

displayMyDisplayName = function(extUrl, dispName) {
    $("#dispName")
        .attr("data-i18n", "[html]glossary:msg.info.description")
        .localize({
            "name": dispName
        });
};

// Create title header in "header-menu" class
// settingFlg true: Settings false: Default
// menuFlg true: show menu false: hide menu
createTitleHeader = function(settingFlg, menuFlg) {
    var setHtmlId = ".header-menu";
    var backMenuId = "backMenu";
    var backTitleId = "backTitle";
    var titleMenuId = "titleMenu";
    if (settingFlg) {
        setHtmlId = ".setting-header";
        backMenuId = "settingBackMenu";
        backTitleId = "settingBackTitle";
        titleMenuId = "settingTitleMenu";
    }

    var menuHtml = '';
    if (menuFlg) {
        menuHtml = '<a href="#" onClick="toggleSlide();"><img src="https://demo.personium.io/HomeApplication/__/icons/ico_menu.png"></a>';
    }

    var html = '<div class="col-xs-1" id="' + backMenuId + '"></div>';
        html += '<div class="col-xs-2"><table class="table-fixed back-title"><tr style="vertical-align: middle;"><td class="ellipsisText" id="' + backTitleId + '" align="left"></td></tr></table></div>';
        html += '<div class="col-xs-6 text-center title" id="' + titleMenuId + '"></div>';
        html += '<div class="col-xs-3 text-right">' + menuHtml + '</div>';

    $(setHtmlId).html(html);
    createBackMenu();
};

toggleSlide = function() {
//    $(".overlay").toggleClass('overlay-on');
//    $(".slide-menu").toggleClass('slide-on');

    var menu = $('.slide-nav');
    var overlay = $('.overlay');
    var menuWidth = menu.outerWidth();

    menu.toggleClass('open');
    if(menu.hasClass('open')){
        // show menu
        menu.animate({'right' : 0 }, 300);
        overlay.fadeIn();
    } else {
        // hide menu
        menu.animate({'right' : -menuWidth }, 300);
        overlay.fadeOut();
    }
}

createBackMenu = function() {
    var html = '<a href="#" class="allToggle prev-icon" style="float:left;" onClick="moveBackahead();return false;"><img id="imSettingBack" src="https://demo.personium.io/HomeApplication/__/icons/ico_back.png" alt="user"></a>';
    $("#settingBackMenu").html(html);
}

moveBackahead = function() {
    var no = Common.settingNowPage;
    switch (no) {
        case 0:
            window.location.href = cm.user.prevUrl;
            break;
        case 1:
            closeSetting();
            break;
        default:
            $("#setting-panel" + no).toggleClass("slide-on");
            $("#setting-panel" + (no - 1)).toggleClass("slide-on-holder");
            break;
    }

    Common.settingNowPage = no - 1;
    if (Common.settingNowPage >= 1) {
        setTitleMenu(Common.settingNowTitle[Common.settingNowPage], true);
    }
}

closeSetting = function() {
    $(".setting-menu").toggleClass("slide-on");
    $("#settingboard").empty();
    $("#settingBackTitle").empty();
    Common.settingNowPage = 0;
};

setBackahead = function(flg) {
    var boardId = "settingboard";
    Common.settingNowPage = Common.settingNowPage + 1;
    boardId = "settingboard";
    var toggleClass = "toggle-panel";
    if (Common.settingNowPage == 1) {
        // first page
        toggleClass = "panel-default";
    }
    if (document.getElementById('setting-panel' + Common.settingNowPage) == null) {
        $("#" + boardId).append('<div class="panel list-group ' + toggleClass + '" id="setting-panel' + Common.settingNowPage + '"></div>');
    }
    if (document.getElementById('setting-panel' + (Common.settingNowPage + 1)) == null) {
        $("#" + boardId).append('<div class="panel list-group toggle-panel" id="setting-panel' + (Common.settingNowPage + 1) + '"></div>');
    }
}

setTitleMenu = function(title, flg) {
        if (i18next.exists(title)) {
            $("#settingTitleMenu").html('<h4 class="ellipsisText" data-i18n="' + title + '"></h4>').localize();
        } else {
            $("#settingTitleMenu").html('<h4 class="ellipsisText">' + title + '</h4>');
        }
        var titles = Common.settingNowTitle;
        titles[Common.settingNowPage] = title;
        Common.settingNowTitle = titles;
}

/*
 * Display the followings:
 * 1. List of accounts
 * 2. Register account button
 */
displayAccountPanel = function() {
    $("#setting-panel1").remove();
    setBackahead(true);
    //Common.getAccountList().done(function(data) {
        // sample
        var data = [
            {
                "srcType": "EWS",
                "id":"siu.dixon@jp.fujitsu.com"
            },
            {
                "srcType": "Google",
                "srcUrl":"***",
                "id":"dixon.siu@gmail.com"
            }
        ]

        dispAccountList(data);
        $(".setting-menu").toggleClass('slide-on');
        setTitleMenu("glossary:Account.label", true);
    //});
}

getAccountList = function() {
  //return $.ajax({
  //        type: "GET",
  //        url:cm.user.cellUrl + '__ctl/Account',
  //        headers: {
  //          'Authorization':'Bearer ' + cm.user.access_token,
  //          'Accept':'application/json'
  //        }
  //})
}

dispAccountList = function(results) {
  $("#setting-panel1").empty();
  var html = '<div class="panel-body">';
  for (var i = 0; i < results.length; i++) {
    var acc = results[i];
    var type = acc.srcType;
    var typeImg = "https://demo.personium.io/HomeApplication/__/icons/ico_user_00.png";
    if (type !== "EWS") {
        typeImg = "https://demo.personium.io/HomeApplication/__/icons/ico_user_01.png";
    }

    html += '<div class="list-group-item">';
    html += '<table style="width: 100%;"><tr>';
    html += '<td style="width: 80%;"><a href="#" class="ellipsisText" id="accountLinkToRoleToggle' + i + '" onClick="st.createAccountRole(\'' + acc.id + '\',\'' + i + '\')">' + acc.id + '&nbsp;<img class="image-circle-small" src="' + typeImg + '"></a></td>';
    html += '<td style="margin-right:10px;width: 10%;"><a class="edit-button list-group-item" href="#" onClick="st.createEditAccount(\'' + acc.id + '\');return(false)">' + i18next.t("Edit") + '</a></td>'
         + '<td style="width: 10%;"><a class="del-button list-group-item" href="#" onClick="st.dispDelModal(\'' + acc.id + '\');return(false)">' + i18next.t("Del") + '</a></td>';
    html += '</tr></table></div>';
  }
  html += '<div class="list-group-item">';
  html += '<a href="#" class="allToggle" onClick="displayAccountRegistrationDialog()" data-i18n="glossary:CreateAccountPlus.label"></a></div>';
  html += '</div>';
  $("#setting-panel1").append(html).localize();
};

getListOfVEvents = function() {
    let urlOData = Common.getBoxUrl() + 'OData/vevent';
    let tempFilter = '?$orderby=dtstart%20desc';
    let access_token = Common.getToken();
    Common.getListOfOData(urlOData + tempFilter, access_token)
        .done(function(data) {
            _.each(data.d.results, function(item) { 
                // do something
                let startMoment = Common.getMomentString(item.dtstart);
                let endMoment = Common.getMomentString(item.dtend);
                let events = [ { title: item.summary, start: startMoment, end: endMoment }];
                $('#calendar').fullCalendar('addEventSource', events);
            });
        })
        .always(function(){
            $('body > div.mySpinner').hide();
            $('body > div.myHiddenDiv').show();
        });
};

Common.getMomentString = function(dateString) {
    let eventObj = moment(dateString);
    if ("00:00:00" == eventObj.format("HH:mm:ss")) {
        // all day event
        return eventObj.format("YYYY-MM-DD");
    } else {
        return eventObj.format();
    }
};

Common.getListOfOData = function(url, token) {
    return $.ajax({
        type: "GET",
        url:  url,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Accept':'application/json'
        }
    });
};

syncData = function() {
    Common.startAnimation();
    sync()
        .done(function(data, status, response){
            console.log(response.status);
            if (response.status == "204") {
                /*
                 * no setup info
                 * 1. Display Menu->Account List-> Register Account Dialog
                 * 2. Fill form
                 * 3. Call setAccessInfoAPI
                 */
                 Common.stopAnimation();
                 Common.openSlide();
                 displayAccountPanel();
                 displayAccountRegistrationDialog();
            } else {
                
                Common.stopAnimation();
                
                // Currently not implemented
                // Check response
                // if (data.syncCompleted) {
                    // Common.stopAnimation();
                // } else {
                    // // continue
                    // console.log("false");
                // }
            }
        })
        .fail(function(error){
            Common.stopAnimation();
        });
};

sync = function() {
    return $.ajax({
        type: "GET",
        url: Common.getBoxUrl() + 'Engine/sync',
        headers: {
            'Accept':'application/json',
            'Authorization':'Bearer ' + Common.getToken()
        }
    });
};

displayAccountRegistrationDialog = function() {
    setBackahead(true);

    $("#setting-panel2").empty();

    var html = [
        '<div class="modal-body">',
            '<div class="row">',
                '<div class="col-sm-1 col-md-1">',
                    '<span>Type</span>',
                '</div>',
                '<div class="col-sm-11 col-md-11">',
                    '<div class="row">',
                        '<div class="col-sm-6 col-md-6">',
                            '<input type="radio" id="srcTypeEWS" name="srcType" value="EWS" checked>',
                            '<label for="srcTypeEWS">EWS</label>',
                        '</div>',
                        '<div class="col-sm-6 col-md-6">',
                            '<input type="radio" id="srcTypeGOOGLE" name="srcType" value="GOOGLE">',
                            '<label for="srcTypeGOOGLE">GOOGLE</label>',
                        '</div>',
                    '</div>',
                '</div>',
            '</div>',
            /*
            '<div class="row">',
                '<div class="col-sm-1 col-md-1">',
                    '<span>URL</span>',
                '</div>',
                '<div class="col-sm-11 col-md-11">',
                    '<input type="text" id="srcUrl">',
                '</div>',
            '</div>',
            */
            '<div class="row">',
                '<div class="col-sm-1 col-md-1">',
                    '<span>ID</span>',
                '</div>',
                '<div class="col-sm-11 col-md-11">',
                    '<input type="text" id="id">',
                '</div>',
            '</div>',
            '<div class="row">',
                '<div class="col-sm-1 col-md-1">',
                    '<span>Password</span>',
                '</div>',
                '<div class="col-sm-11 col-md-11">',
                    '<input type="password" id="pw">',
                '</div>',
            '</div>',
        '</div>',
        '<div class="modal-footer">',
            '<button type="button" class="btn btn-default" onClick="moveBackahead(true);" data-i18n="btn.cancel"></button>',
            '<button type="button" class="btn btn-primary" id="b-add-account-ok" onClick="return registerAccount();" data-i18n="btn.save"></button>',
        '</div>'
    ].join("");
    $("#setting-panel2")
        .append(html)
        .localize();

    $("#setting-panel2").toggleClass('slide-on');
    $("#setting-panel1").toggleClass('slide-on-holder');
    setTitleMenu("CreateAccount", true);
};

registerAccount = function() {
    // show spinner

    setAccessInfoAPI()
        .done(function(data, status, response){
            if (data.syncCompleted) {
                moveBackahead(true);
            } else {
                registerAccount();
            }
        })
        .fail(function(){
        })
        .always(function(){
            // hide spinner
        });

    return false;
};

setAccessInfoAPI = function() {
    let srcType = $('[name=srcType]:checked').val();
    let srcUrl = $('#srcUrl').val();
    let id = $('#id').val();
    let pw = $('#pw').val();
    return $.ajax({
        type: "POST",
        url: Common.getBoxUrl() + 'Engine/setAccessInfo',
        data: {
            'srcType': srcType,
            //'srcUrl': srcUrl,
            'id': id,
            'pw': pw
        },
        headers: {
            'Accept':'application/json',
            'Authorization':'Bearer ' + Common.getToken()
        }
    });
};
