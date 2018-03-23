const APP_URL = "https://nks18.zetta.flab.fujitsu.co.jp/app-personium-calendar/";
const APP_BOX_NAME = 'app-personium-calendar';

getEngineEndPoint = function() {
    return Common.getAppCellUrl() + "__/html/Engine/getAppAuthToken";
};

getNamesapces = function() {
    return ['common', 'glossary'];
};

additionalCallback = function() {
    $('#dvOverlay').on('click', function() {
        Common.closeSlide();
    });

    Common.setIdleTime();

    Common.getProfileName(Common.getCellUrl(), displayMyDisplayName);
    createTitleHeader(true, true);

    renderFullCalendar();

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
    var titleId = "titleMenu";
    if (settingFlg) {
        setHtmlId = ".setting-header";
        backMenuId = "settingBackMenu";
        backTitleId = "settingBackTitle";
        titleId = "settingTitleMenu";
    }
    
    let backBtn = createBackBtn(backMenuId);
    let backBtnTitle = createBackBtnTitle(backTitleId);
    let title = $('<div>', {
        id: titleId,
        class: 'col-xs-6 text-center title'
    });
    let editMenu = createEditMenu(menuFlg);

    $(setHtmlId)
        .append($(editMenu), $(backBtn), $(backBtnTitle), $(title))
        .localize();
};

createBackBtn = function(backMenuId) {
    let backIcon = $('<i>', {
        class: 'fa fa-chevron-left',
        'aria-hidden': 'true'
    });

    let aTag = $('<a>', {
        class: 'allToggle prev-icon',
        href: '#',
        onClick: 'moveBackahead();return false;'
    });
    aTag.append($(backIcon));

    let backDom = $('<div>', {
        id: backMenuId,
        class: 'col-xs-1'
    });
    backDom.append($(aTag));

    return backDom;
};

createBackBtnTitle = function(backTitleId) {
    let aTd = $('<td>', {
        id: backTitleId,
        class: 'ellipsisText',
        align: 'left'
    });

    let aRow = $('<tr>', {
        style: 'vertical-align: middle;'
    });
    aRow.append($(aTd));

    let aTable = $('<table>', {
        class: 'table-fixed back-title'
    });
    aTable.append($(aRow));

    let aDiv = $('<div>', {
        class: 'col-xs-2'
    });
    aDiv.append($(aTable));

    return aDiv;
};

createEditMenu = function(menuFlg) {
    let editMenu = $('<div>', {
        class: 'col-xs-3 text-right edit-menu'
    });

    if (menuFlg) {
        let editButton = $('<a>', {
            href: '#',
            onClick: 'toggleEditMenu(this);',
            'data-item-btn-viewable': 'true',
            'data-i18n': 'btn.edit'
        });
        let finishButton = $('<a>', {
            href: '#',
            onClick: 'toggleEditMenu(this);',
            'data-item-btn-viewable': 'false',
            'data-i18n': 'btn.finish',
            style: 'display:none;'
        });
        
        editMenu.append($(editButton), $(finishButton));
    }

    return editMenu;
};

