// check PWA compatability
if ("serviceWorker" in navigator && location.href.includes("https://")) {
    addEventListener("load", function () {
        navigator.serviceWorker.register("serviceWorker.js").then((response) => {
        }).catch((error) => {
            console.error(error);
        });
    });
} else {
    document.getElementById("install-app-button").style.setProperty("display", "none");
}

// hide install button if running as PWA
if (matchMedia('(display-mode: standalone)').matches) {
    document.getElementById("install-app-button").style.setProperty("display", "none");
}

// prevent the prompt to show by defeault and show it when user clicks istall
addEventListener("beforeinstallprompt", function (arg) {
    event.preventDefault();
    pwaInstallPrompt = arg;
});

// setting up global objects
const cssVariables = document.querySelector(":root");
const joinAudioEffect = new Howl({ src: ["audio/join.ogg"] });
const stuckAudioEffect = new Howl({ src: ["audio/stuck.ogg"] });
const undoAudioEffect = new Howl({ src: ["audio/undo.ogg"] });
const userStatisticsIds = { score: { total: true }, blocksCreated: { total: true }, blocksPowered: { total: true }, moves: { total: true }, highestPower: { total: false } };
if (navigator.cookieEnabled) {
    storage = "localStorage";
} else {
    storage = "globalStorage";
}
globalStorage = {
    getItem(id) {
        return this.values[id];
    }, setItem(id, value) {
        this.values[id] = value;
    }, clear() {
        for (item of Object.keys(this.values)) {
            delete this.values[item];
        }
    }, values: {}
}
expanded = {};
menuOpened = false;
navStyle = null;
activeTab = "play";
move = { powerUpBlockPairs: [], nothingMoved: true };
statistics = { hiddenBlocks: [], blocksToRemove: [], ignoreGridSize: false, blockMovesUndoed: 0 };
configuration = {};
unApplyedConfiguration = {};
blocks = {};
board = [];
setups = [];
saves = [];
optionPowerColorValuePairsNumber = 18;
throttleResize = false;
matchMedia('(prefers-color-scheme: dark)').addEventListener("change", updateTheme);

// reset storage if not used or restore it
if (window[storage].getItem("storageUsed") == null) {
    resetStorage();
    openTab("configuration");
    expandPart("info");
} else {
    restoreStorage();
    restoreGame();
}

unApplyedConfiguration = structuredClone(configuration);

optionRangeValuePairs = [{ optionDOM: "offsetY", optionJS: "offsetY", multiplier: 1 }, { optionDOM: "offsetX", optionJS: "offsetX", multiplier: 1 }, { optionDOM: "grid-size", optionJS: "gridSize", multiplier: 1 }, { optionDOM: "box-margin", optionJS: "boxMargin", multiplier: 0.1 }, { optionDOM: "box-border-radius", optionJS: "boxBorderRadius", multiplier: 0.1 }, { optionDOM: "transitions", optionJS: "transitions", multiplier: 0.1 }];

for (pair of optionRangeValuePairs) {
    document.getElementById(`${pair.optionDOM}-range`).addEventListener("input", updateOptionRangeValuePair.bind(null, pair, "range"));
    document.getElementById(`${pair.optionDOM}-value`).addEventListener("input", updateOptionRangeValuePair.bind(null, pair, "value"));
}

function updateOptionRangeValuePair(pair, origin) {
    if (origin == "range") {
        var valueMultiplier = pair.multiplier;
        var DOMMultiplier = 1;
        var applyedTo = "value";
    } else {
        var valueMultiplier = 1;
        var DOMMultiplier = 1 / pair.multiplier;
        var applyedTo = "range";
    }
    var value = document.getElementById(`${pair.optionDOM}-${origin}`).value * valueMultiplier;
    unApplyedConfiguration[pair.optionJS] = value;
    document.getElementById(`${pair.optionDOM}-${applyedTo}`).value = Math.round(value * DOMMultiplier * 10) / 10;

    savePartialConfiguration(unApplyedConfiguration);
}

for (loop = 1; loop <= optionPowerColorValuePairsNumber; loop++) {
    document.getElementById(`2power${loop}-R-range`).addEventListener("input", updateOptionPowerColorValuePair.bind(null, "range", loop));
    document.getElementById(`2power${loop}-G-range`).addEventListener("input", updateOptionPowerColorValuePair.bind(null, "range", loop));
    document.getElementById(`2power${loop}-B-range`).addEventListener("input", updateOptionPowerColorValuePair.bind(null, "range", loop));
    document.getElementById(`2power${loop}-R-value`).addEventListener("input", updateOptionPowerColorValuePair.bind(null, "value", loop));
    document.getElementById(`2power${loop}-G-value`).addEventListener("input", updateOptionPowerColorValuePair.bind(null, "value", loop));
    document.getElementById(`2power${loop}-B-value`).addEventListener("input", updateOptionPowerColorValuePair.bind(null, "value", loop));
}

optionPlayBoardColors = [{ optionDOM: "play-board", optionJS: "playBoardBackground" }, { optionDOM: "box", optionJS: "boxBackground" }];

function updateOptionPlayBoardColors(origin, option) {
    if (origin == "range") {
        applyedTo = "value";
    } else {
        applyedTo = "range";
    }
    var R = document.getElementById(`${option.optionDOM}-R-${origin}`).value;
    var G = document.getElementById(`${option.optionDOM}-G-${origin}`).value;
    var B = document.getElementById(`${option.optionDOM}-B-${origin}`).value;
    var value = `rgb(${R}, ${G}, ${B})`;
    unApplyedConfiguration[option.optionJS] = value;
    document.getElementById(`${option.optionDOM}-color-preview`).style.setProperty("background-color", value);
    document.getElementById(`${option.optionDOM}-R-${applyedTo}`).value = R;
    document.getElementById(`${option.optionDOM}-G-${applyedTo}`).value = G;
    document.getElementById(`${option.optionDOM}-B-${applyedTo}`).value = B;

    savePartialConfiguration(unApplyedConfiguration);
}

for (option of optionPlayBoardColors) {
    document.getElementById(`${option.optionDOM}-R-range`).addEventListener("input", updateOptionPlayBoardColors.bind(null, "range", option));
    document.getElementById(`${option.optionDOM}-G-range`).addEventListener("input", updateOptionPlayBoardColors.bind(null, "range", option));
    document.getElementById(`${option.optionDOM}-B-range`).addEventListener("input", updateOptionPlayBoardColors.bind(null, "range", option));
    document.getElementById(`${option.optionDOM}-R-value`).addEventListener("input", updateOptionPlayBoardColors.bind(null, "value", option));
    document.getElementById(`${option.optionDOM}-G-value`).addEventListener("input", updateOptionPlayBoardColors.bind(null, "value", option));
    document.getElementById(`${option.optionDOM}-B-value`).addEventListener("input", updateOptionPlayBoardColors.bind(null, "value", option));
}

function updateOptionPowerColorValuePair(origin, power) {
    if (origin == "range") {
        applyedTo = "value";
    } else {
        applyedTo = "range";
    }
    var R = document.getElementById(`2power${power}-R-${origin}`).value;
    var G = document.getElementById(`2power${power}-G-${origin}`).value;
    var B = document.getElementById(`2power${power}-B-${origin}`).value;
    var value = `rgb(${R}, ${G}, ${B})`;
    unApplyedConfiguration.powerColors[power - 1] = value;
    document.getElementById(`2power${power}-color-preview`).style.setProperty("background-color", value);
    document.getElementById(`2power${power}-R-${applyedTo}`).value = R;
    document.getElementById(`2power${power}-G-${applyedTo}`).value = G;
    document.getElementById(`2power${power}-B-${applyedTo}`).value = B;
    // cssVariables.style.setProperty(`--power${power}-color`, value);

    savePartialConfiguration(unApplyedConfiguration);
}

