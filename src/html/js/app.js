const APP_URL = "https://demo.personium.io/app-personium-calendar/";
const APP_BOX_NAME = 'app-personium-calendar';
PCalendar = {};
sDateObj = moment().startOf('month');
eDateObj = moment().endOf('month');
dispListName = "";
scheduleDispNum = 10;
scheduleSkipPrev = 0;
scheduleSkipNext = 0;

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

    syncData();

    $('body').on('change', '#setting-panel2 input[type=radio][name=srcType]', function(){
        let srcType = this.value;
        switch(srcType) {
        case 'Google':
        case 'Office365':
            $('#pwCalendarAccount')
                .val('')
                .prop('disabled', true);
            break;
        default:
            $('#pwCalendarAccount')
                .val('')
                .prop('disabled', false);
        }
        $('#idCalendarAccount').val('');
    });
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
};

setTitleMenu = function(title, flg) {
    if (i18next.exists(title)) {
        $("#settingTitleMenu").html('<h4 class="ellipsisText" data-i18n="' + title + '"></h4>').localize();
    } else {
        $("#settingTitleMenu").html('<h4 class="ellipsisText">' + title + '</h4>');
    }
    var titles = Common.settingNowTitle;
    titles[Common.settingNowPage] = title;
    Common.settingNowTitle = titles;
};

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
        console.log(error.responseJSON);
        Common.openWarningDialog(
            'warningDialog.title',
            error.responseJSON.error || error.responseJSON.message.value,
            function(){ $('#modal-common').modal('hide')}
        );
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
            right: 'schedule,agendaDay,month'
        },

        // customize the button names,
        // otherwise they'd all just say "list"
        buttonText: {
            today: "今日"
        },
        allDayText: "終日",
        views: {
            schedule: { 
                buttonText: 'スケジュール',
                type: 'list',
                visibleRange: {
                    start: moment(moment().unix()).format("YYYY-MM-DD"),
                    end: moment().add(21, "year").startOf("year").format("YYYY-MM-DD")
                }
                ,titleFormat: "[" + moment().locale("ja").format("LL") + "]"
                ,listDayFormat: "MM月DD日[(]ddd[)]"
            },
            agendaDay: { buttonText: '日' },
            month: { 
                buttonText: '月',
                titleFormat: "YYYY年MM月"
            }
        },
        height: "parent",
        locale: 'ja',
        defaultView: 'schedule',
        defaultDate: moment().format(),
        timeFormat: 'H:mm' ,
        navLinks: true, // can click day/week names to navigate views
        editable: true,
        eventLimit: true, // allow "more" link when too many events
        viewRender: function(currentView) {
                    dispListName = currentView.name;
                    if (currentView.name != "schedule") {
                        sDateObj = moment(currentView.start.valueOf());
                        eDateObj = moment(currentView.end.valueOf());
                        getListOfVEvents();
                    } else {
                        scheduleSkipPrev = 0;
                        scheduleSkipNext = 0;
                        $(".fc-scroller").on("scroll", function() {
                            // 表示領域の下端の位置
                            var bottom = this.scrollTop + this.clientHeight;
                            // 末尾の要素の上端の位置
                            var top = $(".fc-list-heading").filter(":last")[0].offsetTop - this.offsetTop;
                            if( top < bottom )
                            {
                                getListOfVEventsSchedule(true);
                                let eventArray = $('#calendar').fullCalendar('clientEvents');
                            } else if (this.scrollTop == 0) {
                                let firstDate = $(".fc-list-heading").filter(":first").data("date");
                                getListOfVEventsSchedule(false, firstDate);
                            }
                        })

                        $('#calendar').fullCalendar('removeEvents');
                        $(".fc-prev-button").addClass('fc-state-disabled');
                        $(".fc-next-button").addClass('fc-state-disabled');
                        getListOfVEventsScheduleInit();
                    }
                },
        eventClick: function(calEvent, jsEvent, view) {
            return PCalendar.displayEditVEventDialog(calEvent, jsEvent, view);
        }
    });
};

addButtonClick = function() {
    getAccountList().done(function(data) {
        PCalendar.displayAddVEventDialog(data);
    }).fail(function(error) {
        console.log(error.responseJSON);
        Common.openWarningDialog(
            'warningDialog.title',
            error.responseJSON.error || error.responseJSON.message.value,
            function(){ $('#modal-common').modal('hide')}
        );
    });
}