toggleEditMenu = function(aDom) {
    $(aDom)
        .toggle()
        .siblings().toggle();
    let showBtn = $(aDom).data('item-btn-viewable');
    $('.account-item .del-icon, .account-item .edit-icon').toggle(showBtn);

    if (!showBtn) {
        // hide delete button explicitly
        $('.account-item .del-button').hide();
    }
};

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
            $('.edit-menu').show();
            $("#setting-panel" + no).toggleClass("slide-on");
            $("#setting-panel" + (no - 1)).toggleClass("slide-on-holder");
            break;
    }

    Common.settingNowPage = no - 1;
    if (Common.settingNowPage >= 1) {
        setTitleMenu(Common.settingNowTitle[Common.settingNowPage], true);
    }
};

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
    if (Common.settingNowPage == 2) {
        $('.edit-menu').hide();
    }
    if (document.getElementById('setting-panel' + Common.settingNowPage) == null) {
        $("#" + boardId).append('<div style="height:100%;overflow:auto;padding-bottom:85px;" class="panel list-group ' + toggleClass + '" id="setting-panel' + Common.settingNowPage + '"></div>');
    }
    if (document.getElementById('setting-panel' + (Common.settingNowPage + 1)) == null) {
        $("#" + boardId).append('<div style="height:100%;overflow:auto;padding-bottom:85px;" class="panel list-group toggle-panel" id="setting-panel' + (Common.settingNowPage + 1) + '"></div>');
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
    Common.closeSlide();
    $("#setting-panel1").remove();
    setBackahead(true);
    setTitleMenu("glossary:Account.label", true);
    setEditMenu(true);
    $("#setting-panel1").empty();
    $("#setting-panel1").append('<div class="panel-body"></div>');
    let html = [
        '<div class="list-group-item button-row">',
            '<a href="#" class="allToggle" onClick="displayAccountRegistrationDialog()" data-i18n="glossary:Account.Register.label"></a>',
        '</div>'].join('');
    $("#setting-panel1 > .panel-body").append(html).localize();
    getAccountList().done(function(data) {
        dispAccountList(data);
    }).fail(function(error) {
        console.log(error);
    }).always(function(){
        $(".setting-menu").toggleClass('slide-on');
    });
};

setEditMenu = function(menuFlg) {
    $(".header-menu .edit-menu").remove();
    $('.setting-header')
        .append($(createEditMenu(menuFlg)))
        .localize();
};

getAccountList = function() {
    return getAccessInfoAPI();
};

getAccessInfoAPI = function() {
    return $.ajax({
        type: "GET",
        url: Common.getBoxUrl() + 'Engine/setAccessInfo',
        headers: {
            'Accept':'application/json',
            'Authorization':'Bearer ' + Common.getToken()
        }
    });
};

dispAccountList = function(results) {
    let html = '';
    $("#setting-panel1 > .panel-body > .account-item").remove();
    for (var i = 0; i < results.length; i++) {
        var acc = results[i];      

        let aRow = $('<tr>')
            .data('account-info', acc)
            .append($(createDeleteIcon()), $(createInfoTd(i, acc)), $(createEditBtn()), $(createDeleteBtn()));

        let aTable = $('<table>', {
            style: 'width: 100%;'
        });
        aTable.append($(aRow));

        let aDiv = $('<div>', {
            class: 'list-group-item account-item',
            'data-account-info': acc
        });

        aDiv
            .append($(aTable))
            .insertBefore('#setting-panel1 > .panel-body > .button-row');
    }
    $('#setting-panel1 > .panel-body > .account-item').localize();
};

createInfoTd = function(i, accountInfo) {
    let typeImg = "https://demo.personium.io/HomeApplication/__/icons/ico_user_00.png";
    if (accountInfo.srcType !== "EWS") {
        typeImg = "https://demo.personium.io/HomeApplication/__/icons/ico_user_01.png";
    }
    let aImg = $('<img>', {
        class: 'image-circle-small',
        src: typeImg
    });

    let aAnchor = $('<a>', {
        class: 'ellipsisText'
    }).html(accountInfo.srcAccountName);
    aAnchor.append($(aImg));

    let aInfoTd = $('<td>', {
        style: 'width: 80%;',
        onClick: 'return hideDeleteButton(this);'
    });
    aInfoTd.append($(aAnchor));

    return aInfoTd;
};

createEditBtn = function() {
    let barIcon = $('<i>', {
        class: 'fa fa-bars fa-2x fa-fw',
        'aria-hidden': 'true'
    });

    let aEditBtn = $('<a>', {
        class: 'list-group-button',
        href: '#',
        onClick: 'return displayAccountModificationDialog(this);',
        'data-i18n': '[title]glossary:Account.Edit.label'
    });
    aEditBtn.append($(barIcon));

    let aEditTd = $('<td>', {
        class: 'edit-icon'
    });
    aEditTd.append($(aEditBtn));

    return aEditTd;
};