// listeners for check boxes
document.getElementById("shadows-check").addEventListener("click", function () {
    unApplyedConfiguration.shadows = document.getElementById("shadows-check").checked;

    savePartialConfiguration(unApplyedConfiguration);
});

document.getElementById("sound-effects-check").addEventListener("click", function () {
    unApplyedConfiguration.soundEffects = document.getElementById("sound-effects-check").checked;

    savePartialConfiguration(unApplyedConfiguration);
});

document.getElementById("theme-select").addEventListener("change", function () {
    var select = document.getElementById("theme-select");
    unApplyedConfiguration.theme = select.value;
    configuration.theme = select.value;

    updateTheme();
    savePartialConfiguration(unApplyedConfiguration);
});

document.getElementById("ignore-grid-size-check").addEventListener("click", function () {
    statistics.ignoreGridSize = document.getElementById("ignore-grid-size-check").checked;
    updateUserStatisticsDOM();
    window[storage].setItem("statistics", JSON.stringify(statistics));
});

addEventListener("keydown", function (key) {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(key.code) > -1) {
        key.preventDefault();
    }
}, false);

addEventListener("keyup", function () {
    if (activeTab == "play") {
        switch (event.key) {
            case "ArrowRight":
            case "d":
                moveBlocks("right");
                break;
            case "ArrowUp":
            case "w":
                moveBlocks("up");
                break;
            case "ArrowLeft":
            case "a":
                moveBlocks("left");
                break;
            case "ArrowDown":
            case "s":
                moveBlocks("down");
                break;
            case " ":
                if (confirm("Start a new game?")) {
                    startNewGame();
                }
                break;
            case "Backspace":
                undoBlockMove();
                break;
            default:
                break;
        }
    }
});

// long press and short press listeners for play fab
if (matchMedia("(pointer: coarse)").matches) {
    document.getElementById("play-fab").addEventListener("touchstart", playFabPressStart, { passive: true });
    document.getElementById("play-fab").addEventListener("touchend", playFabPressEnd, { passive: true });
    document.getElementById("play-fab").addEventListener("touchmove", function (event) {
        var touch = event.touches[0];
        var touchedElement = document.elementFromPoint(touch.clientX, touch.clientY);
        var playFab = document.getElementById("play-fab");
        if (!(touchedElement == playFab || playFab.contains(touchedElement))) {
            playFabPressEnd(true);
        }
    }, { passive: true });
} else {
    document.getElementById("play-fab").addEventListener("mousedown", playFabPressStart, { passive: true });
    document.getElementById("play-fab").addEventListener("mouseup", playFabPressEnd, { passive: true });
    document.getElementById("play-fab").addEventListener("mouseleave", playFabPressEnd.bind(null, true), { passive: true });
}

function playFabPressStart() {
    if (window[storage].getItem("playFabUseInformed") != 1) {
        window[storage].setItem("playFabUseInformed", 1);
        showToast("long press to start a new game", `<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="30px" viewBox="0 0 24 24" width="30px" fill=var(--text-color)><g><rect fill="none" height="24" width="24"/></g><g><g><path d="M18.19,12.44l-3.24-1.62c1.29-1,2.12-2.56,2.12-4.32c0-3.03-2.47-5.5-5.5-5.5s-5.5,2.47-5.5,5.5c0,2.13,1.22,3.98,3,4.89 v3.26c-2.15-0.46-2.02-0.44-2.26-0.44c-0.53,0-1.03,0.21-1.41,0.59L4,16.22l5.09,5.09C9.52,21.75,10.12,22,10.74,22h6.3 c0.98,0,1.81-0.7,1.97-1.67l0.8-4.71C20.03,14.32,19.38,13.04,18.19,12.44z M17.84,15.29L17.04,20h-6.3 c-0.09,0-0.17-0.04-0.24-0.1l-3.68-3.68l4.25,0.89V6.5c0-0.28,0.22-0.5,0.5-0.5c0.28,0,0.5,0.22,0.5,0.5v6h1.76l3.46,1.73 C17.69,14.43,17.91,14.86,17.84,15.29z M8.07,6.5c0-1.93,1.57-3.5,3.5-3.5s3.5,1.57,3.5,3.5c0,0.95-0.38,1.81-1,2.44V6.5 c0-1.38-1.12-2.5-2.5-2.5c-1.38,0-2.5,1.12-2.5,2.5v2.44C8.45,8.31,8.07,7.45,8.07,6.5z"/></g></g></svg>`);
    }
    if (typeof playFabTimeout == "undefined") {
        playFabTimeout = setTimeout(function () {
            startNewGame();
            delete playFabTimeout;
        }, 250)
    }
}

function playFabPressEnd(cancel = false) {
    if (typeof playFabTimeout != "undefined") {
        clearTimeout(playFabTimeout);
        delete playFabTimeout;
        if (cancel !== true) {
            undoBlockMove();
        }
    }
}

// swipe listeners
if (matchMedia("(pointer: coarse)").matches) {
    document.getElementById("play-tab").addEventListener("swiped-right", function (positions) {
        moveBlocks("right");
    });
    document.getElementById("play-tab").addEventListener("swiped-up", function (positions) {
        moveBlocks("up");
    });
    document.getElementById("play-tab").addEventListener("swiped-left", function (positions) {
        moveBlocks("left");
    });
    document.getElementById("play-tab").addEventListener("swiped-down", function (positions) {
        moveBlocks("down");
    });
}

// update elements on resize
addEventListener("resize", function () {
    if (!throttleResize) {
        applyResizeStyle();
    }
    if (typeof applyResizeTimeout == "undefined") {
        throttleResize = true;
        applyResizeTimeout = setTimeout(applyResizeStyle, 200);
    } else {
        clearTimeout(applyResizeTimeout);
        applyResizeTimeout = setTimeout(applyResizeStyle, 200);
    }
});

function applyResizeStyle() {
    delete applyResizeTimeout;
    updateNavStyle();
    renderPlayBoard();
    updateBoard(false);
    updateBoard(false);
    throttleResize = false;
}

document.getElementById("play-board").addEventListener("click", function () {
    var x = event.clientX - this.getBoundingClientRect().left;
    var y = event.clientY - this.getBoundingClientRect().top;
    var playBoardSize = getComputedStyle(this).width.replace("px", "") * 1;
    if (x > y && playBoardSize - y > x) {
        moveBlocks("up");
    } else if (y > x && playBoardSize - x > y) {
        moveBlocks("left");
    } else if (x > playBoardSize - y && y > x) {
        moveBlocks("down");
    } else if (y > playBoardSize - x && x > y) {
        moveBlocks("right");
    }
});

// setInterval(function() {
//     random = getRandomNumber(1, 4);
//     switch (random) {
//         case 1:
//             moveBlocks("right");
//             break;
//         case 2:
//             moveBlocks("up");
//             break;
//         case 3:
//             moveBlocks("left");
//             break;
//         case 4:
//             moveBlocks("down");
//         default:
//             break;
//     }
// }, 20);

// setup some properties and styles
updateTheme();
setCurrentOptionValues(configuration);
updateNavStyle();

if (window[storage].getItem("storageUsed") == null) {
    window[storage].setItem("storageUsed", 1);
    startNewGame();
}

// hide splashscreen after app loads
addEventListener("load", function () {
    setTimeout(function () {
        updateBoard(false);
        splashscreen = document.getElementById("splashscreen");
        splashscreen.style.setProperty("opacity", 0);

        setTimeout(function () {
            splashscreen.style.setProperty("display", "none");
        }, 170);
    }, 100)
});

