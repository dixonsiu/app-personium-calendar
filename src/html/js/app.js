const APP_URL = "https://demo.personium.io/app-personium-calendar/";
const APP_BOX_NAME = 'app-personium-calendar';
const DAY_WEEK_TOP = 0;
PCalendar = {};
sDateObj = moment().startOf('month');
eDateObj = moment().endOf('month');
dispListName = "";
scheduleDispNum = 10;
scheduleSkipPrev = 0;
scheduleSkipNext = 0;

/* new */
getEngineEndPoint = function() {
    return Common.getAppCellUrl() + "__/html/Engine/getAppAuthToken";
};

getStartOAuth2EngineEndPoint = function() {
    return Common.getAppCellUrl() + "__/html/Engine/start_oauth2";
};

getNamesapces = function() {
    return ['common', 'glossary'];
};

additionalCallback = function() {
    Drawer_Menu();

    Common.setIdleTime();

    Common.getProfileName(Common.getCellUrl(), displayMyDisplayName);
    createTitleHeader(true, true);

    renderFullCalendar();

    syncData();

    $('#month').on('click', function () {
        $('#calendar').fullCalendar('changeView', 'month');
        ControlFooter($(this));
    });
    $('#day').on('click', function () {
        $('#calendar').fullCalendar('changeView', 'agendaDay');
        ControlFooter($(this));
    });
    $('#list').on('click', function () {
        $('#calendar').fullCalendar('changeView', 'schedule');
        ControlFooter($(this));
    });
    $('#prev').on('click', function () {
      $('#calendar').fullCalendar('prev');
    });
    
    $('#next').on('click', function () {
      $('#calendar').fullCalendar('next');
    });
};

/**
   * ControlFooter
   * @param {*} target 
   */
  function ControlFooter(target) {
    $('.switching-menu').find('.clicked').removeClass('clicked');
    var result = $('.switching-menu').find('.current');
    result.removeClass('current');
    target.addClass('current');
  }

/**
 * Drawer_Menu
 * param:none
 */
Drawer_Menu = function() {
  $('#drawer_btn').on('click', function () {
    Common.openSlide();
    return false;
  });

  $('#menu-background').click(function () {
    Common.closeSlide();
  });

  $('#drawer_menu').click(function (event) {
    event.stopPropagation();
  });
}