/*
 * Render the delete icon.
 * It acts like a confirm dialog.
 * When this icon is clicked, a delete button will be displayed.
 * Clicking the delete button will delete the entry without prompting for another confirmation
 */
createDeleteIcon = function() {
    let minusCircleIcon = $('<i>', {
        class: 'fa fa-minus-circle fa-2x',
        'aria-hidden': 'true'
    });

    let aDeleteIcon = $('<a>', {
        class: 'list-group-button',
        href: '#',
        onClick: 'return displayDeleteButton(this);'
    });
    aDeleteIcon.append($(minusCircleIcon));

    let aDeleteTd = $('<td>', {
        class: 'del-icon'
    });
    aDeleteTd.append($(aDeleteIcon));

    return aDeleteTd;
};

displayDeleteButton = function(aDom) {
    $(aDom).closest('td').hide();
    $(aDom).closest('tr').find('.del-button').closest('td').show();
};

hideDeleteButton = function(aDom) {
    if ($('.account-item .edit-icon').is(":visible")) {
        $(aDom).closest('tr').find('.del-button').closest('td').hide();
        $(aDom).closest('tr').find('.del-icon').closest('td').show();
    }
};

/*
 * <a class="del-button list-group-item" href="#"
 */
createDeleteBtn = function() {
    let aDeleteBtn = $('<a>', {
        class: 'list-group-button',
        href: '#',
        onClick: 'return deleteAccessInfo(this);',
        'data-i18n': 'glossary:Account.Delete.label'
    });

    let aDeleteTd = $('<td>', {
        class: 'del-button'
    });
    aDeleteTd.append($(aDeleteBtn));

    return aDeleteTd;
};

renderFullCalendar = function() {
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
        events: []
    });
};

getListOfVEvents = function() {
    let urlOData = Common.getBoxUrl() + 'OData/vevent';
    let filterStr = $.param({
        "$top": 300,
        "$filter": "dtstart ge datetimeoffset'2018-01-01T00:00:00+09:00'",
        "$orderby": "dtstart asc"
    });
    let queryUrl = urlOData + '?' + filterStr;
    let access_token = Common.getToken();
    Common.getListOfOData(queryUrl, access_token)
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
            hideSpinner('body');
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
                if (data.status == 'OK') {
                    Common.stopAnimation();
                    console.log('hotfix: sync.js bug');
                    return false;
                }

                if (data.syncCompleted) {
                    reRenderCalendar();
                    Common.stopAnimation();
                } else {
                    // continue
                    console.log("sync in progress");
                    syncData();
                }
            }
        })
        .fail(function(jqXHR, textStatus, errorThrown){
            Common.stopAnimation();

            console.log(jqXHR.responseJSON.error);
            if ((jqXHR.status == '400') && (jqXHR.responseJSON.srcType)) {
                let srcType = jqXHR.responseJSON.srcType;
                let accountInfo;
                Common.openSlide();
                displayAccountPanel();

                $('.list-group-item.account-item tr').each(function(index) {
                    if (accountInfo.srcType == srcType) {
                        accountInfo = $(this).data('account-info');
                        return false;
                    }
                });

                if (accountInfo) {
                    // Display edit account panel
                    displayAccountModificationDialog(null, accountInfo);
                }
            }
        });
};