function updateNavStyle() {
    // get changed elements
    var nav = document.getElementsByTagName("nav")[0];
    var navPlaceHolder = document.getElementById("nav-placeholder");
    var main = document.getElementsByTagName("main")[0];
    var tabs = document.getElementById("tabs");
    var fab = document.getElementById("play-fab");

    // change elements
    if (innerWidth > (innerHeight + 180) && navStyle != "side") {
        navStyle = "side";
        nav.setAttribute("class", "side");
        navPlaceHolder.setAttribute("class", "side");
        main.style.setProperty("flex-direction", "row-reverse");
        tabs.style.setProperty("width", "100%");
        fab.style.setProperty("bottom", "20px");
    } else if (innerWidth < (innerHeight + 180)) {
        navStyle = "bottom";
        nav.setAttribute("class", "bottom");
        navPlaceHolder.setAttribute("class", "bottom");
        main.style.setProperty("flex-direction", "column");
        tabs.style.removeProperty("width");
        fab.style.removeProperty("bottom");
    }
}

function openTab(tab) {

    // don't open again if opened already
    if (tab != activeTab) {

        // update activeTab variable
        var previousTab = activeTab;
        activeTab = tab;

        // set styles
        document.getElementById(`${previousTab}-item`).setAttribute("class", "item nonactive");
        document.getElementById(`${tab}-item`).setAttribute("class", "item active");
        document.getElementById(`${previousTab}-tab`).style.setProperty("opacity", 0);
        setTimeout(function () {
            document.getElementById(`${previousTab}-tab`).style.setProperty("display", "none");
            if (tab == "play") {
                document.getElementById(`${tab}-tab`).style.setProperty("display", "flex");
                document.getElementById("play-fab").style.removeProperty("transform");
                document.getElementById("tabs").style.setProperty("height", "100%");
                document.getElementById("tabs").style.removeProperty("overflow");
                updateBoard(false);
            } else {
                document.getElementById(`${tab}-tab`).style.setProperty("display", "block");
                document.getElementById("play-fab").style.setProperty("transform", "scale(0)");
                document.getElementById("tabs").style.removeProperty("height");
                document.getElementById("tabs").style.setProperty("overflow", "auto");
            }
            if (previousTab == "configuration") {
                closeAllExpanders();
                if (!JSON.stringify(unApplyedConfiguration) == JSON.stringify(configuration)) {
                    showToast("settings saved", `<svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 0 24 24" width="30px" fill=var(--text-color)><path d="M0 0h24v24H0V0z" fill="none"/><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm2 16H5V5h11.17L19 7.83V19zm-7-7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zM6 6h9v4H6z"/></svg>`);
                }
                applyPartialConfiguration(unApplyedConfiguration);
            }
            getComputedStyle(document.getElementById(`${tab}-tab`)).opacity;
            document.getElementById(`${tab}-tab`).style.setProperty("opacity", "1");
        }, 130);
    }
    if (tab == "statistics") {
        updateUserStatisticsDOM();
    }

}

function updateTheme() {
    if (configuration.theme == "auto") {
        if (matchMedia('(prefers-color-scheme: dark)').matches) {
            var theme = "dark";
        } else {
            var theme = "light";
        }
    } else if (configuration.theme == "dark") {
        var theme = "dark";
    } else {
        var theme = "light";
    }
    if (theme == "dark") {
        cssVariables.style.setProperty('--background-color', "rgb(50, 50, 50)");
        cssVariables.style.setProperty('--text-color', "white");
        cssVariables.style.setProperty('--pale-color', "rgb(70, 70, 70)");
    } else {
        cssVariables.style.setProperty('--background-color', "white");
        cssVariables.style.setProperty('--text-color', "black");
        cssVariables.style.setProperty('--pale-color', "rgb(230, 230, 230)");
    }
}

function showToast(message, icon) {
    var toastElement = document.getElementById("toast");
    var toastText = document.getElementById("toast-text");
    var toastIcon = document.getElementById("toast-icon");

    toastText.innerHTML = message;
    toastIcon.innerHTML = icon;
    toastElement.style.setProperty("display", "flex");
    getComputedStyle(toastElement).opacity;
    toastElement.style.setProperty("opacity", 1);
    toastElement.style.setProperty("transform", "translateY(0)");
    if (typeof toastTimeout == "undefined") {
        toastTimeout = setTimeout(function () {
            delete toastTimeout;
            hideToastElement();
        }, 1000 + (message.length * 60));
    } else {
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(function () {
            delete toastTimeout;
            hideToastElement();
        }, 3000);
    }
}

function hideToast() {
    if (typeof toastTimeout != "undefined") {
        clearTimeout(toastTimeout);
        delete toastTimeout;
    }
    hideToastElement();
}

function hideToastElement() {
    var toastElement = document.getElementById("toast");
    toastElement.style.removeProperty("opacity");
    toastElement.style.removeProperty("transform");
    setTimeout(function () {
        toastElement.style.setProperty("display", "none");
    }, 130);
}

function closeAllExpanders() {

    for (expandable in expanded) {
        if (expanded[expandable]) {
            expandPart(expandable);
        }
    }

}

function expandPart(expanderId) {
    var expandContent = document.getElementById(`expand-${expanderId}-content`);
    if (typeof expanded[expanderId] == "undefined") {
        expanded[expanderId] = false;
    }
    if (!expanded[expanderId]) {
        expanded[expanderId] = true;
        expandContent.style.setProperty("display", "block");
        document.getElementById(`expand-${expanderId}-caret`).style.setProperty("transform", "scaleY(-100%)");
        document.getElementById(`expand-${expanderId}-animator`).style.setProperty("height", (getComputedStyle(expandContent).height.replace("px", "") * 1) + 5 + "px");
        expandCompleteTimeout = setTimeout(function () {
            document.getElementById(`expand-${expanderId}-animator`).style.setProperty("height", (getComputedStyle(expandContent).height.replace("px", "") * 1) + 5 + "px");
        }, 200);
    } else {
        expanded[expanderId] = false;
        document.getElementById(`expand-${expanderId}-caret`).style.removeProperty("transform");
        document.getElementById(`expand-${expanderId}-animator`).style.removeProperty("height");
        clearTimeout(expandCompleteTimeout);
        setTimeout(function () {
            expandContent.style.setProperty("display", "none");
        }, 210);
    }
}

function updateExpanderSize(expanderId) {
    var expandContent = document.getElementById(`expand-${expanderId}-content`);
    document.getElementById(`expand-${expanderId}-animator`).style.setProperty("height", (getComputedStyle(expandContent).height.replace("px", "") * 1) + 5 + "px");
}

function setCurrentOptionValues(applyedConfiguration) {
    for (pair of optionRangeValuePairs) {
        document.getElementById(`${pair.optionDOM}-value`).value = applyedConfiguration[pair.optionJS];
        updateOptionRangeValuePair(pair, "value");
    }
    for (loop = 1; loop <= optionPowerColorValuePairsNumber; loop++) {
        var value = applyedConfiguration.powerColors[loop - 1];
        var RGB = getRGBvalues(value);
        var R = RGB[1];
        var G = RGB[2];
        var B = RGB[3];
        document.getElementById(`2power${loop}-color-preview`).style.setProperty("background-color", value);
        document.getElementById(`2power${loop}-R-range`).value = R;
        document.getElementById(`2power${loop}-G-range`).value = G;
        document.getElementById(`2power${loop}-B-range`).value = B;
        document.getElementById(`2power${loop}-R-value`).value = R;
        document.getElementById(`2power${loop}-G-value`).value = G;
        document.getElementById(`2power${loop}-B-value`).value = B;
    }
    for (option of optionPlayBoardColors) {
        var value = applyedConfiguration[option.optionJS];
        var RGB = getRGBvalues(value);
        var R = RGB[1];
        var G = RGB[2];
        var B = RGB[3];
        document.getElementById(`${option.optionDOM}-color-preview`).style.setProperty("background-color", value);
        document.getElementById(`${option.optionDOM}-R-range`).value = R;
        document.getElementById(`${option.optionDOM}-G-range`).value = G;
        document.getElementById(`${option.optionDOM}-B-range`).value = B;
        document.getElementById(`${option.optionDOM}-R-value`).value = R;
        document.getElementById(`${option.optionDOM}-G-value`).value = G;
        document.getElementById(`${option.optionDOM}-B-value`).value = B;
    }
    document.getElementById("sound-effects-check").checked = applyedConfiguration.soundEffects;
    document.getElementById("ignore-grid-size-check").checked = statistics.ignoreGridSize;
    renderSetups();
    document.getElementById("theme-select").value = applyedConfiguration.theme;
    document.getElementById("shadows-check").checked = applyedConfiguration.shadows;
}