/* old */
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
    var wide_line = $('.slide-list-line');
    var line_contents = $('.slide-list-line-contents');
    var a_tag = $('.slide-list-line-contents>a');
    if (!($(aDom).hasClass('editing'))) {
        if (($(aDom).hasClass('edited'))) {
            $(aDom).removeClass('edited');
        }
        
        $(aDom).addClass('editing');
        $('.add-new-account').css('display', 'none');
        line_contents.addClass('edit-ic');
        wide_line.animate({
            'left': '0px'
        }, 500);
    } else if (($(aDom).hasClass('editing')) && !($(aDom).hasClass('edited'))) {
        $(aDom).removeClass('editing');
        $(aDom).addClass('edited');
        wide_line.animate({
            'left': '-70px'
        }, 500);
        $('.add-new-account').css('display', 'block');
        line_contents.removeClass('edit-ic');
        line_contents.removeClass('clear-ic');
        a_tag.removeClass('disabled');
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
    $(".setting-screen").toggleClass("slide-on");
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

displaySyncListPanel = function() {
    Common.closeSlide();
    Common.loadContent("./templates/_list_template.html").done(function(data) {
        var out_html = $($.parseHTML(data));
        $("#loadContent").empty();
        let id = PCalendar.createSubContent(out_html);
        $(id + " .pn-back-btn").hide();
        $(id + " .header-btn-right").hide();
    }).fail(function(error) {
        console.log(error);
    });
}

/*
 * Display the followings:
 * 1. List of accounts
 * 2. Register account button
 */
displayAccountPanel = function() {
    Common.closeSlide();
    Common.loadContent("./templates/_list_template.html").done(function(data) {
        var out_html = $($.parseHTML(data));
        $("#loadContent").empty();
        let id = PCalendar.createSubContent(out_html);
        $(id + " main").empty();
        $("#addAccountFooterButton").removeAttr("onclick").on('click', displayAccountRegistrationDialog);
        getAccountList().done(function(data) {
            dispAccountList(id + " main", data);
        }).fail(function(error) {
            console.log(error.responseJSON);
            Common.openWarningDialog(
                'warningDialog.title',
                error.responseJSON.error || error.responseJSON.message.value,
                function(){ $('#modal-common').modal('hide')}
            );
        });
        $("#addAccountFooterButton").attr("data-i18n", "glossary:Account.Add").localize();
        //$(".myHiddenDiv").hide();
    }).fail(function(error) {
        console.log(error);
    });
};

selectAccountPanel = function() {
    Common.loadContent("./templates/_list_template.html").done(function(data) {
        var out_html = $($.parseHTML(data));
        let id = PCalendar.createSubContent(out_html);
        $(id + " main").empty();
        $("#addAccountFooterButton").removeAttr("onclick").on('click', displayAccountRegistrationDialog);
        getAccountList().done(function(data) {
            dispAccountList(id + " main", data);
        }).fail(function(error) {
            console.log(error.responseJSON);
            Common.openWarningDialog(
                'warningDialog.title',
                error.responseJSON.error || error.responseJSON.message.value,
                function(){ $('#modal-common').modal('hide')}
            );
        }).always(function() {
            $(id + " .slide-list-line-contents").removeAttr("onclick").on('click', function() {
                $("#srcAccountName").text($(this).find("a").text());
                $('#srcAccountName').data("account", $(this).find("a").text());
                $('#srcAccountName').data("type", $(this).find("div").text());
                PCalendar.backSubContent();
            })
        });
        $(id + " .header-btn-right").hide();
        $(id + " footer").hide();

        $("#addAccountFooterButton").attr("data-i18n", "glossary:Account.Add").localize();
        //$(".myHiddenDiv").hide();
    }).fail(function(error) {
        console.log(error);
    });
}

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

dispAccountList = function(id ,results) {
    $(id).empty();
    let aUl = $('<ul>', {
        class: 'slide-list hover-action'
    });
    for (var i = 0; i < results.length; i++) {
        var acc = results[i];

        let aDiv = $('<div>', {
            class: 'slide-list-line pn-list slide-list-no-ic',
            'data-account-info': acc
        }).append($(createDeleteIcon()), $(createInfoTd(i, acc)), $(createDeleteBtn()));

        let aLi = $('<li>')
        .data('account-info', acc)
        .append($(aDiv));

        aUl.append($(aLi));
    }
    $(id).append($(aUl)).localize();
};

createInfoTd = function(i, accountInfo) {
    let aDiv = $('<div>', {
        class: 'account-type'
    }).append(accountInfo.srcType);

    let aAnchor = $('<a>', {
        class: 'ellipsisText'
    }).append(accountInfo.srcAccountName);

    let infoDiv = $('<div>', {
        class: 'slide-list-line-contents pn-list-no-arrow',
        onClick: 'return accountClickEvent(this);'
    }).append($(aAnchor)).append($(aDiv));
    
    return infoDiv;
};

/*
 * Render the delete icon.
 * It acts like a confirm dialog.
 * When this icon is clicked, a delete button will be displayed.
 * Clicking the delete button will delete the entry without prompting for another confirmation
 */
createDeleteIcon = function() {
    let minusCircleIcon = $('<i>', {
        class: 'fas fa-minus-circle fa-2x'
    });

    let aDeleteIcon = $('<button>', {
        class: 'delete-check-btn',
        onClick: 'return displayDeleteButton(this);'
    });
    aDeleteIcon.append($(minusCircleIcon));

    return aDeleteIcon;
};

displayDeleteButton = function(aDom) {
    var a_tag = $('.slide-list-line-contents>a');
    a_tag.addClass('disabled');
    $(aDom).parent().animate({
      'left': '-170px'
    }, 500);
    $(aDom).next().addClass('clear-ic');
};

accountClickEvent = function(aDom) {
    if ($(aDom).hasClass('clear-ic')) {
        var wide_line = $(aDom).closest('.slide-list-line');

        // Processing being edited
        if ($(aDom).hasClass('clear-ic')) {
            wide_line.animate({
                'left': '0px'
            }, 500);
            $(aDom).removeClass('clear-ic');
        }
    } else if ($(aDom).hasClass('edit-ic')) {
        let accountInfo = $(aDom).closest("li").data('account-info');
        if (accountInfo.srcType == "EWS") {
            displayAccountModificationDialog(aDom, accountInfo);
        }
    }
}

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
    let aDeleteBtn = $('<button>', {
        class: 'line-delete-btn',
        onClick: 'return deleteAccessInfo(this);',
        'data-i18n': 'glossary:Account.Delete.label'
    });

    return aDeleteBtn;
};