sync = function() {
    return $.ajax({
        type: "GET",
        url: Common.getBoxUrl() + 'SyncEngine/sync',
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
                    '<span data-i18n="glossary:Account.type"></span>',
                '</div>',
                '<div class="col-sm-11 col-md-11">',
                    '<div class="row">',
                        '<div class="col-sm-4 col-md-4">',
                            '<input type="radio" id="srcTypeEWS" name="srcType" value="EWS" checked>',
                            '<label for="srcTypeEWS" data-i18n="glossary:Account.types.EWS"></label>',
                        '</div>',
                        '<div class="col-sm-4 col-md-4">',
                            '<input type="radio" id="srcTypeGOOGLE" name="srcType" value="Google">',
                            '<label for="srcTypeGOOGLE" data-i18n="glossary:Account.types.Google"></label>',
                        '</div>',
                        '<div class="col-sm-4 col-md-4">',
                            '<input type="radio" id="srcTypeOffice365" name="srcType" value="Office365">',
                            '<label for="srcTypeOffice365" data-i18n="glossary:Account.types.Office365"></label>',
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
                    '<span data-i18n="glossary:Account.ID"></span>',
                '</div>',
                '<div class="col-sm-11 col-md-11">',
                    '<input type="text" id="idCalendarAccount" name="idCalendarAccount">',
                '</div>',
            '</div>',
            '<div class="row">',
                '<div class="col-sm-1 col-md-1">',
                    '<span data-i18n="glossary:Account.Password"></span>',
                '</div>',
                '<div class="col-sm-11 col-md-11">',
                    '<input type="password" id="pwCalendarAccount" name="pwCalendarAccount">',
                '</div>',
            '</div>',
        '</div>',
        '<div class="modal-footer">',
            '<button type="button" class="btn btn-default" onClick="moveBackahead(true);" data-i18n="btn.cancel"></button>',
            '<button type="button" class="btn btn-primary" id="b-add-account-ok" onClick="return registerAccount();" data-i18n="glossary:Account.Register.btnOK"></button>',
        '</div>'
    ].join("");
    $("#setting-panel2")
        .append(html)
        .localize();

    $("#setting-panel2").toggleClass('slide-on');
    $("#setting-panel1").toggleClass('slide-on-holder');
    setTitleMenu("glossary:Account.Register.title", true);
};

registerAccount = function() {
    // show spinner
    $('#dialogOverlay').show();

    setAccessInfoAPI('POST')
        .done(function(data, status, response){
            syncFullData();
        })
        .fail(function(error){
            console.log(error.responseJSON.error);
            $('#dialogOverlay').hide();
        });

    return false;
};

setAccessInfoAPI = function(method) {
    let srcType = $('[name=srcType]:checked').val();
    let srcUrl = $('#srcUrl').val();
    let srcAccountName = $('#idCalendarAccount').val();
    let pw = $('#pwCalendarAccount').val();
    return $.ajax({
        type: method,
        url: Common.getBoxUrl() + 'Engine/setAccessInfo',
        data: {
            'srcType': srcType,
            //'srcUrl': srcUrl,
            'srcAccountName': srcAccountName,
            'pw': pw
        },
        headers: {
            'Accept':'application/json',
            'Authorization':'Bearer ' + Common.getToken()
        }
    });
};

syncFullData = function() {
    sync()
        .done(function(data, status, response){
            if (data.syncCompleted) {
                $('#dialogOverlay').hide();
                moveBackahead(true);
                // Rerender the account list
                getAccountList().done(function(data) {
                    dispAccountList(data);
                }).fail(function(error) {
                    console.log(error.responseJSON.error);
                }).always(function(){
                    reRenderCalendar();
                });
            } else {
                syncFullData();
            }
        })
        .fail(function(error){
            console.log(error.responseJSON.error);
            $('#dialogOverlay').hide();
        });
};

displayAccountModificationDialog = function(aDom, accountInfo) {
    if (aDom) {
        accountInfo = $(aDom).closest("tr").data('account-info');
    }
    console.log(accountInfo.srcAccountName);
    
    setBackahead(true);

    $("#setting-panel2").empty();

    var html = [
        '<div class="modal-body">',
            '<div class="row">',
                '<div class="col-sm-1 col-md-1">',
                    '<span data-i18n="glossary:Account.type"></span>',
                '</div>',
                '<div class="col-sm-11 col-md-11">',
                    '<div class="row">',
                        '<div class="col-sm-4 col-md-4">',
                            '<input type="radio" id="srcTypeEWS" name="srcType" value="EWS" checked>',
                            '<label for="srcTypeEWS" data-i18n="glossary:Account.types.EWS"></label>',
                        '</div>',
                        '<div class="col-sm-4 col-md-4">',
                            '<input type="radio" id="srcTypeGOOGLE" name="srcType" value="Google">',
                            '<label for="srcTypeGOOGLE" data-i18n="glossary:Account.types.Google"></label>',
                        '</div>',
                        '<div class="col-sm-4 col-md-4">',
                            '<input type="radio" id="srcTypeOffice365" name="srcType" value="Office365">',
                            '<label for="srcTypeOffice365" data-i18n="glossary:Account.types.Office365"></label>',
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
                    '<span data-i18n="glossary:Account.ID"></span>',
                '</div>',
                '<div class="col-sm-11 col-md-11">',
                    '<input type="text" id="idCalendarAccount" name="idCalendarAccount">',
                '</div>',
            '</div>',
            '<div class="row">',
                '<div class="col-sm-1 col-md-1">',
                    '<span data-i18n="glossary:Account.Password"></span>',
                '</div>',
                '<div class="col-sm-11 col-md-11">',
                    '<input type="password" id="pwCalendarAccount" name="pwCalendarAccount">',
                '</div>',
            '</div>',
        '</div>',
        '<div class="modal-footer">',
            '<button type="button" class="btn btn-default" onClick="moveBackahead(true);" data-i18n="btn.cancel"></button>',
            '<button type="button" class="btn btn-primary" id="b-add-account-ok" onClick="return modifyAccount();" data-i18n="glossary:Account.Edit.btnOK"></button>',
        '</div>'
    ].join("");
    $("#setting-panel2")
        .append(html)
        .localize();
        
    $('input:radio[name=srcType]')
        .val([accountInfo.srcType])
        .prop('disabled', true);
    $('#idCalendarAccount')
        .val(accountInfo.srcAccountName)
        .prop("readonly", true);

    $("#setting-panel2").toggleClass('slide-on');
    $("#setting-panel1").toggleClass('slide-on-holder');
    setTitleMenu("glossary:Account.Edit.title", true);
};

modifyAccount = function() {
    // show spinner
    $('#dialogOverlay').show();

    setAccessInfoAPI('PUT')
        .done(function(data, status, response){
            $('#dialogOverlay').hide();
            moveBackahead(true);
            // Rerender the account list
            getAccountList().done(function(data) {
                dispAccountList(data);
            }).fail(function(error) {
                console.log(error);
            });
        })
        .fail(function(){
            $('#dialogOverlay').hide();
        });

    return false;
};

displyAccessInfo = function(aDom) {
    let accountInfo = $(aDom).closest("tr").data('account-info');
    console.log(accountInfo.srcAccountName);
    return false;
};

deleteAccessInfo = function(aDom) {
    let accountInfo = $(aDom).closest("tr").data('account-info');
    deleteAccessInfoAPI(accountInfo)
        .done(function(){
            console.log('Finish deleting ' + accountInfo.srcAccountName);
            // Rerender the account list
            getAccountList().done(function(data) {
                dispAccountList(data);
            }).fail(function(error) {
                console.log(error);
            });
        })
        .fail(function(error){
            console.log(error.responseJSON.error);
        });
    return false;
};

deleteAccessInfoAPI = function(accountInfo) {
    return $.ajax({
        type: "DELETE",
        url: Common.getBoxUrl() + 'Engine/setAccessInfo' + '?' + $.param(accountInfo),
        headers: {
            'Accept':'application/json',
            'Authorization':'Bearer ' + Common.getToken()
        }
    });
};

showSpinner = function(cssSelector) {
    $(cssSelector + ' > div.mySpinner').show();
    $(cssSelector + ' > div.myHiddenDiv').hide();
};

hideSpinner = function(cssSelector) {
    $(cssSelector + ' > div.mySpinner').hide();
    $(cssSelector + ' > div.myHiddenDiv').show();
};

reRenderCalendar = function() {
    showSpinner('body');
    $('#calendar').fullCalendar('removeEvents');
    getListOfVEvents();
};