PCalendar.displayCalendarTitle = function(str) {
    return str || i18next.t('glossary:Calendars.No_title');
}

getListOfVEvents = function() {
    let sDate = sDateObj.toISOString();
    let eDate = eDateObj.toISOString();
    let urlOData = Common.getBoxUrl() + 'OData/vevent';
    let filterStr = $.param({
        "$top": 1000,
        "$filter": "dtend ge datetimeoffset'"+sDate+"' and dtstart le datetimeoffset'"+eDate+"'",
        //"$filter": "dtstart ge datetimeoffset'2017-01-01T00:00:00+09:00'",
        "$orderby": "dtstart desc"
    });
    let queryUrl = urlOData + '?' + filterStr;
    let access_token = Common.getToken();
    let listOfEvents = [];
    $('#calendar').fullCalendar('removeEvents');
    
    Common.getListOfOData(queryUrl, access_token)
        .done(function(data) {
            _.each(data.d.results, function(item) { 
                // do something
                let events = $('#calendar').fullCalendar('clientEvents', item.__id)[0];
                if (events) {
                    PCalendar.updateEvent(item);
                } else {
                    //PCalendar.renderEvent(item);
                    listOfEvents.push(PCalendar.prepareEvent(item));
                }
            });
        })
        .always(function(){
            hideSpinner('body');
            $('#calendar').fullCalendar('renderEvents', listOfEvents, true);
        });
};

getListOfVEventsScheduleInit = function() {
    let toDay = moment().startOf("day").toISOString();
    let urlOData = Common.getBoxUrl() + 'OData/vevent';
    let filterStr = $.param({
        "$top": scheduleDispNum*2,
        "$filter": "dtend gt datetimeoffset'"+toDay+"'",
        "$orderby": "dtstart asc"
    });
    let queryUrl = urlOData + '?' + filterStr;
    let access_token = Common.getToken();
    let listOfEvents = [];

    Common.getListOfOData(queryUrl, access_token)
        .done(function(data) {
            if (data.d.results.length > 0) {
                // 未来30件を取得し、先頭の日付をスクロール初期値に設定する
                let currentDate = ""
                scheduleSkipNext = 2;
                _.each(data.d.results, function(item) {
                    if (currentDate == "") {
                        currentDate = item.start;
                        if (currentDate < toDay) {
                            currentDate = moment().startOf("day").format("YYYY-MM-DD");
                        }
                    }

                    // do something
                    listOfEvents.push(PCalendar.prepareEvent(item));
                });
                filterStr = $.param({
                    "$top": scheduleDispNum,
                    "$filter": "dtend le datetimeoffset'"+toDay+"'",
                    "$orderby": "dtend desc"
                });
                queryUrl = urlOData + '?' + filterStr;
                access_token = Common.getToken();
                Common.getListOfOData(queryUrl, access_token)
                    .done(function(data) {
                        if (data.d.results.length > 0) {
                            // 過去30件を取得し、スクロールはcurrentdate
                            scheduleSkipPrev = 1;
                            _.each(data.d.results, function(item) {
                                // do something
                                listOfEvents.push(PCalendar.prepareEvent(item));
                            });
                        }
                    }).always(function(){
                        hideSpinner('body');
                        $('#calendar').fullCalendar('renderEvents', listOfEvents, true);

                        let scrollTop = $('.fc-list-heading[data-date="'+currentDate+'"]')[0].offsetTop;
                        $(".fc-scroller")[0].scrollTop = scrollTop;
                    });
            } else {
                // 過去60件を表示し、スクロールは一番下
                filterStr = $.param({
                    "$top": scheduleDispNum*2,
                    "$filter": "dtend le datetimeoffset'"+toDay+"'",
                    "$orderby": "dtend desc"
                });
                queryUrl = urlOData + '?' + filterStr;
                access_token = Common.getToken();
                listOfEvents = [];
                Common.getListOfOData(queryUrl, access_token)
                    .done(function(data) {
                        scheduleSkipPrev = 2;
                        _.each(data.d.results, function(item) {
                            // do something
                            listOfEvents.push(PCalendar.prepareEvent(item));
                        });
                    }).always(function(){
                        hideSpinner('body');
                        $('#calendar').fullCalendar('renderEvents', listOfEvents, true);

                        $(".fc-scroller")[0].scrollTop = $(".fc-scroller")[0].scrollHeight;
                    });
            }
        });
}
getListOfVEventsSchedule = function(upperFlg, searchDate) {
    let toDay = moment().startOf("day").toISOString();
    let urlOData = Common.getBoxUrl() + 'OData/vevent';
    let filterStr;
    if (upperFlg) {
        filterStr = $.param({
            "$top": scheduleDispNum,
            "$skip": scheduleDispNum*scheduleSkipNext,
            "$filter": "dtend ge datetimeoffset'"+toDay+"'",
            //"$filter": "dtstart ge datetimeoffset'2017-01-01T00:00:00+09:00'",
            "$orderby": "dtstart asc"
        });
    } else {
        filterStr = $.param({
            "$top": scheduleDispNum,
            "$skip": scheduleDispNum*scheduleSkipPrev,
            "$filter": "dtend le datetimeoffset'"+toDay+"'",
            //"$filter": "dtstart ge datetimeoffset'2017-01-01T00:00:00+09:00'",
            "$orderby": "dtend desc"
        });
    }
    
    let queryUrl = urlOData + '?' + filterStr;
    let access_token = Common.getToken();
    let listOfEvents = [];
    
    let delCnt = 0;
    Common.getListOfOData(queryUrl, access_token)
        .done(function(data) {
            let eachFlg = false;
            _.each(data.d.results, function(item) {
                // do something
                let events = $('#calendar').fullCalendar('clientEvents', item.__id)[0];
                if (events) {
                    PCalendar.updateEvent(item);
                } else {
                    //PCalendar.renderEvent(item);
                    listOfEvents.push(PCalendar.prepareEvent(item));
                    if (!eachFlg) {
                        if (upperFlg) {
                            scheduleSkipNext++;
                            //scheduleSkipPrev--;
                        } else {
                            scheduleSkipPrev++;
                            //scheduleSkipNext--;
                        }
                        eachFlg = true;
                    }
                }
            });
        })
        .always(function(){
            hideSpinner('body');
            $('#calendar').fullCalendar('renderEvents', listOfEvents, true);
            if (searchDate) {
                let scrollTop = $('.fc-list-heading[data-date="'+searchDate+'"]')[0].offsetTop;;
                $(".fc-scroller")[0].scrollTop = scrollTop;
            }
        });
};

