const APP_URL = "https://demo.personium.io/app-personium-calendar/";

getNamesapces = function() {
    return ['common', 'glossary'];
};

additionalCallback = function() {
    Common.setAppCellUrl();

    Common.setAccessData();
    
    $('#dvOverlay').on('click', function() {
        $(".overlay").removeClass('overlay-on');
        $(".slide-menu").removeClass('slide-on');
    });

    if (!Common.checkParam()) {
        // cannot do anything to recover
        // display a dialog and close the app.
        return;
    };

    Common.setIdleTime();

    Common.getProfileName(Common.getCellUrl(), displayMyDisplayName);

    $('#calendar').fullCalendar({
            header: {
                left: 'prev,next today',
                center: 'title',
                right: 'listDay,listWeek,month'
            },

            // customize the button names,
            // otherwise they'd all just say "list"
            views: {
                listDay: { buttonText: 'list day' },
                listWeek: { buttonText: 'list week' }
            },

            defaultView: 'month',
            defaultDate: '2017-11-12',
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

    $('body > div.mySpinner').hide();
    $('body > div.myHiddenDiv').show();
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
        menuHtml = '<a href="#" onClick="cm.toggleSlide();"><img src="https://demo.personium.io/HomeApplication/__/icons/ico_menu.png"></a>';
    }

    var html = '<div class="col-xs-1" id="' + backMenuId + '"></div>';
        html += '<div class="col-xs-2"><table class="table-fixed back-title"><tr style="vertical-align: middle;"><td class="ellipsisText" id="' + backTitleId + '" align="left"></td></tr></table></div>';
        html += '<div class="col-xs-6 text-center title" id="' + titleMenuId + '"></div>';
        html += '<div class="col-xs-3 text-right">' + menuHtml + '</div>';

    $(setHtmlId).html(html);
};

syncData = function() {
    Common.startAnimation();
};