function renderSetups() {
    setupsHTML = ""
    for (setup of setups) {
        setupsHTML += `
            <div class="setup">
                <div class="name">
                    ${setup.name}
                </div>
                <div class="actions">
                    <button type="button" class="action" id="delete-${setup.id}" onclick="deleteSetup('${setup.id}')" title="delete setup ${setup.name}">
                        <svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 0 24 24" width="30px" fill=var(--accent-text-color)><path d="M0 0h24v24H0V0z" fill="none"/><path d="M14.12 10.47L12 12.59l-2.13-2.12-1.41 1.41L10.59 14l-2.12 2.12 1.41 1.41L12 15.41l2.12 2.12 1.41-1.41L13.41 14l2.12-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4zM6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9z"/></svg>
                    </button>
                    <button type="button" class="action" id="edit-${setup.id}" onclick="editSetup('${setup.id}')" title="edit setup ${setup.name}">
                        <svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 0 24 24" width="30px" fill=var(--accent-text-color)><path d="M0 0h24v24H0V0z" fill="none"/><path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"/></svg>
                    </button>
                    <button type="button" class="action" id="load-${setup.id}" onclick="loadSetup('${setup.id}')" title="load setup ${setup.name}">
                        <svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 0 24 24" width="30px" fill=var(--accent-text-color)><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                    </button>
                </div>
            </div>
            `
    }
    document.getElementById("setups").innerHTML = setupsHTML;
}

function deleteSetup(id) {
    if (confirm("Are you sure you want to delete this configuration?")) {
        for ([index, setup] of setups.entries()) {
            if (setup.id == id && (setup.name != "Default" || confirm("This seems to be default configuration. If you delete it you won't be able to restore default settings without clearing all data. Are you sure again?"))) {
                setups.splice(index, 1);
                break;
            }
        }
        window[storage].setItem("setups", JSON.stringify(setups));
        renderSetups();
        updateExpanderSize("setups");
    }
}

function editSetup(id) {
    for ([index, setup] of setups.entries()) {
        if (setup.id == id) {
            var newName = prompt("Change name of the configuration.", setups[index].name);
            if (newName != null) {
                setups[index].name = newName;
            }
            break;
        }
    }
    window[storage].setItem("setups", JSON.stringify(setups));
    renderSetups();
    updateExpanderSize("setups");
}

function loadSetup(id) {
    for ([index, setup] of setups.entries()) {
        if (setup.id == id) {
            var newGameStarted = false;
            var differentGridSize = setups[index].configuration.gridSize != configuration.gridSize;
            unApplyedConfiguration = structuredClone(setups[index].configuration);
            if (differentGridSize && confirm("This configuration has a different grid size. Start new game with different grid size [confirm] or keep current grid size until new game? [cancel]")) {
                startNewGame();
                var newGameStarted = true;
            }
            if (!newGameStarted) {
                unApplyedConfiguration.gridSize = setups[index].configuration.gridSize;
                applyPartialConfiguration(unApplyedConfiguration);
            }
            setCurrentOptionValues(unApplyedConfiguration);
            showToast("configuration applyed", `<svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 0 24 24" width="30px" fill="var(--text-color)"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"></path></svg>`);
            break;
        }
    }
}

function addSetup() {
    var name = prompt("Name the configuration. Don't be too crazy with the name or you might regret.");
    if (name != null) {
        applyPartialConfiguration(unApplyedConfiguration);
        setups.push({ name: name, id: getRandomId(4), configuration: structuredClone(unApplyedConfiguration) });
        window[storage].setItem("setups", JSON.stringify(setups));
        renderSetups();
        updateExpanderSize("setups");
    }
}

function getRandomId(characterPairs) {
    var consonants = ["b", "c", "d", "f", "g", "h", "j", "k", "l", "m", "n", "p", "q", "r", "s", "t", "v", "w", "x", "z"];
    var vowels = ["a", "e", "i", "o", "u", "y"];
    var id = "";
    for (loop = 0; loop < characterPairs; loop++) {
        id = id + consonants[getRandomNumber(0, consonants.length - 1)];
        id = id + vowels[getRandomNumber(0, vowels.length - 1)];
    }
    return id;
}

function getRandomNumber(bottomIndex, topIndex) {
    var number = Math.round((Math.random() * (topIndex + 1 - bottomIndex)) + (bottomIndex - 0.5)) * 1;
    if (number == -0) {
        number = 0;
    }
    return number;
}

function saveFullConfiguration(savedConfiguration) {
    configuration = structuredClone(savedConfiguration);
    window[storage].setItem("configuration", JSON.stringify(configuration));
}

function savePartialConfiguration(savedConfiguration) {
    var currentGridSize = configuration.gridSize;
    configuration = structuredClone(savedConfiguration);
    configuration.gridSize = currentGridSize;
    window[storage].setItem("configuration", JSON.stringify(configuration));
}

function applyPartialConfiguration(applyedConfiguration) {
    var currentGridSize = configuration.gridSize;
    configuration = structuredClone(applyedConfiguration);
    configuration.gridSize = currentGridSize;
    window[storage].setItem("configuration", JSON.stringify(configuration));
    setPlayBoardStyles();
    updateTheme();
    setBlockColors();
    renderPlayBoard();
}

function setBlockColors() {
    for (loop = 1; loop <= optionPowerColorValuePairsNumber; loop++) {
        cssVariables.style.setProperty(`--power${loop}-color`, configuration.powerColors[loop - 1]);
    }
}

function renderPlayBoard() {
    cssVariables.style.setProperty("--box-size", "0");
    var boardHeight = innerHeight * 0.7;
    var boardWidth = innerWidth * 0.75;
    if (boardHeight < boardWidth) {
        boardSize = boardHeight;
    } else {
        boardSize = boardWidth;
    }
    var boxMargin = ((boardSize / configuration.gridSize) / 15) * configuration.boxMargin;
    cssVariables.style.setProperty("--box-margin", `${boxMargin}px`);
    cssVariables.style.setProperty("--box-size", `${(boardSize - (boxMargin * configuration.gridSize * 2) - ((boxMargin * 2) / configuration.gridSize)) / configuration.gridSize}px`);
    cssVariables.style.setProperty("--block-font-size", `${(boardSize / configuration.gridSize) / 2.5}px`);
    var boxBorderRadius = ((boardSize / configuration.gridSize) / 20) * configuration.boxBorderRadius;
    cssVariables.style.setProperty("--box-border-radius", `${boxBorderRadius}px`);
    document.getElementById("play-board").style.setProperty("border-radius", `${configuration.gridSize ** 1 / 2 * boxBorderRadius}px`);
}

function clearStorage() {
    if (confirm("This action will remove all data and preferences this app saved on your device. Are you sure?")) {
        window[storage].clear();
        location.reload();
    }
}

function resetCurrentStatistics() {
    statistics.hiddenBlocks = [];
    statistics.blocksToRemove = [];
    statistics.blockMovesUndoed = 0;

    for (statisticId in userStatisticsIds) {
        statistics[statisticId] = 0;
    }
}

