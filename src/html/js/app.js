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

getAppDataPath = function() {
    return 'OData/vevent?$inlinecount=allpages&$top=0';
};

getAppRequestInfo = function() {
    return {
        dataType: 'json'
    };
};

getAppRole = function(auth) {
    if (auth == "read") {
        // Currently we only allow role with read permission.
        return 'CalendarViewer';
    }
};

getAuthorityAppRole = function(auth) {
    let result = auth;
    switch (auth) {
        case "owner":
            result = "CalendarOwner";
            break;
        case "editor":
            result = "CalendarEditor";
            break;
        case "viewer":
            result = "CalendarViewer";
            break;
    }

    return result;
}

getAppRoleAuthority = function(roleName) {
    let result = roleName;
    switch (roleName) {
        case "CalendarOwner":
            result = i18next.t("Authority.owner");
            break;
        case "CalendarEditor":
            result = i18next.t("Authority.editor");
            break;
        case "CalendarViewer":
            result = i18next.t("Authority.viewer");
            break;
    }

    return result;
}
getAppRoleAuthorityName = function(roleName) {
    let result = roleName;
    switch (roleName) {
        case "CalendarOwner":
            result = i18next.t("Authority.owner");
            break;
        case "CalendarEditor":
            result = i18next.t("Authority.editor");
            break;
        case "CalendarViewer":
            result = i18next.t("Authority.viewer");
            break;
    }

    return result;
}

getAppRoleAuthorityList = function(roleList) {
    let result = "";
    for (var i = 0; i < roleList.length; i++) {
        result += getAppRoleAuthorityName(roleList[i]) + ", ";
    }
    result = result.slice(0,-2);
    return result;
}