renderFullCalendar = function() {
    $('#calendar').fullCalendar({
        header: false,
        // customize the button names,
        // otherwise they'd all just say "list"
        buttonText: {
            today: i18next.t('glossary:Calendars.Today')
        },
        allDayText: i18next.t('glossary:Calendars.All_day'),
        views: {
            schedule: { 
                type: 'agendaDay'
            },
            agendaDay: { 
                titleFormat: i18next.t('glossary:Calendars.DayFormat')
            },
            month: { 
                titleFormat: i18next.t('glossary:Calendars.Month_titleFormat'),
                fixedWeekCount: false,
                eventLimitText: '',
                dayPopoverFormat: i18next.t('glossary:Calendars.dayPopover')
            }
        },
        height: "parent",
        locale: i18next.language,
        timezone: 'Asia/Tokyo',
        defaultView: 'schedule',
        defaultDate: moment().format(),
        timeFormat: 'H:mm' ,
        axisFormat: 'HH:mm',
        timeFormat: 'HH:mm',
        slotLabelFormat: 'H:mm',
        nowIndicator: true,
        navLinks: true, // can click day/week names to navigate views
        editable: true,
        eventLimit: true, // allow "more" link when too many events
        viewRender: function(currentView) {
                    dispListName = currentView.name;
                    if (currentView.name != "schedule") {
                        var title = currentView.title;
                        $(".calendar-title").html(title);
                        $("#prev").show();
                        $("#next").show();
                        $("#container").show();
                        $("#schedule").hide();
                        sDateObj = moment(currentView.start.valueOf());
                        eDateObj = moment(currentView.end.valueOf());
                        getListOfVEvents();
                    } else {
                        $(".calendar-title").html(moment().locale(i18next.language).format(i18next.t('glossary:Calendars.Month_titleFormat')));

                        $("#container").hide();
                        $("#prev").hide();
                        $("#next").hide();
                        $("#schedule").empty();
                        $("#schedule").show();

                        initSchedule();

                        $("#schedule-scroller").removeAttr("onscroll").on("scroll", function() {
                            if (dispListName == "schedule") {
                                let now = $("#schedule-scroller").scrollTop();
    
                                let dispDate = "";
                                $("#schedule").children().each(function(index, ele) {
                                    if (index == 0 || now > ele.offsetTop) {
                                        dispTitlePos = ele.offsetTop;
                                        dispDate = $(ele).data("date");
                                    } else {
                                        $(".calendar-title").html(moment(dispDate + "-01").locale(i18next.language).format(i18next.t('glossary:Calendars.Month_titleFormat')));
                                        return false;
                                    }
                                });
    
                                // The position where the top month data is visible
                                let pageTop = $("#schedule").children(":first").next()[0].offsetTop + $("#schedule").children(":first").next().innerHeight();
                                // Position where data of the bottom month can be seen
                                let pageBottom = $("#schedule").children(":last").prev()[0].offsetTop - $("#schedule-scroller")[0].clientHeight;
                                if( now > pageBottom )
                                {
                                    // Acquire data for the next month
                                    let lastMonth = $("#schedule").children(":last").data("date");
                                    let startObj = moment(lastMonth).add(1, "month").startOf("month");
                                    let endObj = moment(lastMonth).add(1, "month").endOf("month");
    
                                    dispScheduleHeaders(moment(startObj), moment(endObj), false);
                                    getListOfVEventsSchedule(moment(startObj), moment(endObj), ":first");
                                } else if (now < pageTop) {
                                    // Acquire past data
                                    let firstMonth = $("#schedule").children(":first").data("date");
                                    let startObj = moment(firstMonth).add(-1, "month").startOf("month");
                                    let endObj = moment(firstMonth).add(-1, "month").endOf("month");
    
                                    dispScheduleHeaders(moment(startObj), moment(endObj), true);
                                    getListOfVEventsSchedule(moment(startObj), moment(endObj), ":last");
                                }
                            }
                        })
                    }
                },
        eventClick: function(calEvent, jsEvent, view) {
            return PCalendar.displayEditVEvent(calEvent);
        },
        dayClick: function(date, jsEvent, view) {
            let dateWTime = moment(date.format() + "T" + moment().format('HH:mm:00'));
            displayAddEventDialog(dateWTime);
        }
    });

    $('#today-btn').on('click', function () {
        if (dispListName != "schedule") {
            $('#calendar').fullCalendar('today');
        } else {
            initSchedule();
        }
    });
};

scheduleDayClick = function(aDom) {
    let eventItem = $(aDom).data('event-item');
    PCalendar.displayEditVEvent(eventItem);
}

// Use today's date
addButtonClick = function() {
    displayAddEventDialog(moment());
};

