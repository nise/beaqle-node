// ###################################################################
// some helper functions

// logarithm to base 10
function log10(val) {
    return Math.log(val) / Math.log(10);
}

// check for Internet Explorer version
function clientIsIE() {
    if (/MSIE (\d+\.\d+);/.test(navigator.userAgent)) { //test for MSIE x.x;
        var ieversion = new Number(RegExp.$1) // capture x.x portion and store as a number
        return ieversion;
    }
    return 0;
}

// check for Firefox
function clientIsFirefox() {
    return typeof InstallTrigger !== 'undefined';
}

// check for Google Chrome/Chromium
function clientIsChrome() {
    return !!window.chrome && !clientIsOpera();
}

// check for Apple Safari
function clientIsSafari() {
    return Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
}

// check for Opera
function clientIsOpera() {
    return !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
}

// get date and time formatted as YYYMMDD-hhmmss
function getDateStamp() {
    var date = new Date();
    function pad(num) {
        num = num + '';
        return num.length < 2 ? '0' + num : num;
    }
    return date.getFullYear() +
        pad(date.getMonth() + 1) +
        pad(date.getDate()) + '-' +
        pad(date.getHours()) +
        pad(date.getMinutes()) +
        pad(date.getSeconds());
}

// provide a virtual download to text file with a specified file name
function saveTextAsFile(txt, fileName) {
    var fileBlob = new Blob([txt], { type: 'text/plain' });

    var downloadLink = document.createElement("a");
    downloadLink.download = fileName;
    downloadLink.innerHTML = "Download File";

    // safari does not download text files but tries to open them in the browser
    // so let's at least open a new window for that
    if (clientIsSafari())
        downloadLink.target = "_blank";

    downloadLink.href = window.URL.createObjectURL(fileBlob);
    downloadLink.onclick = function (event) { document.body.removeChild(event.target); };
    downloadLink.style.display = "none";

    // Firefox requires the link to be added to the DOM
    // before it can be clicked.
    document.body.appendChild(downloadLink);

    downloadLink.click();
}

// shuffle array entries using the Fisher-Yates algorithm
// implementation inspired by http://bost.ocks.org/mike/shuffle/
function shuffleArray(array) {
    var m = array.length, t, i;

    // While there remain elements to shuffle…
    while (m) {

        // Pick a remaining element…
        i = Math.floor(Math.random() * m--);

        // And swap it with the current element.
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }

    return array;
}