function defineBaseUserStatistics() {
    for (statisticId in userStatisticsIds) {
        var highestId = `highest${capitalize(statisticId)}`;
        var totalId = `total${capitalize(statisticId)}`;

        statistics[statisticId] = 0;
        statistics[highestId] = {};
        statistics[highestId].grid = 0;
        if (userStatisticsIds[statisticId].total) {
            statistics[totalId] = {};
            statistics[totalId].grid = 0;
        }
    }
}

function predefineUserStatistics() {
    for (statisticId in userStatisticsIds) {
        var highestId = `highest${capitalize(statisticId)}`;
        var totalId = `total${capitalize(statisticId)}`;

        if (typeof statistics[highestId][`grid${configuration.gridSize}`] == "undefined") {
            statistics[highestId][`grid${configuration.gridSize}`] = 0;
        }
        if (userStatisticsIds[statisticId].total) {
            if (typeof statistics[totalId][`grid${configuration.gridSize}`] == "undefined") {
                statistics[totalId][`grid${configuration.gridSize}`] = 0;
            }
        }
    }
}

function startNewGame() {
    saveFullConfiguration(unApplyedConfiguration);
    resetCurrentStatistics();
    predefineUserStatistics();
    blocks = {};
    board = [];
    saves = [];
    updateUserStatisticsDOM();
    setPlayBoardStyles();
    setBlockColors();
    writePlayBoardGrid(false);
    renderPlayBoard();
    createBlock(1);
    createBlock(1);
    updateBoard(true);
    window[storage].setItem("blocks", JSON.stringify(blocks));
    window[storage].setItem("statistics", JSON.stringify(statistics));
    window[storage].setItem("saves", JSON.stringify(saves));
}

function getRGBvalues(RGBColor) {
    return RGBColor.match(/rgb\((\d*?), (\d*?), (\d*?)\)/);
}

function restoreStorage() {
    configuration = structuredClone(JSON.parse(window[storage].getItem("configuration")));
    blocks = structuredClone(JSON.parse(window[storage].getItem("blocks")));
    statistics = structuredClone(JSON.parse(window[storage].getItem("statistics")));
    setups = structuredClone(JSON.parse(window[storage].getItem("setups")));
    board = structuredClone(JSON.parse(window[storage].getItem("board")));
    saves = structuredClone(JSON.parse(window[storage].getItem("saves")));
}

function restoreGame() {
    updateUserStatisticsDOM();
    document.getElementById("blocks-container").innerHTML = "";
    document.getElementById("grid-container").innerHTML = "";
    setPlayBoardStyles();
    setBlockColors();
    writePlayBoardGrid(true);
    renderPlayBoard();
    statistics.hiddenBlocks = [];
    for (block in blocks) {
        restoreBlockElement(blocks[block]);
    }
    updateBoard(true);
}

function installApp() {
    if (typeof pwaInstallPrompt != "undefined") {
        pwaInstallPrompt.prompt();
    } else {
        alert("You can install the app from you browser action menu.");
    }
}

function resetStorage() {
    configuration = { shadows: false, offsetX: 0, offsetY: 0, theme: "auto", soundEffects: true, gridSize: 4, transitions: 1, boxBackground: "rgb(255, 255, 255)", boxBorderRadius: 1, boxMargin: 1, playBoardBackground: "rgb(40, 40, 40)", powerColors: ["rgb(182, 215, 168)", "rgb(147, 196, 125)", "rgb(106, 168, 79)", "rgb(234, 153, 153)", "rgb(224, 102, 102)", "rgb(204, 0, 0)", "rgb(159, 197, 232)", "rgb(111, 168, 220)", "rgb(61, 133, 198)", "rgb(249, 203, 156)", "rgb(246, 178, 107)", "rgb(230, 145, 56)", "rgb(180, 167, 214)", "rgb(142, 124, 195)", "rgb(103, 78, 167)", "rgb(183, 183, 183)", "rgb(153, 153, 153)", "rgb(102, 102, 102)"] };
    setups = [{ name: "Default", id: getRandomId(4), configuration: structuredClone(configuration) }];
    setups.push({ name: "Spectral", id: getRandomId(4), configuration: { shadows: false, offsetX: 0, offsetY: 0, theme: "auto", soundEffects: true, gridSize: 4, transitions: 1, boxBackground: "rgb(255, 255, 255)", boxBorderRadius: 1, boxMargin: 1, playBoardBackground: "rgb(40, 40, 40)", powerColors: ["rgb(175, 106, 106)", "rgb(175, 129, 106)", "rgb(175, 152, 106)", "rgb(175, 175, 106)", "rgb(152, 175, 106)", "rgb(129, 175, 106)", "rgb(106, 175, 106)", "rgb(106, 175, 129)", "rgb(106, 175, 152)", "rgb(106, 175, 175)", "rgb(106, 152, 175)", "rgb(106, 129, 175)", "rgb(106, 106, 175)", "rgb(129, 106, 175)", "rgb(152, 106, 175)", "rgb(175, 106, 175)", "rgb(175, 106, 152)", "rgb(175, 106, 129)"] } });
    window[storage].setItem("configuration", JSON.stringify(configuration));
    window[storage].setItem("setups", JSON.stringify(setups));
    defineBaseUserStatistics();
}

function writePlayBoardGrid(restore) {
    document.getElementById("blocks-container").innerHTML = "";
    document.getElementById("grid-container").innerHTML = "";
    var gridContainer = document.getElementById("grid-container");

    for (row = 0; row < configuration.gridSize; row++) {
        if (!restore) {
            board[row] = [];
        }
        var rowElement = document.createElement("div");
        rowElement.id = `row${row}`;
        gridContainer.appendChild(rowElement);
        for (column = 0; column < configuration.gridSize; column++) {
            if (!restore) {
                board[row][column] = null;
            }
            var boxElement = document.createElement("div");
            boxElement.id = `box-${row}-${column}`;
            boxElement.setAttribute("class", "box");
            rowElement.appendChild(boxElement);
        }
    }
}

function setPlayBoardStyles() {
    if (configuration.shadows) {
        cssVariables.style.setProperty("--play-board-shadows", "5px -5px 8px 0px rgba(0,0,0,0.35)");
    } else {
        cssVariables.style.setProperty("--play-board-shadows", "none");
    }
    cssVariables.style.setProperty("--box-background", `${configuration.boxBackground}`);
    cssVariables.style.setProperty("--play-board-background", `${configuration.playBoardBackground}`);
    cssVariables.style.setProperty("--block-transitions", `top ${120 * configuration.transitions}ms ease-in-out, left ${120 * configuration.transitions}ms ease-in-out, transform ${120 * configuration.transitions}ms ease-in-out, background-color ${240 * configuration.transitions}ms ease-in-out, color ${240 * configuration.transitions}ms ease-in-out`);
}

function getBlockId(row, column) {
    if (typeof board[row] != "undefined") {
        if (typeof board[row][column] != "undefined") {
            block = board[row][column];
        } else {
            block = null;
        }
    } else {
        block = null;
    }
    return block;
}

function checkMoveOptions(row, column, direction) {
    var canMove = false;
    var powerUp = false;
    var localBlock = getBlockId(row, column);
    var obstructingBlock = null;
    var moveSteps = 1;
    if (localBlock != null) {
        while (obstructingBlock == null && ((direction == "right" && moveSteps + column < configuration.gridSize) || (direction == "up" && row - moveSteps >= 0) || (direction == "left" && column - moveSteps >= 0) || (direction == "down" && moveSteps + row < configuration.gridSize))) {
            switch (direction) {
                case "right":
                    obstructingBlock = getBlockId(row, column + moveSteps);
                    break;
                case "up":
                    obstructingBlock = getBlockId(row - moveSteps, column);
                    break;
                case "left":
                    obstructingBlock = getBlockId(row, column - moveSteps);
                    break;
                case "down":
                    obstructingBlock = getBlockId(row + moveSteps, column);
                    break;
                default:
                    break;
            }
            moveSteps++;
        }
        if (obstructingBlock != null) {
            if (blocks[obstructingBlock].power == blocks[localBlock].power) {
                canMove = true;
                powerUp = true;
            } else if (moveSteps > 2) {
                canMove = true;
                moveSteps--;
            }
        } else if (moveSteps > 1) {
            canMove = true;
        }
    }
    return [canMove, localBlock, obstructingBlock, powerUp, direction, moveSteps];
}