// Use date clicked by the user
displayAddEventDialog = function(date) {
    Common.loadContent("./templates/_vevent_template.html").done(function(data) {
        var out_html = $($.parseHTML(data));
        $("#loadContent").empty();
        let id = PCalendar.createSubContent(out_html);
        $(id + " footer").hide();
        $("#edit-btn").on("click", PCalendar.addEvent);
        let startDatetime = date.second(0).format("YYYY-MM-DDTHH:mm");
        let endDatetime = date.add(1, 'hours').format("YYYY-MM-DDTHH:mm");
        $("#dtstart").val(startDatetime);
        $("#dtend").val(endDatetime);
    }).fail(function(error) {
        console.log(error);
    });
};

PCalendar.displayCalendarTitle = function(str) {
    return str || i18next.t('glossary:Calendars.No_title');
};

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

    // Is there a case that we don't want to remove all events?
    $('#calendar').fullCalendar('removeEvents');
    
    Common.getListOfOData(queryUrl, access_token)
        .done(function(data) {
            _.each(data.d.results, function(item) { 
                // do something
                let events = $('#calendar').fullCalendar('clientEvents', item.__id)[0];
                if (events) {
                    PCalendar.updateEvent(item);
                } else {
                    listOfEvents.push(PCalendar.convertVEvent2FCalEvent(item));
                }
            });
        })
        .always(function(){
            hideSpinner('body');
            $('#calendar').fullCalendar('renderEvents', listOfEvents, true);
            $('#calendar').fullCalendar('refetchEvents');
        });
};

initSchedule = function() {
    $("#schedule").empty();
    sDateObj = moment().startOf("month");
    eDateObj = moment().add(11, "month").endOf("month");
    dispScheduleHeaders(moment(sDateObj), moment(eDateObj));
    getListOfVEventsSchedule(moment(sDateObj), moment(eDateObj));
}

dispScheduleHeaders = function(startObj, endObj, firstFlg) {
    var diff = endObj.diff(startObj);
    var duration = moment.duration(diff);
    var dayCnt = Math.floor(duration.asDays());
    for (var i = 0; i <= dayCnt; i++) {
        let html = "";
        if (startObj.date() == 1) {
            // display month header
            //html = "<div style='height: 50px;margin-bottom: 10px;background-image: url(\"https://demo.personium.io/ksakamoto/__/IMG_0066.jpg\")'>" + startObj.format("YYYY年MM月") + "</div>";
            html = [
                "<table class='fc-list-table' id='schedule-"+startObj.format("YYYY-MM")+"' data-date='"+startObj.format("YYYY-MM")+"'>",
                    "<tr class='list-month list-"+startObj.format("M")+"month'>",
                        "<th class='list-month-title' colspan='3'>"+startObj.locale(i18next.language).format(i18next.t('glossary:Calendars.Month_titleFormat'))+"</th>",
                    "</tr>",
                "</table>"
            ].join("");
            //html = "<table id='schedule-"+startObj.format("YYYY-MM")+"' data-date='"+startObj.format("YYYY-MM")+"'><div style='height: 200px;margin-bottom: 30px;background-image: url(\"https://demo.personium.io/ksakamoto/__/IMG_0066.jpg\")'><font size='5'>" + startObj.format("YYYY年MM月") + "</font></div><div id='schedule-data-"+startObj.format("YYYY-MM")+"'></div></table>";
            if (firstFlg) {
                let preId = $("#schedule").children(":first").attr("id");
                $("#schedule").prepend(html);
                //$("#" + preId)[0].scrollIntoView(true);
            } else {
                $("#schedule").append(html);
            }
        }
/*
        if (startObj.day() == DAY_WEEK_TOP) {
            // display week header
            let stDay = startObj.format("M月D日");
            let edDayMoment = moment([startObj.year(), startObj.month(), startObj.date()]).add(6, "day");
            let edFormat = "D日";
            if (startObj.month() != edDayMoment.month()) {
                edFormat = "M月" + edFormat;
            }
            let edDay = edDayMoment.format(edFormat);
            html = "<div style='margin-bottom: 15px;margin-top:15px;margin-left: 50px;'><font size='5'>" + stDay + "~" + edDay + "</font></div>";
            //html = "<div>" + stDay + "~" + edDay + "</div>";
            $("#schedule-data-"+startObj.format("YYYY-MM")).append(html);
        }
*/
        var day = startObj.format("YYYY-MM-DD");
        //html = "<span data-id='" + day + "'></span>";
        html = "<table class='fc-list-table' data-id='" + day + "'></table>";
        //html = "<tr class='fc-list-heading' data-id='" + day + "'></tr>";
        $("#schedule-"+startObj.format("YYYY-MM")+">tbody").append(html);
        startObj.add(1, "day");
    }
}
getListOfVEventsSchedule = function(startObj, endObj, delPosition) {
    let fromDay = startObj.toISOString();
    let toDay = endObj.toISOString();
    let urlOData = Common.getBoxUrl() + 'OData/vevent';
    let filterStr = $.param({
        "$top": "1000",
        "$filter": "dtend ge datetimeoffset'"+fromDay+"' and dtstart le datetimeoffset'"+toDay+"'",
        //"$filter": "dtstart ge datetimeoffset'2017-01-01T00:00:00+09:00'",
        "$orderby": "dtstart asc, dtend asc"
    });
    
    let queryUrl = urlOData + '?' + filterStr;
    let access_token = Common.getToken();
    let listOfEvents = [];
    
    let delCnt = 0;
    Common.getListOfOData(queryUrl, access_token)
        .done(function(data) {
            _.each(data.d.results, function(item) {
                scheduleRenderEvent(item);
            });

            while (startObj.isBefore(endObj)) {
                var month = startObj.format("YYYY-MM");
                if ($("#schedule-"+month+" .fc-list-heading").length == 0) {
                    scheduleRenderNoEvent(startObj);
                }
                startObj.add(1, "month");
            }
        })
        .always(function(){
            hideSpinner('body');
            if (delPosition == undefined) {
                $('[data-id="'+moment().format("YYYY-MM-DD")+'"]')[0].scrollIntoView(true);
            } else if (delPosition) {
                $("#schedule").children(delPosition).remove();
            }
        });
};