/*
 * Create event (https://fullcalendar.io/docs/event-object)
 */
PCalendar.renderEvent = function(item) {
    let startMoment = moment(item.dtstart);
    let endMoment = moment(item.dtend);
    let event =
    {
        id: item.__id,
        title: item.summary,
        //allDay: PCalendar.isAllDay(startMoment, endMoment),
        start: item.start,
        end: item.end,
        editable: true,
        color: PCalendar.getEventColor(item.srcType),
        description: item.description,
        vEvent: item
    };
    $('#calendar').fullCalendar('renderEvent', event, true);
};

PCalendar.prepareEvent = function(item) {
    let startMoment = moment(item.dtstart);
    let endMoment = moment(item.dtend);
    let event =
    {
        id: item.__id,
        title: item.summary,
        //allDay: PCalendar.isAllDay(startMoment, endMoment),
        start: item.start,
        end: item.end,
        editable: true,
        color: PCalendar.getEventColor(item.srcType),
        description: item.description,
        vEvent: item
    };
    return event;
};

PCalendar.updateEvent = function(item) {
    let startMoment = moment(item.dtstart);
    let endMoment = moment(item.dtend);
    let eventObj = $('#calendar').fullCalendar('clientEvents', item.__id)[0]; // currently only the first event
    $.extend(
        true,
        eventObj,
    {
        title: item.summary,
            //allDay: PCalendar.isAllDay(startMoment, endMoment),
            start: item.start,
            end: item.end,
        color: PCalendar.getEventColor(item.srcType),
        description: item.description,
        vEvent: item
        }
    );
    // https://fullcalendar.io/docs/updateEvent
    $('#calendar').fullCalendar('updateEvent', eventObj);
};

PCalendar.isAllDay = function(start, end) {
    if ("00:00:00" != start.format("HH:mm:ss")) {
        return false;
    }

    return (end.diff(start, 'days') == 1);
};