additionalCallback = function() {
    Common.Drawer_Menu();

    Common.setRefreshTimer();

    Common.getProfileName(Common.getTargetCellUrl(), Common.displayMyDisplayName);

    renderFullCalendar();

    syncData();

    if (Common.getTargetCellUrl() !== Common.getCellUrl()) {
        $("#other_btn").hide();
        $(".menu-list").addClass("disable-field");
    }

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

displaySyncListPanel = function() {
    Common.closeSlide();
    Common.loadContent("./templates/_list_template.html").done(function(data) {
        var out_html = $($.parseHTML(data));
        $("#loadContent").empty();
        let id = Common.createSubContent(out_html);
        $(id + " .header-title").attr("data-i18n", "glossary:Account.label").localize();
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
    if (Common.getTargetCellUrl() !== Common.getCellUrl()) {
        // You can not add accounts on another's calendar
        return;
    }

    Common.closeSlide();
    Common.loadContent("./templates/_list_template.html").done(function(data) {
        var out_html = $($.parseHTML(data));
        $("#loadContent").empty();
        let id = Common.createSubContent(out_html);
        $(id + " main").empty();
        $(id + " .header-title").attr("data-i18n", "glossary:Account.label").localize();
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
    }).fail(function(error) {
        console.log(error);
    });
};

selectAccountPanel = function() {
    Common.loadContent("./templates/_list_template.html").done(function(data) {
        var out_html = $($.parseHTML(data));
        let id = Common.createSubContent(out_html);
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
                Common.backSubContent();
            })
        });
        $(id + " .header-btn-right").hide();
        $(id + " footer").hide();

        $("#addAccountFooterButton").attr("data-i18n", "glossary:Account.Add").localize();
    }).fail(function(error) {
        console.log(error);
    });
}

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

                        $("#schedule-scroller").on("scroll", function() {
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
            let dateWTime = moment(date.format());
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
    if (Common.getTargetCellUrl() !== Common.getCellUrl()) {
        // You can not add events in another calendar
        return;
    }
    
    Common.loadContent("./templates/_vevent_template.html").done(function(data) {
        var out_html = $($.parseHTML(data));
        $("#loadContent").empty();
        let id = Common.createSubContent(out_html);
        $(id + " footer").hide();
        $("#edit-btn").on("click", PCalendar.addEvent);
        if (dispListName == "agendaDay") {
            $("#dtstart_date").val(date.format("YYYY-MM-DD"));
            $("#dtstart_time").val(date.format("HH:mm"));
            $("#dtend_date").val(date.add(1, 'hours').format("YYYY-MM-DD"));
            $("#dtend_time").val(date.format("HH:mm"));
            $('#allDay').prop('checked', false);
        } else {
            $("#dtstart_date").val(date.format("YYYY-MM-DD"));
            $("#dtstart_time").val(moment().format("HH:mm"));
            $("#dtend_date").val(date.format("YYYY-MM-DD"));
            $("#dtend_time").val(moment().add(1, 'hours').format("HH:mm"));
            $("#dtstart_time").hide();
            $("#dtend_time").hide();
        }
        PCalendar.allDaySetClickEvent();
    }).fail(function(error) {
        console.log(error);
    });
};

PCalendar.displayCalendarTitle = function(str) {
    return str || i18next.t('glossary:Calendars.No_title');
};

getListOfVEventsCount = function() {
    let urlOData = Common.getBoxUrl() + 'OData/vevent';
    let filterStr = $.param({
        "$inlinecount": "allpages",
        "$top": 0
    });
    let queryUrl = urlOData + '?' + filterStr;
    let access_token = Common.getToken();
    return Common.getListOfOData(queryUrl, access_token);
}
getListOfVEvents = function() {
    let sDate = sDateObj.toISOString();
    let eDate = eDateObj.toISOString();
    let urlOData = Common.getBoxUrl() + 'OData/vevent';
    let filterStr = $.param({
        "$top": 1000,
        "$filter": "dtend ge datetimeoffset'"+sDate+"' and dtstart le datetimeoffset'"+eDate+"'",
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
            Common.hideSpinner('body');
            $('#calendar').fullCalendar('renderEvents', listOfEvents, true);
            $('#calendar').fullCalendar('refetchEvents');
        });
};

initSchedule = function() {
    $("#schedule-scroller").removeAttr("onscroll");
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
            html = [
                "<table class='fc-list-table' id='schedule-"+startObj.format("YYYY-MM")+"' data-date='"+startObj.format("YYYY-MM")+"'>",
                    "<tr class='list-month list-"+startObj.format("M")+"month'>",
                        "<th class='list-month-title' colspan='3'>"+startObj.locale(i18next.language).format(i18next.t('glossary:Calendars.Month_titleFormat'))+"</th>",
                    "</tr>",
                "</table>"
            ].join("");
            if (firstFlg) {
                let preId = $("#schedule").children(":first").attr("id");
                $("#schedule").prepend(html);
            } else {
                $("#schedule").append(html);
            }
        }
        var day = startObj.format("YYYY-MM-DD");
        html = "<table class='fc-list-table' data-id='" + day + "'></table>";
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
            Common.hideSpinner('body');
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

    scheduleRemoveEvent(id);
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
scheduleRemoveEvent = function(id) {
    $("[name='"+id+"']").each(function(index, ele) {
        let day = $(ele).parent().data("id");
        $(ele).remove();
        if ($("[data-id='"+day+"']").children().length <= 1) {
            var month = $("[data-id='"+day+"']").parents("table").data("date");
            $("[data-id='"+day+"']").empty();

            if ($("#schedule-"+month).find(".fc-list-heading").length == 0) {
                scheduleRenderNoEvent(moment(day));
            }
        }
    })
}

/*
 * Create event (https://fullcalendar.io/docs/event-object)
 */
PCalendar.renderEvent = function(item) {
    let event = PCalendar.convertVEvent2FCalEvent(item);
    $('#calendar').fullCalendar('renderEvent', event, true);
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
    if (Common.getTargetCellUrl() !== Common.getCellUrl()) {
        // Synchronization processing is not performed in the calendar of another person
        return;
    }

    Common.startAnimation();
    Common.closeSlide();
    sync()
        .done(function(data, status, response){
            console.log(response.status);
            if (response.status == "204") {
                getListOfVEventsCount().done(function(data) {
                    if (data.d.__count == 0) {
                        /*
                         * no setup info
                         * 1. Display Menu->Account List-> Register Account Dialog
                         * 2. Fill form
                         * 3. Call setAccessInfoAPI
                         */
                        displaySyncListPanel();
                    }
                }).fail(function(error) {
                    console.log(error);
                }).always(function() {
                    Common.stopAnimation();
                })
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
        let id = Common.createSubContent(out_html);
        $(id + " .header-title").attr("data-i18n", "glossary:Account.label").localize();
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

PCalendar.dispPasswordScreen = function() {
    Common.loadContent("./templates/_change_password_template.html").done(function(data) {
        let out_html = $($.parseHTML(data));
        Common.createSubContent(out_html);
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
        userCellUrl: Common.getTargetCellUrl()
    });
    window.location.href = Common.getAppCellUrl() + '__/Engine/reqOAuthToken?' + paramStr;
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
                Common.backSubContent(true);
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
        let id = Common.createSubContent(out_html);
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
            let id = Common.backSubContent();
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
            
            Common.backSubContent();
        })
        .fail(function(error){
            console.log(error.responseJSON);
            Common.backSubContent();
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
            
            Common.backSubContent();
        })
        .fail(function(error){
            console.log(error.responseJSON);
            Common.backSubContent();
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
    if (Common.getTargetCellUrl() !== Common.getCellUrl()) {
        // You can not edit event on another's calendar
        return;
    }

    Common.loadContent("./templates/_vevent_template.html").done(function(data) {
        var out_html = $($.parseHTML(data));
        $("#loadContent").empty();
        let id = Common.createSubContent(out_html);
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
        PCalendar.allDaySetClickEvent();
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
    let dtstart = moment(event.dtstart);
    let dtend = moment(event.dtend);
    if (event.allDay) {
        $('#dtstart_time').hide();
        $('#dtend_time').hide();
        dtend.add(-1, "day");
    } else {
        $('#dtstart_time').show();
        $('#dtend_time').show();
    }
    if (event.dtstart) {
        $('#dtstart_date').val(dtstart.format("YYYY-MM-DD"));
        $('#dtstart_time').val(dtstart.format("HH:mm"));
    }
    if (event.dtend) {
        $('#dtend_date').val(dtend.format("YYYY-MM-DD"));
        $('#dtend_time').val(dtend.format("HH:mm"));
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
PCalendar.allDaySetClickEvent = function() {
    $("#allDay").off().on("change", function() {
        if ($(this).prop("checked")) {
            $('#dtstart_time').hide();
            $('#dtend_time').hide();
        } else {
            $('#dtstart_time').show();
            $('#dtend_time').show();
        }
    })
}

PCalendar.setEditVEventDisabled = function(disabled) {
    $("#event-title").attr("disabled", disabled);
    $("#dtstart_date").attr("disabled", disabled);
    $("#dtstart_time").attr("disabled", disabled);
    $("#dtend_date").attr("disabled", disabled);
    $("#dtend_time").attr("disabled", disabled);
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

PCalendar.displayVEventDialog = function(calEvent) {
    let eventId = calEvent.id;
    if (window.confirm('Remove Event: ' + PCalendar.displayCalendarTitle(calEvent.title))) {
        Common.backSubContent();
        $('#dialogOverlay').show();
        PCalendar.deleteVEventAPI({__id: eventId})
            .done(function(){
                if (dispListName != "schedule") {
                    $('#calendar').fullCalendar('removeEvents', eventId);
                } else {
                    scheduleRemoveEvent(calEvent.id);
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
    let dtstartStr = $('#dtstart_date').val();
    let dtendStr = $('#dtend_date').val();
    if ($('#allDay').prop('checked')) {
        dtendStr = moment($('#dtend_date').val()).add(1, "day").format("YYYY-MM-DD");
    } else {
        dtstartStr = $('#dtstart_date').val() + "T" + $('#dtstart_time').val();
        dtendStr = $('#dtend_date').val() + "T" + $('#dtend_time').val();
    }

    let tempData = {
        srcType: $('#srcAccountName').data("type"),
        srcAccountName: $('#srcAccountName').data("account"),
        allDay: $('#allDay').prop('checked'),
        start: dtstartStr,
        end: dtendStr,
        dtstart: moment(dtstartStr).toISOString(),
        dtend: moment(dtendStr).toISOString(),
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

reRenderCalendar = function() {
    Common.showSpinner('body');
    if (dispListName != "schedule") {
        getListOfVEvents();
    } else {
        initSchedule();
    }
};

/* debug */
displyAccessInfo = function(aDom) {
    let accountInfo = $(aDom).closest("div").data('account-info');
    console.log(accountInfo.srcAccountName);
    return false;
};