scheduleRenderNoEvent = function(startObj) {
    let html = [
        "<table class='fc-list-table noEventTable'>",
            "<tr class='fc-list-item'>",
                "<td class='fc-list-item-time fc-widget-content'>",
                    i18next.t('glossary:Calendars.No_events'),
                    "<br><br>",
                "</td>",
            "</tr>",
        "</table>"
    ].join("");
    $("#schedule-"+startObj.format("YYYY-MM")+">tbody").append(html);
}
scheduleRenderEvent = function(item) {
    let event = PCalendar.convertVEvent2FCalEvent(item);
    let id = event.vEvent.__id;
    let startObj = moment(event.start);
    let endObj = moment(event.end);
    let diffStartObj = moment(event.start).startOf("day");
    let diffEndObj = moment(event.end).startOf("day");
    var diff = diffEndObj.diff(diffStartObj);
    var duration = moment.duration(diff);
    var dayCnt = Math.floor(duration.asDays());
    let startDay = startObj.format("YYYY-MM-DD");
    let endDay = endObj.format("YYYY-MM-DD");

    if (event.allDay) {
        dayCnt--;
    }
    for (var i = 0; i <= dayCnt; i++) {
        var day = startObj.format("YYYY-MM-DD");
        if ($("[data-id='"+day+"']").children().length == 0) {
            let table = [
                "<tr class='fc-list-heading'>",
                    "<td class='fc-widget-header' colspan='3'>",
                        "<a class='fc-list-heading-main' style='padding-right:5px;font-size:30px;'>",
                            startObj.locale(i18next.language).format(i18next.t('glossary:Calendars.Day_titleFormat')),
                        "</a>",
                        "<a class='fc-list-heading-alt' style='float:left; padding-top: 13px;'>",
                            startObj.locale(i18next.language).format("ddd"),
                        "</a>",
                    "</td>",
                "</tr>"
            ].join("");
            $("[data-id='"+day+"']").append(table);
            //$("#schedule-"+startObj.format("YYYY-MM")+">tbody").append(table);
        }

        let summary = PCalendar.displayCalendarTitle(event.title);
        let dateRange = "";
        let dataId = "";
        if (startDay == day) {
            // Start date
            let startTime = startObj.format("HH:mm");
            if (event.allDay) {
                dateRange = i18next.t('glossary:Calendars.All_day');
            } else if (startDay == endDay) {
                let endTime = endObj.format("HH:mm");
                dateRange = startTime + " - " + endTime;
            } else {
                dateRange = startTime + " - 00:00";
            }
        } else if (endDay == day) {
            // End date
            let endTime = endObj.format("HH:mm");
            if (event.allDay) {
                dateRange = i18next.t('glossary:Calendars.All_day');
            } else {
                dateRange = "00:00 - " + endTime;
            }
        } else {
            // All day
            dateRange = i18next.t('glossary:Calendars.All_day');
        }
        let html = [
            "<td class='fc-list-item-time fc-widget-content'>",
                dateRange,
            "</td>",
            "<td class='fc-list-item-marker fc-widget-content'>",
                "<span class='fc-event-dot' style='background-color:"+event.color+";'></span>",
            "</td>",
            "<td class='fc-list-item-title fc-widget-content'>",
                "<a>",
                    summary,
                "</a>",
            "</td>"
        ].join("");
        if ($("[data-id='"+day+"']").find("[name='"+id+"']").length > 0) {
            $("[data-id='"+day+"']").find("[name='"+id+"']").data("event-item", event);
            $("[data-id='"+day+"']").find("[name='"+id+"']").empty().append(html);
        } else {
            let aTr = $("<tr>", {
                class: "fc-list-item",
                name: id,
                "data-event-item": JSON.stringify(event),
                onClick: "scheduleDayClick(this);"
            }).append(html);
            $("[data-id='"+day+"']").append($(aTr));
        }
        var month = startObj.format("YYYY-MM");
        $("#schedule-"+month).find(".noEventTable").remove();

        startObj.add(1, "day");
    }
}
scheduleRemoveEvent = function(item) {
    let event = PCalendar.convertVEvent2FCalEvent(item);
    let id = event.vEvent.id;
    let startObj = moment(event.start);
    let endObj = moment(event.end);
    let diffStartObj = moment(event.start).startOf("day");
    let diffEndObj = moment(event.end).startOf("day");
    var diff = diffEndObj.diff(diffStartObj);
    var duration = moment.duration(diff);
    var dayCnt = Math.floor(duration.asDays());
    if (event.allDay) {
        dayCnt--;
    }

    for (var i = 0; i <= dayCnt; i++) {
        var day = startObj.format("YYYY-MM-DD");
        $("[data-id='"+day+"']").find("[name='"+id+"']").remove();
        if ($("[data-id='"+day+"']").children().length <= 1) {
            $("[data-id='"+day+"']").empty();

            var month = startObj.format("YYYY-MM");
            if ($("#schedule-"+month).find(".fc-list-heading").length == 0) {
                scheduleRenderNoEvent(startObj);
            }
        }

        startObj.add(1, "day");
    }
}