function decideBlockMove(row, column, direction) {
    var moveOptions = checkMoveOptions(row, column, direction);
    if (moveOptions[0]) {
        move.moves++;
        moveSingleBlock(moveOptions[1], moveOptions[2], moveOptions[3], moveOptions[4], moveOptions[5]);
    }
}

function checkLostGame() {
    var lostGame = true;
    ["right", "up", "left", "down"].forEach((direction) => {
        for (column = 0; column < configuration.gridSize; column++) {
            for (row = 0; row < configuration.gridSize; row++) {
                if (checkMoveOptions(row, column, direction)[0]) {
                    lostGame = false;
                }
            }
        }
    });
    return lostGame;
}

function updateSaves() {
    if (saves.length > 2) {
        saves.splice(0, 1);
    }
    saves.push({ blocks: structuredClone(JSON.parse(JSON.stringify(blocks))), board: structuredClone(board), statistics: structuredClone(JSON.parse(JSON.stringify(statistics))) });
    window[storage].setItem("saves", JSON.stringify(saves));
}

function moveBlocks(direction) {
    updateSaves();
    move.moves = 0;
    switch (direction) {
        case "right":
            for (column = configuration.gridSize - 2; column >= 0; column--) {
                for (row = 0; row < configuration.gridSize; row++) {
                    decideBlockMove(row, column, direction);
                }
            }
            break;
        case "up":
            for (row = 1; row < configuration.gridSize; row++) {
                for (column = 0; column < configuration.gridSize; column++) {
                    decideBlockMove(row, column, direction);
                }
            }
            break;
        case "left":
            for (column = 1; column < configuration.gridSize; column++) {
                for (row = configuration.gridSize - 1; row >= 0; row--) {
                    decideBlockMove(row, column, direction);
                }
            }
            break;
        case "down":
            for (row = configuration.gridSize - 2; row >= 0; row--) {
                for (column = configuration.gridSize - 1; column >= 0; column--) {
                    decideBlockMove(row, column, direction);
                }
            }
            break;
        default:
            break;
    }
    if (move.moves > 0) {
        updateBlockElement(createBlock(1));

        var previousValue = statistics.moves;
        statistics.moves++;
        updateUserStatistics("moves", previousValue);
    } else if (configuration.soundEffects) {
        stuckAudioEffect.play();
        saves.pop();
    }

    // save current game state into storage
    window[storage].setItem("blocks", JSON.stringify(blocks));
    window[storage].setItem("board", JSON.stringify(board));
    window[storage].setItem("statistics", JSON.stringify(statistics));

    if (checkLostGame()) {
        showToast("you are stuck", `<svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 0 24 24" width="30px" fill=var(--text-color)><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"/></svg>`);
    }
}

function updateUserStatistics(statisticId, previousValue) {
    var highestId = `highest${capitalize(statisticId)}`;
    var totalId = `total${capitalize(statisticId)}`;

    if (statistics[statisticId] > statistics[highestId].grid) {
        statistics[highestId].grid = statistics[statisticId];

        if (statisticId == "highestPower" && statistics[statisticId] >= 128) {
            showToast(`new block discovered!: ${statistics[statisticId]}`, `<svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 0 24 24" width="30px" fill="var(--text-color)"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-4-4h-4v-2h2c1.1 0 2-.89 2-2V9c0-1.11-.9-2-2-2H9v2h4v2h-2c-1.1 0-2 .89-2 2v4h6v-2z"></path></svg>`);
        }
    }
    if (statistics[statisticId] > statistics[highestId][`grid${configuration.gridSize}`]) {
        statistics[highestId][`grid${configuration.gridSize}`] = statistics[statisticId];
    }
    if (userStatisticsIds[statisticId].total) {
        statistics[totalId].grid += (statistics[statisticId] - previousValue);
        statistics[totalId][`grid${configuration.gridSize}`] += (statistics[statisticId] - previousValue);
    }
}

function updateUserStatisticsDOM() {
    for (statisticId in userStatisticsIds) {
        var highestId = `highest${capitalize(statisticId)}`;
        var totalId = `total${capitalize(statisticId)}`;

        document.getElementById(`game-${statisticId}-value`).innerHTML = Math.round(statistics[statisticId]);
        if (!statistics.ignoreGridSize) {
            document.getElementById(`game-${highestId}-value`).innerHTML = Math.round(statistics[highestId][`grid${configuration.gridSize}`]);
        } else {
            document.getElementById(`game-${highestId}-value`).innerHTML = Math.round(statistics[highestId].grid);
        }
        if (userStatisticsIds[statisticId].total) {
            if (!statistics.ignoreGridSize) {
                document.getElementById(`game-${totalId}-value`).innerHTML = Math.round(statistics[totalId][`grid${configuration.gridSize}`]);
            } else {
                document.getElementById(`game-${totalId}-value`).innerHTML = Math.round(statistics[totalId].grid);
            }
        }
    }
}

function moveSingleBlock(localBlock, obstructingBlock, powerUp, direction, moveSteps) {

    board[blocks[localBlock].row][blocks[localBlock].column] = null;

    if (powerUp) {
        blocks[obstructingBlock].power++;

        if (2 ** blocks[obstructingBlock].power > statistics.highestPower) {
            var previousValue = statistics.highestPower;
            statistics.highestPower = 2 ** blocks[obstructingBlock].power;
            updateUserStatistics("highestPower", previousValue);
        }

        var previousValue = statistics.blocksPowered;
        statistics.blocksPowered++;
        updateUserStatistics("blocksPowered", previousValue);

        var previousValue = statistics.score;
        statistics.score += 2 ** blocks[obstructingBlock].power;
        updateUserStatistics("score", previousValue);

        blocks[obstructingBlock].transforms[0] = "scale(1.2)";
        blocks[obstructingBlock].element.style.setProperty("transform", blocks[obstructingBlock].transforms[0] + " " + blocks[obstructingBlock].transforms[1]);
        blocks[localBlock].element.style.setProperty("z-index", 0);
        blocks[localBlock].transforms[0] = "scale(0)";
        blocks[localBlock].element.style.setProperty("transform", blocks[localBlock].transforms[0] + " " + blocks[localBlock].transforms[1]);

        blocks[obstructingBlock].element.style.setProperty("background-color", `var(--power${blocks[obstructingBlock].power}-color)`);
        blocks[obstructingBlock].element.style.setProperty("color", getReadableTextColor(configuration.powerColors[blocks[obstructingBlock].power - 1]));

        move.powerUpBlockPairs.push({ localBlock: blocks[localBlock], obstructingBlock: blocks[obstructingBlock] });
        statistics.blocksToRemove.push(blocks[localBlock]);

        setTimeout(function () {
            var powerUpBlockPair = move.powerUpBlockPairs[0];
            updateBlockElement(powerUpBlockPair.obstructingBlock);
            powerUpBlockPair.obstructingBlock.transforms[0] = "scale(1)";
            powerUpBlockPair.obstructingBlock.element.style.setProperty("transform", powerUpBlockPair.obstructingBlock.transforms[0] + " " + powerUpBlockPair.obstructingBlock.transforms[1]);
            removeBlock(powerUpBlockPair.localBlock);
            move.powerUpBlockPairs.splice(0, 1);
            statistics.blocksToRemove.splice(0, 1);
        }, 120 * configuration.transitions + 10);

        setTimeout(function () {
            if (configuration.soundEffects) {
                joinAudioEffect.play();
            }
        }, (Math.max(120 * configuration.transitions) - 80, 0));

    }

    switch (direction) {
        case "right":
            blocks[localBlock].column += moveSteps - 1;
            break;
        case "up":
            blocks[localBlock].row -= moveSteps - 1;
            break;
        case "left":
            blocks[localBlock].column -= moveSteps - 1;
            break;
        case "down":
            blocks[localBlock].row += moveSteps - 1;
            break;
        default:
            break;
    }

    if (!powerUp) {
        board[blocks[localBlock].row][blocks[localBlock].column] = blocks[localBlock].id;
    }

    updateBlockElement(blocks[localBlock]);

}