PCalendar.getEventColor = function(srcType) {
    switch(srcType) {
    case 'EWS':
        color = '#3366ff';
        break;
    case 'Google':
        color = '#ff3333';
        break;
    case 'Office365':
        color = '#0066ff';
        break;
    default:
        color = '#ccd9ff';
    }

    return color;
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

            console.log(jqXHR.responseJSON);
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
            } else {
                Common.openWarningDialog(
                    'warningDialog.title',
                    jqXHR.responseJSON.error || jqXHR.responseJSON.message.value,
                    function(){ $('#modal-common').modal('hide')}
                );
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
                    '<input type="text" id="idCalendarAccount" name="idCalendarAccount" value="">',
                '</div>',
            '</div>',
            '<div class="row">',
                '<div class="col-sm-1 col-md-1">',
                    '<span data-i18n="glossary:Account.Password"></span>',
                '</div>',
                '<div class="col-sm-11 col-md-11">',
                    '<input type="password" id="pwCalendarAccount" name="pwCalendarAccount" value="">',
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

    let srcType = $('[name=srcType]:checked').val();
    let srcAccountName = $('#idCalendarAccount').val();
    switch(srcType) {
    case 'Google':
    case 'Office365':
        PCalendar.prepareOAuth2Account(srcType, srcAccountName);
        break;
    default:
        setAccessInfoAPI('POST')
            .done(function(data, status, response){
                syncFullData();
            })
            .fail(function(error){
                console.log(error.responseJSON);
                Common.openWarningDialog(
                    'warningDialog.title',
                    error.responseJSON.error || error.responseJSON.message.value,
                    function(){ $('#modal-common').modal('hide')}
                );
                $('#dialogOverlay').hide();
            });
    }

    return false;
};

PCalendar.prepareOAuth2Account = function(srcType, srcAccountName) {
    let pData = setAccountData(srcType, srcAccountName);
    let paramStr = $.param({
        srcType: srcType,
        state: 'hoge',
        userCellUrl: Common.getCellUrl()
    });
    window.location.href = 'https://demo.personium.io/app-personium-calendar/__/Engine/reqOAuthToken?' + paramStr;
};

setAccountData = function(srcType, srcAccountName) {
    let pData;
    pData = {
        srcType: srcType,
        srcAccountName: srcAccountName
    };
    // Save data for later use
    sessionStorage.setItem('pData', JSON.stringify(pData));

    return pData;
};

