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