function capitalize(string) {
    return string.substring(0, 1).toUpperCase() + string.substring(1, string.length);
}

function removeBlock(block) {
    removeBlockElement(block);
    delete blocks[block.id];
    window[storage].setItem("blocks", JSON.stringify(blocks));
}

function removeBlockElement(block, transition = false) {
    try {
        var blockElement = block.element;
    } catch (error) {
        var blockElement = document.getElementById(`block-${block.id}`);
    }
    if (transition) {
        block.transforms[0] = "scale(0)";
        block.element.style.setProperty("transform", block.transforms[0] + " " + block.transforms[1]);
        setTimeout(function () {
            blockElement.remove();
        }, 120 * configuration.transitions + 10);
    } else {
        blockElement.remove();
    }
}

function getReadableTextColor(backgroundRGB) {

    var backgroundRGB = getRGBvalues(backgroundRGB);
    var R = backgroundRGB[1] * 1;
    var G = backgroundRGB[2] * 1;
    var B = backgroundRGB[3] * 1;

    if (R <= 10) {
        var Rg = R / 3294;
    } else {
        var Rg = (R / 269 + 0.0513) ** 2.4;
    }

    if (G <= 10) {
        var Gg = G / 3294;
    } else {
        var Gg = (G / 269 + 0.0513) ** 2.4;
    }

    if (B <= 10) {
        var Bg = B / 3294;
    } else {
        var Bg = B / (269 + 0.0513) ** 2.4;
    }

    var relativeLumninance = 0.2126 * Rg + 0.7152 * Gg + 0.0722 * Bg;
    if (relativeLumninance < 0.5) return "white";
    else return "black";

}

function createBlock(power) {

    blockId = getRandomId(4);
    do {
        var startRow = getRandomNumber(0, configuration.gridSize - 1);
        var startColumn = getRandomNumber(0, configuration.gridSize - 1);
    }
    while (getBlockId(startRow, startColumn) != null);

    board[startRow][startColumn] = blockId;
    window[storage].setItem("board", JSON.stringify(board));

    var blockElement = document.createElement("div");
    blockElement.id = `block-${blockId}`;
    blockElement.setAttribute("class", "block");

    var boxFromSide = getBoxFromSide(startRow, startColumn);
    var halfBoxSize = cssVariables.style.getPropertyValue("--box-size").replace("px", "") / 2;
    var transforms = ["scale(0)", `translate(${boxFromSide[0]}px, ${boxFromSide[1]}px)`];
    blockElement.style.setProperty("transform", transforms[0] + " " + transforms[1]);
    blockElement.style.setProperty("transform-origin", `${(boxFromSide[0] + halfBoxSize)}px ${(boxFromSide[1] + halfBoxSize)}px`);
    blockElement.style.setProperty("color", getReadableTextColor(configuration.powerColors[power - 1]));

    document.getElementById("blocks-container").appendChild(blockElement);

    blocks[blockId] = { id: blockId, row: startRow, column: startColumn, power: power, element: blockElement, transforms: transforms };

    statistics.hiddenBlocks.push(blocks[blockId]);
    getComputedStyle(statistics.hiddenBlocks[0].element).opacity;
    statistics.hiddenBlocks[0].transforms[0] = "scale(1)";
    statistics.hiddenBlocks[0].element.style.setProperty("transform", statistics.hiddenBlocks[0].transforms[0] + " " + statistics.hiddenBlocks[0].transforms[1]);
    statistics.hiddenBlocks.splice(0, 1);

    var previousValue = statistics.blocksCreated;
    statistics.blocksCreated++;
    updateUserStatistics("blocksCreated", previousValue);
    return blocks[blockId];

}

function undoBlockMove() {
    if (saves.length >= 1 && statistics.blockMovesUndoed < 3) {
        if (configuration.soundEffects) {
            undoAudioEffect.play();
        }

        var previousBlocks = structuredClone(JSON.parse(JSON.stringify(blocks)));

        // restore old global objects
        blocks = {};
        blocks = structuredClone(saves[saves.length - 1].blocks);
        board = [];
        board = structuredClone(saves[saves.length - 1].board);
        var statisticsIgnoreGridSize = statistics.ignoreGridSize;
        var statisticsBlockMovesUndoed = statistics.blockMovesUndoed;
        statistics = {};
        statistics = structuredClone(saves[saves.length - 1].statistics);
        statistics.ignoreGridSize = statisticsIgnoreGridSize;
        statistics.blockMovesUndoed = statisticsBlockMovesUndoed;

        // remove block objects that weren't removed because of former ongoing transition
        for (blockToRemove of statistics.blocksToRemove) {
            delete blocks[blockToRemove.id];
        }

        // set every block scale to normal
        for (block in blocks) {
            blocks[block].transforms[0] = "scale(1)";
        }

        var currentBlocksIds = [];
        for (block in blocks) {
            currentBlocksIds.push(block);
        }

        // restore element properties
        for (block in blocks) {
            blocks[block].element = document.getElementById(`block-${block}`);
        }

        // remove blocks created in future
        for (blockId in previousBlocks) {
            if (!currentBlocksIds.includes(blockId)) {
                previousBlocks[blockId].element = document.getElementById(`block-${blockId}`);
                removeBlockElement(previousBlocks[blockId], true);
            }
        }

        // restore blocks removed in past
        for (blockId in blocks) {
            if (!previousBlocks.hasOwnProperty(blockId)) {
                restoreBlockElement(blocks[blockId]);
            }
        }

        saves.splice(saves.length - 1);
        updateBoard(true);
        statistics.blockMovesUndoed++;

        window[storage].setItem("blocks", JSON.stringify(blocks));
        window[storage].setItem("statistics", JSON.stringify(statistics));
        window[storage].setItem("saves", JSON.stringify(saves));
        window[storage].setItem("board", JSON.stringify(board));
    } else if (statistics.moves != 0) {
        showToast("you reached undo limit", `<svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 0 24 24" width="30px" fill=var(--text-color)><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"/></svg>`);
    }
}

function restoreBlockElement(block) {

    var blockElement = document.createElement("div");
    block.element = blockElement;
    blockElement.id = `block-${block.id}`;
    blockElement.setAttribute("class", "block");

    var boxFromSide = getBoxFromSide(block.row, block.column);
    var halfBoxSize = cssVariables.style.getPropertyValue("--box-size").replace("px", "") / 2;
    var transforms = ["scale(0)", `translate(${boxFromSide[0]}px, ${boxFromSide[1]}px)`];
    blockElement.style.setProperty("transform", transforms[0] + " " + transforms[1]);
    blockElement.style.setProperty("transform-origin", `${(boxFromSide[0] + halfBoxSize)}px ${(boxFromSide[1] + halfBoxSize)}px`);
    blockElement.style.setProperty("background-color", `var(--power${block.power}-color)`);
    blockElement.style.setProperty("color", getReadableTextColor(configuration.powerColors[block.power - 1]));

    document.getElementById("blocks-container").appendChild(blockElement);

    statistics.hiddenBlocks.push(block);
    getComputedStyle(statistics.hiddenBlocks[0].element).opacity;
    statistics.hiddenBlocks[0].transforms[0] = "scale(1)";
    statistics.hiddenBlocks[0].element.style.setProperty("transform", statistics.hiddenBlocks[0].transforms[0] + " " + statistics.hiddenBlocks[0].transforms[1]);
    statistics.hiddenBlocks.splice(0, 1);

    return block;

}