setAccessInfoAPI = function(method) {
    let srcType = $('[name=srcType]:checked').val();
    let srcUrl = $('#srcUrl').val();
    let srcAccountName = $('#idCalendarAccount').val();
    let pw = $('#pwCalendarAccount').val();
    let tempData = {
        'srcType': srcType,
        //'srcUrl': srcUrl,
        'srcAccountName': srcAccountName,
    };
    $.extend(
        true,
        tempData,
        { 'pw': pw }
    );

    return $.ajax({
        type: method,
        url: Common.getBoxUrl() + 'Engine/setAccessInfo',
        data: tempData,
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
                    console.log(error.responseJSON);
                    Common.openWarningDialog(
                        'warningDialog.title',
                        error.responseJSON.error || error.responseJSON.message.value,
                        function(){ $('#modal-common').modal('hide')}
                    );
                }).always(function(){
                    reRenderCalendar();
                });
            } else {
                syncFullData();
            }
        })
        .fail(function(error){
            console.log(error.responseJSON);
            Common.openWarningDialog(
                'warningDialog.title',
                error.responseJSON.error || error.responseJSON.message.value,
                function(){ $('#modal-common').modal('hide')}
            );
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
                console.log(error.responseJSON);
                Common.openWarningDialog(
                    'warningDialog.title',
                    error.responseJSON.error || error.responseJSON.message.value,
                    function(){ $('#modal-common').modal('hide')}
                );
            });
        })
        .fail(function(error){
            console.log(error.responseJSON);
            Common.openWarningDialog(
                'warningDialog.title',
                error.responseJSON.error || error.responseJSON.message.value,
                function(){ $('#modal-common').modal('hide')}
            );
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
                console.log(error.responseJSON);
                Common.openWarningDialog(
                    'warningDialog.title',
                    error.responseJSON.error || error.responseJSON.message.value,
                    function(){ $('#modal-common').modal('hide')}
                );
            });
        })
        .fail(function(error){
            console.log(error.responseJSON);
            Common.openWarningDialog(
                'warningDialog.title',
                error.responseJSON.error || error.responseJSON.message.value,
                function(){ $('#modal-common').modal('hide')}
            );
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

/*
 * accountList
 * Example:  [{"srcType":"Google","srcAccountName":"john.doe@gmail.com"}]
 */
PCalendar.displayAddVEventDialog = function(accountList) {
    $("body #modalDialogContainer").load(
        "./templates/_vevent_template.html",
        function(responseText, textStatus, jqXHR) {
            $('body #modal-vevent').localize();

            PCalendar.setAccountInfo(accountList[0]);

            $('#dtstart').val(moment().format());
            $('#dtend').val(moment().add(1, 'hours').format());

            PCalendar.addVEventBtnHandler(accountList);

            $('#modal-vevent').modal('show');
        }
    );    
};

PCalendar.setAccountInfo = function(accountInfo) {
    let srcTypeDefault = accountInfo.srcType;
    $('#modal-vevent input[name=srcType][value=' + srcTypeDefault + ']').prop('checked', true);
    let srcAccountNameDefault = accountInfo.srcAccountName;
    $('#modal-vevent #srcAccountName').val(srcAccountNameDefault);
};

PCalendar.addVEventBtnHandler = function(accountList) {
    let listEWS = _.where(accountList, { srcType: 'EWS'});
    let listGoogle = _.where(accountList, { srcType: 'Google'});
    let listOffice365 = _.where(accountList, { srcType: 'Office365'});

    $('#srcTypeEWS').prop('disabled', (listEWS.length == 0));
    $('#srcTypeGOOGLE').prop('disabled', (listGoogle.length == 0));
    $('#srcTypeOffice365').prop('disabled', (listOffice365.length == 0));

    $('#modal-vevent').on('change', 'input[type=radio][name=srcType]', function(){
        console.log('Calendar type clicked. ' + this.value);
        let tempAccountList = accountList;
        let srcType = this.value;
        let tempAccount = _.where(tempAccountList, { srcType: srcType });
        let srcAccountName = tempAccount[0].srcAccountName;
        $('#srcAccountName').val(srcAccountName);
    });

    $('#b-delete-vevent-ok').hide();

    $('#b-save-vevent-ok').click(function(){
        console.log('Add event');
        let tempVEvent = PCalendar.prepareVEvent('POST');
        PCalendar.updateVEventAPI('POST', tempVEvent)
            .done(function(data){
                PCalendar.renderEvent(data);
                $('#modal-vevent').modal('hide');
            })
            .fail(function(error){
                console.log(error.responseJSON);
                $('#modal-vevent').modal('hide');
                Common.openWarningDialog(
                    'warningDialog.title',
                    error.responseJSON.error || error.responseJSON.message.value,
                    function(){
                        $('#modal-common').modal('hide');
                        $('#modal-vevent').modal('show');
                    }
                );
            });
    });
};

PCalendar.displayEditVEventDialog = function(calEvent, jsEvent, view) {
    $("body #modalDialogContainer").load(
        "./templates/_vevent_template.html",
        function(responseText, textStatus, jqXHR) {
            $('body #modal-vevent').localize();

            PCalendar.setEditVEventInfo(calEvent);

            PCalendar.editVEventBtnHandler(calEvent);

            $('#modal-vevent').modal('show');
        }
    );    
};
PCalendar.setEditVEventInfo = function(calEvent) {
    let tempVEvent = calEvent.vEvent;
    $('#modal-vevent input:radio[name=srcType]')
        .val([tempVEvent.srcType])
        .prop('disabled', true);
    $('#modal-vevent #srcAccountName')
        .val(tempVEvent.srcAccountName)
        .prop("readonly", true);
    if (tempVEvent.attendees) {
        $('#modal-vevent #attendees').val(tempVEvent.attendees);
    }
    if (tempVEvent.summary) {
        $('#modal-vevent #summary').val(tempVEvent.summary);
    }
    if (tempVEvent.location) {
        $('#modal-vevent #location').val(tempVEvent.location);
    }
    if (tempVEvent.dtstart) {
        //$('#modal-vevent #dtstart').val(moment(tempVEvent.dtstart).format());
        $('#modal-vevent #dtstart').val(tempVEvent.start);
    }
    if (tempVEvent.dtend) {
        //$('#modal-vevent #dtend').val(moment(tempVEvent.dtend).format());
        $('#modal-vevent #dtend').val(tempVEvent.end);
    }
    if (tempVEvent.description) {
        $('#modal-vevent #description').val(tempVEvent.description);
    }
    if (tempVEvent.organizer) {
        $('#modal-vevent #organizer').val(tempVEvent.organizer);
    } else {
        $('#modal-vevent #organizer').val(tempVEvent.srcAccountName);
    }
};

PCalendar.editVEventBtnHandler = function(calEvent) {
    $('#b-save-vevent-ok').click(function(){
        console.log('Add event');
        let tempVEvent = PCalendar.prepareVEvent('PUT', calEvent.vEvent);
        PCalendar.updateVEventAPI('PUT', tempVEvent)
            .done(function(data){
                PCalendar.updateEvent(data);
                $('#modal-vevent').modal('hide');
            })
            .fail(function(error){
                console.log(error.responseJSON);
                $('#modal-vevent').modal('hide');
                Common.openWarningDialog(
                    'warningDialog.title',
                    error.responseJSON.error || error.responseJSON.message.value,
                    function(){
                        $('#modal-common').modal('hide');
                        $('#modal-vevent').modal('show');
                    }
                );
            });
    });

    $('#b-delete-vevent-ok').click(function() {
        PCalendar.displayVEventDialog(calEvent);
    });
        
};

PCalendar.displayVEventDialog = function(calEvent) {
    let eventId = calEvent.id;
    if (window.confirm('Remove Event: ' + PCalendar.displayCalendarTitle(calEvent.title))) {
        $('#modal-vevent').modal('hide');
        $('#dialogOverlay').show();
        PCalendar.deleteVEventAPI({__id: eventId})
            .done(function(){
                $('#calendar').fullCalendar('removeEvents', eventId);
                
            })
            .fail(function(error){
                console.log(error.responseJSON);
                $('#modal-vevent').modal('hide');
                Common.openWarningDialog(
                    'warningDialog.title',
                    error.responseJSON.error || error.responseJSON.message.value,
                    function(){
                        $('#modal-common').modal('hide');
                        $('#modal-vevent').modal('show');
                    }
                );
            }).done(function(){
                $('#dialogOverlay').hide();
            });  
    } else {
        console.log("Cancelled");
    };
    return false;
};

/*
 *     let requiredParams = {
        'srcType': 'Google',
        'srcAccountName':'dixon.siu@gmail.com',
        'dtstart': '2018-03-29T21:14:26+09:00', //'2018-03-29T11:00:00Z',
        'dtend': '2018-03-29T21:14:26+09:00', //'2018-03-29T15:00:00Z',
        'organizer': 'hoge'
    };
    let optionalParams = {
        'summary': 'IT_0327',
        'description': '',
        'location': '',
        'attendees': []
    };
 */
PCalendar.prepareVEvent = function(method, tempVEvent) {
    let tempData = {
        srcType: $('#modal-vevent [name=srcType]:checked').val(),
        srcAccountName: $('#srcAccountName').val(),
        start: $('#dtstart').val(),
        end: $('#dtend').val(),
        dtstart: moment($('#dtstart').val()).toISOString(),
        dtend: moment($('#dtend').val()).toISOString(),
        organizer: $('#organizer').val() || $('#srcAccountName').val(), // Usually the organizer is the account owner
        summary: $('#summary').val(),
        description: $('#description').val(),
        location: $('#location').val(),
        attendees: $('#attendees').val()
    };
    let requiredParams = {};
    let optionalParams = {};
    
    if (method == 'POST') {
        // do something
        $.extend(true, tempData, requiredParams, optionalParams);
    } else {
        // PUT
        $.extend(true, tempData, requiredParams, optionalParams, { __id: tempVEvent.__id});
    }

    return tempData;
};

/*
 * POST or PUT
 */
PCalendar.updateVEventAPI = function(method, tempVEvent) {
    return $.ajax({
        type: method,
        url: Common.getBoxUrl() + 'UpdateEngine/updateVEvent',
        data: tempVEvent,
        headers: {
            'Accept':'application/json',
            'Authorization':'Bearer ' + Common.getToken()
        }
    });
};

PCalendar.deleteVEventAPI = function(tempVEvent) {
    return $.ajax({
        type: "DELETE",
        url: Common.getBoxUrl() + 'UpdateEngine/updateVEvent' + '?' + $.param(tempVEvent),
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
    if (dispListName != "schedule") {
        getListOfVEvents();
    } else {
        getListOfVEventsScheduleInit();
    }
};