/*
 * Create event (https://fullcalendar.io/docs/event-object)
 */
PCalendar.renderEvent = function(item) {
    let event = PCalendar.convertVEvent2FCalEvent(item);
    $('#calendar').fullCalendar('renderEvent', event, true);
};

PCalendar.prepareEvent = function(item) {
    return PCalendar.convertVEvent2FCalEvent(item);
};

PCalendar.updateEvent = function(item) {
    let currentFCalEvent = $('#calendar').fullCalendar('clientEvents', item.__id)[0]; // currently only the first event
    let updatedFCalEvent = PCalendar.convertVEvent2FCalEvent(item);
    $.extend(true, currentFCalEvent, updatedFCalEvent);
    // https://fullcalendar.io/docs/updateEvent
    $('#calendar').fullCalendar('updateEvent', currentFCalEvent);
};

PCalendar.convertVEvent2FCalEvent = function(item) {
    let startMoment = moment(item.dtstart);
    let endMoment = moment(item.dtend);
    let event = {};
    // https://fullcalendar.io/docs/event-object
    let stdFCalFields = {
        id: item.__id,
        title: item.summary,
        start: item.start || startMoment,
        end: item.end || endMoment,
        editable: true,
        color: PCalendar.getEventColor(item.srcType)
    };
    let extraFields =
    {
        description: item.description,
        vEvent: item
    };
    $.extend(true, event, stdFCalFields, extraFields);
    
    if (item.srcType == "Office365") {
        event.start = startMoment;
        event.end = endMoment;
    }

    event.allDay = item.allDay;
    
    return event;
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
                displaySyncListPanel();
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
                displaySyncListPanel();

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
    Common.loadContent("./templates/_list_template.html").done(function(data) {
        var out_html = $($.parseHTML(data));
        let id = PCalendar.createSubContent(out_html);
        $(id + " .header-btn-right").hide();
        $(id + " footer").hide();
    }).fail(function(error) {
        console.log(error);
    });
};