function getBoxFromSide(row, column) {
    var originalBoxScale = cssVariables.style.getPropertyValue("--box-scale");
    cssVariables.style.setProperty("--box-scale", "scale(1)");
    var boxFromLeft = ((document.getElementById(`box-${row}-${column}`).getBoundingClientRect().left + scrollX) * 1 - (document.getElementById(`play-board`).getBoundingClientRect().left * 1 + scrollX * 1) - (cssVariables.style.getPropertyValue("--box-margin").replace("px", "")) * 1) + configuration.offsetX;
    var boxFromTop = ((document.getElementById(`box-${row}-${column}`).getBoundingClientRect().top + scrollY) * 1 - (document.getElementById(`play-board`).getBoundingClientRect().top * 1 + scrollX * 1) - (cssVariables.style.getPropertyValue("--box-margin").replace("px", "")) * 1) + configuration.offsetY;
    cssVariables.style.setProperty("--box-scale", originalBoxScale);
    return [boxFromLeft, boxFromTop];
}

function updateBoard(transitions = true) {

    if (!transitions) {
        setTimeout(function () {
            cssVariables.style.setProperty("--block-transitions", `top 0 ease-in-out, left 0 ease-in-out, transform 0 ease-in-out, background-color 0 ease-in-out, color 0 ease-in-out`);
        }, 20);
        var timeout = 10;
    } else {
        var timeout = 0;
    }

    setTimeout(function () {
        for (block in blocks) {
            updateBlockElement(blocks[block]);
        }
    }, timeout);

    if (!transitions) {
        setTimeout(function () {
            cssVariables.style.setProperty("--block-transitions", `top ${120 * configuration.transitions}ms ease-in-out, left ${120 * configuration.transitions}ms ease-in-out, transform ${120 * configuration.transitions}ms ease-in-out, background-color ${240 * configuration.transitions}ms ease-in-out, color ${240 * configuration.transitions}ms ease-in-out`);
        }, 20);
    }

}

function updateBlockElement(block) {

    var boxFromSide = getBoxFromSide(block.row, block.column);
    var halfBoxSize = cssVariables.style.getPropertyValue("--box-size").replace("px", "") / 2;

    block.element.style.setProperty("transform-origin", `${(boxFromSide[0] + halfBoxSize)}px ${(boxFromSide[1] + halfBoxSize)}px`);
    block.transforms[1] = `translate(${boxFromSide[0]}px, ${boxFromSide[1]}px)`;
    block.element.style.setProperty("transform", block.transforms[0] + " " + block.transforms[1]);
    block.element.innerHTML = 2 ** block.power;
    block.element.style.setProperty("background-color", `var(--power${block.power}-color)`);
    block.element.style.setProperty("color", getReadableTextColor(configuration.powerColors[block.power - 1]));

    if (block.power > 9) {
        var powerText = 2 ** block.power + "";
        var blockFontSize = cssVariables.style.getPropertyValue("--block-font-size").replace("px", "") * 1;
        block.element.style.setProperty("font-size", `${blockFontSize / powerText.length * 3}px`);
    }

}

function getRandomNumber(from, to) {
    var number = Math.round((Math.random() * (to + 1 - from)) + (from - 0.5)) * 1;
    if (number == -0) number = 0;
    return number;
}

// https://github.com/john-doherty/swiped-events
(function (window, document) {

    'use strict';

    // patch CustomEvent to allow constructor creation (IE/Chrome)
    if (typeof window.CustomEvent !== 'function') {

        window.CustomEvent = function (event, params) {

            params = params || { bubbles: false, cancelable: false, detail: undefined };

            var evt = document.createEvent('CustomEvent');
            evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
            return evt;
        };

        window.CustomEvent.prototype = window.Event.prototype;
    }

    document.addEventListener('touchstart', handleTouchStart, false);
    document.addEventListener('touchmove', handleTouchMove, false);
    document.addEventListener('touchend', handleTouchEnd, false);

    var xDown = null;
    var yDown = null;
    var xDiff = null;
    var yDiff = null;
    var timeDown = null;
    var startEl = null;

    /**
     * Fires swiped event if swipe detected on touchend
     * @param {object} e - browser event object
     * @returns {void}
     */
    function handleTouchEnd(e) {

        // if the user released on a different target, cancel!
        if (startEl !== e.target) return;

        var swipeThreshold = parseInt(getNearestAttribute(startEl, 'data-swipe-threshold', '20'), 10); // default 20px
        var swipeTimeout = parseInt(getNearestAttribute(startEl, 'data-swipe-timeout', '500'), 10);    // default 500ms
        var timeDiff = Date.now() - timeDown;
        var eventType = '';
        var changedTouches = e.changedTouches || e.touches || [];

        if (Math.abs(xDiff) > Math.abs(yDiff)) { // most significant
            if (Math.abs(xDiff) > swipeThreshold && timeDiff < swipeTimeout) {
                if (xDiff > 0) {
                    eventType = 'swiped-left';
                }
                else {
                    eventType = 'swiped-right';
                }
            }
        }
        else if (Math.abs(yDiff) > swipeThreshold && timeDiff < swipeTimeout) {
            if (yDiff > 0) {
                eventType = 'swiped-up';
            }
            else {
                eventType = 'swiped-down';
            }
        }

        if (eventType !== '') {

            var eventData = {
                dir: eventType.replace(/swiped-/, ''),
                touchType: (changedTouches[0] || {}).touchType || 'direct',
                xStart: parseInt(xDown, 10),
                xEnd: parseInt((changedTouches[0] || {}).clientX || -1, 10),
                yStart: parseInt(yDown, 10),
                yEnd: parseInt((changedTouches[0] || {}).clientY || -1, 10)
            };

            // fire `swiped` event event on the element that started the swipe
            startEl.dispatchEvent(new CustomEvent('swiped', { bubbles: true, cancelable: true, detail: eventData }));

            // fire `swiped-dir` event on the element that started the swipe
            startEl.dispatchEvent(new CustomEvent(eventType, { bubbles: true, cancelable: true, detail: eventData }));
        }

        // reset values
        xDown = null;
        yDown = null;
        timeDown = null;
    }

    /**
     * Records current location on touchstart event
     * @param {object} e - browser event object
     * @returns {void}
     */
    function handleTouchStart(e) {

        // if the element has data-swipe-ignore="true" we stop listening for swipe events
        if (e.target.getAttribute('data-swipe-ignore') === 'true') return;

        startEl = e.target;

        timeDown = Date.now();
        xDown = e.touches[0].clientX;
        yDown = e.touches[0].clientY;
        xDiff = 0;
        yDiff = 0;
    }

    /**
     * Records location diff in px on touchmove event
     * @param {object} e - browser event object
     * @returns {void}
     */
    function handleTouchMove(e) {

        if (!xDown || !yDown) return;

        var xUp = e.touches[0].clientX;
        var yUp = e.touches[0].clientY;

        xDiff = xDown - xUp;
        yDiff = yDown - yUp;
    }

    /**
     * Gets attribute off HTML element or nearest parent
     * @param {object} el - HTML element to retrieve attribute from
     * @param {string} attributeName - name of the attribute
     * @param {any} defaultValue - default value to return if no match found
     * @returns {any} attribute value or defaultValue
     */
    function getNearestAttribute(el, attributeName, defaultValue) {

        // walk up the dom tree looking for attributeName
        while (el && el !== document.documentElement) {

            var attributeValue = el.getAttribute(attributeName);

            if (attributeValue) {
                return attributeValue;
            }

            el = el.parentNode;
        }

        return defaultValue;
    }

}(window, document));
