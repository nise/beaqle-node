/**
 * Audio pool object. Creates and manages a set of <audio> tags.
 * @param {*} PoolID 
 */


// constructor
var AudioPool = function (PoolID) {
    this.NumPlayers = 0;
    this.NumUsed = 0;
    this.LoopAudio = 0;
    this.LoopFade = false;
    this.AutoReturn = true;
    this.ABPos = [0, 100];
    this.PoolID = PoolID;
    this.IDPlaying = -1;
    this.fadeInTime = 0.03;
    this.fadeOutTime = 0.01;
    this.fadeDelay = 0.01;
    this.lastAudioPosition = 0;
    this.positionUpdateInterval = 0.005;

    // web audio is only supported for same origin
    switch (window.location.protocol) {
        case 'http:':
        case 'https:':
            // check web audio support
            try {
                var genContextClass = (window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.oAudioContext || window.msAudioContext);
                this.waContext = new genContextClass();
                this.gainNodes = new Array();
            } catch (e) {
                // API not supported
                this.waContext = false;
            }
            break;
        case 'file:':
            this.waContext = false;
            break;
    }
    // IE does not support the WebAudioAPI
    if (clientIsIE() || clientIsSafari())
        this.waContext = false;

    // Firefox needs a longer delay before we start a fading curve,
    // otherwise the fading is not recognized
    if (clientIsFirefox())
        this.fadeDelay = 0.05;

    // set to false to manually disable WebAudioAPI support
    //this.waContext = false;

    // setup regular callback timer to check current playback position
    var _this = this;
    setInterval(this.loopCallback, this.positionUpdateInterval * 1000, _this);

};

// insert audio pool into DOM
AudioPool.prototype.register = function () {
    $('<div id="' + this.PoolID + '"></div>').appendTo('body');
};

// callback for timeUpdate event
AudioPool.prototype.loopCallback = function (_this) {

    if (_this.IDPlaying !== -1) {

        var audiotag = $('#' + _this.PoolID + ' > #audio' + _this.IDPlaying).get(0);

        // calculate progress including a look ahead for fade out or loop
        var progress = 0;
        progress = (audiotag.currentTime + _this.positionUpdateInterval + _this.fadeOutTime * 2) / audiotag.duration * 100.0;

        // if end is reached ...
        if ((progress >= _this.ABPos[1]) && (!_this.LoopFade)) {
            if (_this.LoopAudio == true) {
                _this.loopReturn();
            } else {
                _this.pause();
            }
        }
    }
};

// ---------------------------------------------------------
// overwrite these callbacks events after instantiation

// callback for time update event
AudioPool.prototype.onTimeUpdate = function (e) { }

// callback for error event
AudioPool.prototype.onError = function (e) { }

// callback for error event
AudioPool.prototype.onDataLoaded = function (e) { }
// ---------------------------------------------------------


// clear all files
AudioPool.prototype.clear = function () {
    if (this.waContext !== false) {
        this.gainNodes = new Array();
        // maybe we also have to remove the connections?!
    }

    if (clientIsChrome()) {
        //fixes bug in chromium. Otherwise old connections are not freed and maximum number of connections is reached soon
        //https://code.google.com/p/chromium/issues/detail?id=234779
        $('#' + this.PoolID + ' >.audiotags').prop('src', false);
    }

    $('#' + this.PoolID + ' >.audiotags').remove();
}

// add new file to pool
AudioPool.prototype.addAudio = function (path, ID) {

    var audiotag = document.createElement("audio");

    audiotag.setAttribute('src', path);
    audiotag.setAttribute('class', 'audiotags');
    audiotag.setAttribute('id', "audio" + ID)

    if (this.waContext !== false) {
        var gainNode = this.waContext.createGain();
        var source = this.waContext.createMediaElementSource(audiotag);
        source.connect(gainNode);
        gainNode.connect(this.waContext.destination);
        gainNode.gain.value = 0.0000001;  // fixes https://bugzilla.mozilla.org/show_bug.cgi?id=1213313
        gainNode.gain.setValueAtTime(0.0000001, this.waContext.currentTime);
        this.gainNodes[ID] = gainNode;
    }

    $(audiotag).off();

    // external event handlers
    $(audiotag).on("timeupdate", this.onTimeUpdate);
    $(audiotag).on("loadeddata", this.onDataLoaded);
    $(audiotag).on("error", this.onError);

    $('#' + this.PoolID).append(audiotag);

    if (!clientIsChrome()) {
        audiotag.setAttribute('preload', 'auto');
    } else {
        //preload=none fixes bug in chromium. Otherwise old connections are not freed and maximum number of connections is reached soon
        //https://code.google.com/p/chromium/issues/detail?id=234779
        audiotag.setAttribute('preload', 'none');
        audiotag.load();
    }
}