registerAccount = function() {
    // show spinner
    $('#dialogOverlay').show();

    let srcType = $('[name=srcType]:checked').val();
    switch(srcType) {
    case 'Google':
    case 'Office365':
        PCalendar.prepareOAuth2Account(srcType);
        break;
    default:
        setAccessInfoAPI('POST', srcType)
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

PCalendar.createSubContent = function(html) {
    let no = $(".subContent").length;
    if (no == 0) {
        $("#loadContent").show();
    }

    let aDiv = $("<div>", {
        id: "subContent" + no,
        class: "subContent subContent" + no,
        style: "z-index: " + (10 + no)
    }).append(html);
    
    $("#loadContent").append($(aDiv)).localize();
    Common.slideShow('.subContent' + no);
    return '.subContent' + no;
};
PCalendar.backSubContent = function(allFlag) {
    let result = "";
    if (allFlag) {
        Common.slideHide(".subContent", "right", function() {
            $(".subContent").remove();
            $("#loadContent").hide();
        })
    } else {
        let no = $(".subContent").length - 1;
        Common.slideHide(".subContent" + no, "right", function() {
            $(".subContent" + no).remove();
            if (no <= 0) {
                $("#loadContent").hide();
            }
        });
        result = ".subContent" + (no - 1);
    }

    return result;
}

PCalendar.dispPasswordScreen = function() {
    Common.loadContent("./templates/_change_password_template.html").done(function(data) {
        let out_html = $($.parseHTML(data));
        PCalendar.createSubContent(out_html);
    }).fail(function(error) {
        console.log(error);
    });
};

PCalendar.EwsRegister = function() {
    setAccessInfoAPI('POST', 'EWS')
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

PCalendar.prepareOAuth2Account = function(srcType) {
    let pData = setAccountData(srcType);
    let paramStr = $.param({
        srcType: srcType,
        state: 'hoge',
        userCellUrl: Common.getCellUrl()
    });
    window.location.href = 'https://demo.personium.io/app-personium-calendar/__/Engine/reqOAuthToken?' + paramStr;
};

setAccountData = function(srcType) {
    let pData;
    pData = {
        srcType: srcType
    };
    // Save data for later use
    sessionStorage.setItem('pData', JSON.stringify(pData));

    return pData;
};

setAccessInfoAPI = function(method, srcType) {
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
                PCalendar.backSubContent(true);
                reRenderCalendar();
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
    console.log(accountInfo.srcAccountName);
    Common.loadContent("./templates/_change_password_template.html").done(function(data) {
        let out_html = $($.parseHTML(data));
        let id = PCalendar.createSubContent(out_html);
        $('#idCalendarAccount')
        .val(accountInfo.srcAccountName)
        .prop("readonly", true);
        $("#changePassOkBtn").removeAttr('onclick');
        $("#changePassOkBtn").on('click', function() {
            modifyAccount(accountInfo.srcType);
        });
        $(id + " .header-title").attr("data-i18n", "glossary:Account.Edit.title").localize();
        $("#changePassOkBtn").attr("data-i18n", "glossary:Account.Edit.btnOK").localize();
    }).fail(function(error) {
        console.log(error);
    });
};

modifyAccount = function(srcType) {
    // show spinner
    $('#dialogOverlay').show();

    setAccessInfoAPI('PUT', srcType)
        .done(function(data, status, response){
            $('#dialogOverlay').hide();
            let id = PCalendar.backSubContent();
            // Rerender the account list
            getAccountList().done(function(data) {
                dispAccountList(id + " main", data);
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
    let accountInfo = $(aDom).closest("div").data('account-info');
    console.log(accountInfo.srcAccountName);
    return false;
};

deleteAccessInfo = function(aDom) {
    let accountInfo = $(aDom).closest("li").data('account-info');
    deleteAccessInfoAPI(accountInfo)
        .done(function(){
            console.log('Finish deleting ' + accountInfo.srcAccountName);
            // Rerender the account list
            $(aDom).closest('li').animate({
                width: 'hide',
                height: 'hide',
                opacity: 'hide'
            }, 'slow', function () {
                $(aDom).remove();
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
};
PCalendar.changeEditBtn = function(event) {
    $("#edit-btn").removeAttr("onclick").on("click", function() {
        PCalendar.editEvent(event);
    });
    PCalendar.setEditVEventDisabled(false);
    $("#edit-btn").attr("data-i18n", "glossary:Calendars.VEvent.btn.save").localize();
}
PCalendar.addEvent = function() {
    console.log('Add event');
    let tempVEvent = PCalendar.prepareVEvent('POST');
    PCalendar.updateVEventAPI('POST', tempVEvent)
        .done(function(data){
            if (dispListName != "schedule") {
                PCalendar.renderEvent(data);
            } else {
                scheduleRenderEvent(data);
            }
            
            PCalendar.backSubContent();
        })
        .fail(function(error){
            console.log(error.responseJSON);
            PCalendar.backSubContent();
            Common.openWarningDialog(
                'warningDialog.title',
                error.responseJSON.error || error.responseJSON.message.value,
                function(){
                    $('#modal-common').modal('hide');
                    $('#modal-vevent').modal('show');
                }
            );
        });
}
PCalendar.editEvent = function(event) {
    console.log('Edit event');
    let tempVEvent = PCalendar.prepareVEvent('PUT', event.vEvent);
    PCalendar.updateVEventAPI('PUT', tempVEvent)
        .done(function(data){
            if (dispListName != "schedule") {
                PCalendar.updateEvent(data);
            } else {
                scheduleRenderEvent(data);
            }
            
            PCalendar.backSubContent();
        })
        .fail(function(error){
            console.log(error.responseJSON);
            PCalendar.backSubContent();
            Common.openWarningDialog(
                'warningDialog.title',
                error.responseJSON.error || error.responseJSON.message.value,
                function(){
                    $('#modal-common').modal('hide');
                    $('#modal-vevent').modal('show');
                }
            );
        });
}

PCalendar.displayEditVEvent = function(calEvent) {
    Common.loadContent("./templates/_vevent_template.html").done(function(data) {
        var out_html = $($.parseHTML(data));
        $("#loadContent").empty();
        let id = PCalendar.createSubContent(out_html);
        $("#b-delete-vevent-ok").on("click", function() {
            PCalendar.displayVEventDialog(calEvent);
        });
        $(id + " header div").attr("data-i18n", "glossary:Calendars.Info_events").localize();
        $("#edit-btn").attr("data-i18n", "glossary:Account.Edit.label").localize();
        $("#edit-btn").on("click", function() {
            PCalendar.changeEditBtn(calEvent);
        });
        PCalendar.setEditVEventInfo(calEvent.vEvent);
        PCalendar.setEditVEventDisabled(true);
    }).fail(function(error) {
        console.log(error);
    });    
};
PCalendar.setEditVEventInfo = function(event) {
    $('#srcAccountName').data("type", event.srcType);
    if (event.url) {
        $('#url').attr('href', event.url);
        $('#url').text(event.url);
    }
    $('#srcAccountName').data("account", event.srcAccountName);
    $('#srcAccountName').text(event.srcAccountName);
    if (event.attendees) {
        $('#attendees').text(event.attendees);
    }
    if (event.summary) {
        $('#event-title').val(event.summary);
    }
    if (event.location) {
        $('#location').val(event.location);
    }
    $('#allDay').prop('checked', event.allDay);
    if (event.dtstart) {
        //$('#modal-vevent #dtstart').val(moment(tempVEvent.dtstart).format());
        $('#dtstart').val(moment(event.dtstart).format("YYYY-MM-DDTHH:mm"));
    }
    if (event.dtend) {
        //$('#modal-vevent #dtend').val(moment(tempVEvent.dtend).format());
        $('#dtend').val(moment(event.dtend).format("YYYY-MM-DDTHH:mm"));
    }
    if (event.description) {
        $('#description').val(event.description);
    }
    if (event.organizer) {
        $('#organizer').val(event.organizer);
    } else {
        $('#organizer').val(event.srcAccountName);
    }
};
PCalendar.setEditVEventDisabled = function(disabled) {
    $("#event-title").attr("disabled", disabled);
    $("#dtstart").attr("disabled", disabled);
    $("#dtend").attr("disabled", disabled);
    $("#allDay").attr("disabled", disabled);
    $("#srcAccountName").attr("disabled", disabled);
    //if (disabled) {
        $("#srcAccountName").css("pointer-events", "none");
    //} else {
    //    $("#srcAccountName").css("pointer-events", "auto");
    //}
    
    $("#location").attr("disabled", disabled);
    $("#url").attr("disabled", disabled);
    $("#description").attr("disabled", disabled);
}

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
        PCalendar.backSubContent();
        $('#dialogOverlay').show();
        PCalendar.deleteVEventAPI({__id: eventId})
            .done(function(){
                if (dispListName != "schedule") {
                    $('#calendar').fullCalendar('removeEvents', eventId);
                } else {
                    scheduleRemoveEvent(calEvent);
                }
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
        srcType: $('#srcAccountName').data("type"),
        srcAccountName: $('#srcAccountName').data("account"),
        allDay: $('#allDay').prop('checked'),
        start: $('#dtstart').val(),
        end: $('#dtend').val(),
        dtstart: moment($('#dtstart').val()).toISOString(),
        dtend: moment($('#dtend').val()).toISOString(),
        organizer: $('#organizer').val() || $('#srcAccountName').data("type"), // Usually the organizer is the account owner
        summary: $('#event-title').val(),
        description: $('#description').val(),
        location: $('#location').val()
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
        initSchedule();
    }
};