// play audio with specified ID
AudioPool.prototype.play = function (ID) {
    var audiotag = $('#' + this.PoolID + ' > #audio' + ID).get(0);

    if ((this.AutoReturn === false) &&
        (this.lastAudioPosition + this.fadeDelay <= (this.ABPos[1] / 100 * audiotag.duration)) &&
        (this.lastAudioPosition >= (this.ABPos[0] / 100 * audiotag.duration)))
        audiotag.currentTime = this.lastAudioPosition;
    else
        audiotag.currentTime = 0.000001 + this.ABPos[0] / 100.0 * audiotag.duration;

    if (this.waContext !== false) {
        var loopLen = (this.ABPos[1] - this.ABPos[0]) / 100.0 * audiotag.duration;
        if (loopLen > this.fadeOutTime * 2 + this.positionUpdateInterval * 2) {
            this.gainNodes[ID].gain.cancelScheduledValues(this.waContext.currentTime);
            this.gainNodes[ID].gain.value = 0.0000001;  // fixes https://bugzilla.mozilla.org/show_bug.cgi?id=1213313
            this.gainNodes[ID].gain.setValueAtTime(0.0000001, this.waContext.currentTime);
            this.gainNodes[ID].gain.setTargetAtTime(1.0, this.waContext.currentTime + this.fadeDelay, this.fadeInTime);
            this.LoopFade = false;
            audiotag.play();
        }
    } else {
        audiotag.play();
    }

    this.IDPlaying = ID;
}

// return to loop begin
AudioPool.prototype.loopReturn = function () {

    if (this.waContext !== false) {
        // fade out
        this.gainNodes[this.IDPlaying].gain.cancelScheduledValues(this.waContext.currentTime);
        this.gainNodes[this.IDPlaying].gain.setTargetAtTime(0.0, this.waContext.currentTime + this.fadeDelay, this.fadeOutTime);
        this.LoopFade = true;

        var audiotag = $('#' + this.PoolID + ' > #audio' + this.IDPlaying).get(0);
        var currID = this.IDPlaying;
        var _this = this;
        // wait till fade out is done
        setTimeout(function () {
            _this.LoopFade = false;
            audiotag.currentTime = 0.000001 + _this.ABPos[0] / 100.0 * audiotag.duration;
            _this.gainNodes[_this.IDPlaying].gain.cancelScheduledValues(_this.waContext.currentTime);
            _this.gainNodes[_this.IDPlaying].gain.setTargetAtTime(1.0, _this.waContext.currentTime + _this.fadeDelay, _this.fadeInTime);
        },
            (_this.fadeOutTime * 2.0 + _this.fadeDelay) * 1000.0 + 5.0
        );
    } else {
        // return to the start marker
        var audiotag = $('#' + this.PoolID + ' > #audio' + this.IDPlaying).get(0);
        audiotag.currentTime = 0.000001 + this.ABPos[0] / 100.0 * audiotag.duration;
        audiotag.play();
    }
}

// pause currently playing audio
AudioPool.prototype.pause = function () {

    if (this.IDPlaying !== -1) {

        var audiotag = $('#' + this.PoolID + ' > #audio' + this.IDPlaying).get(0);
        this.lastAudioPosition = audiotag.currentTime;
        if ((this.waContext !== false) && (!audiotag.paused)) {
            this.gainNodes[this.IDPlaying].gain.cancelScheduledValues(this.waContext.currentTime);
            this.gainNodes[this.IDPlaying].gain.setTargetAtTime(0.0, this.waContext.currentTime + this.fadeDelay, this.fadeOutTime);

            var _this = this;
            var prevID = this.IDPlaying;
            setTimeout(function () { if (_this.IDPlaying !== prevID) audiotag.pause(); }, (_this.fadeOutTime * 2.0 + _this.fadeDelay) * 1000.0 + 5.0);
        } else {
            audiotag.pause();
        }
        this.IDPlaying = -1;
    }
}

// set volume of <audio> tags
AudioPool.prototype.setVolume = function (vol) {
    var vol = document.getElementById('VolumeSlider').getAttribute('value') / 100;//$('#VolumeSlider').slider('option', 'value') / 100;

    var audioTags = $('#' + this.PoolID + ' > audio');
    for (var i = 0; i < audioTags.length; i++) {
        audioTags[i].volume = vol;
    }
}

// set loop mode
AudioPool.prototype.setLooped = function (loop) {
    this.LoopAudio = loop;
}

// toggle loop mode
AudioPool.prototype.toggleLooped = function () {
    this.LoopAudio = !this.LoopAudio;
}

// set auto return mode
AudioPool.prototype.setAutoReturn = function (autoReturn) {
    this.AutoReturn = autoReturn;
}

// toggle auto return mode
AudioPool.prototype.toggleAutoReturn = function () {
    this.AutoReturn = !this.AutoReturn;
}
