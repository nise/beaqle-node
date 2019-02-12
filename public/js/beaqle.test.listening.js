// ###################################################################
// Listening test main object


// ###################################################################
// constructor and initialization
var ListeningTest = function (TestData) {

    if (arguments.length == 0) return;

    // check if config file is valid
    if (typeof (TestData) == 'undefined') {
        alert('Config file could not be loaded!');
    }

    // check for IE as it does not support the FileAPI-Blob constructor below version 9
    if ((clientIsIE() > 0) && (clientIsIE() < 9)) {
        $('#LoadOverlay').show();
        $('#LoadOverlay').append('<p class="error">Internet Explorer version 8 and below is unfortunately not supported by BeaqleJS. Please update to a recent release or choose another browser.</p>');
        return;
    }

    // Load and verify config
    this.TestConfig = TestData;
    this.setDefaults(this.TestConfig);

    // some state variables
    this.TestState = {
        "CurrentTest": -1, 		// the current test index
        "TestIsRunning": 0,		// is true if test is running, false when finished or not yet started
        "FileMappings": [],		// json array with random file mappings
        "Ratings": [],			// json array with ratings
        "EvalResults": [],      // json array to store the evaluated test results
        "AudiosInLoadQueue": -1,
        "AudioLoadError": false
    }


    // create and configure audio pool
    this.audioPool = new AudioPool('AudioPool');
    this.audioPool.register();
    this.audioPool.onTimeUpdate = $.proxy(this.audioTimeCallback, this);
    this.audioPool.onError = $.proxy(this.audioErrorCallback, this);
    this.audioPool.onDataLoaded = $.proxy(this.audioLoadedCallback, this);
    this.audioPool.setLooped(this.TestConfig.LoopByDefault);
    this.audioPool.setAutoReturn(this.TestConfig.AutoReturnByDefault);

    this.checkBrowserFeatures();

    // show introduction div
    $('#TestTitle').html(this.TestConfig.TestName);
    $('#TestIntroduction').show();

    // setup buttons and controls
    var _this = this;
    var volSlider = document.getElementById('VolumeSlider');

    $('#VolumeSlider').slider({
        min: 0,
        max: 100,
        value: 100,
        slide: function (event, ui) {
            var vol = log10($('#VolumeSlider').slider('option', 'value')) / 2;
            _this.audioPool.setVolume(vol);
        }
    });

    if (this.TestConfig.EnableABLoop == true) {
        $('#ABRange').slider({
            range: true,
            values: [0, 100],
            min: 0,
            max: 100,
            slide: function (event, ui) {
                _this.audioPool.ABPos = ui.values;
            }
        });
    } else {
        $('#ABRange').hide();
        $('#ProgressBar').css('margin-top', $('#ProgressBar').height() + 'px');
    }
    $('#PauseButton').button();

    if (this.TestConfig.LoopByDefault) {
        $('#ChkLoopAudio').prop("checked", true);
    } else {
        $('#ChkLoopAudio').prop("checked", false);
    }
    $('#ChkLoopAudio').on('change', $.proxy(_this.toggleLooping, _this));

    if (this.TestConfig.AutoReturnByDefault) {
        $('#ChkAutoReturn').prop("checked", true);
    } else {
        $('#ChkAutoReturn').prop("checked", false);
    }
    $('#ChkAutoReturn').on('change', $.proxy(_this.toggleAutoReturn, _this));

    $('#ProgressBar').progressbar();
    $('#BtnNextTest').on('click', $.proxy(_this.nextTest, _this));
    $('#BtnPrevTest').on('click', $.proxy(_this.prevTest, _this));
    $('#BtnPrevTest').hide();
    
    $('#BtnStartTest').button();
    $('#BtnSubmitData').button({ icons: { primary: 'ui-icon-signal-diag' } });
    $('#BtnDownloadData').button({ icons: { primary: 'ui-icon-arrowthickstop-1-s' } });


    // install handler to warn user when test is running and he tries to leave the page
    var testHandle = this.TestState
    window.onbeforeunload = function (e) {
        if (testHandle.TestIsRunning == true) {
            return 'The listening test is not yet finished!';
        } else {
            return;
        }
    }


}

// ###################################################################
ListeningTest.prototype.setDefaults = function (config) {
    var defaults = {
        "ShowFileIDs": false,
        "ShowResults": false,
        "LoopByDefault": true,
        "AutoReturnByDefault": true,
        "EnableABLoop": true,
        "EnableOnlineSubmission": false,
        "BeaqleServiceURL": "",
        "SupervisorContact": "",
        "RandomizeTestOrder": false,
        "MaxTestsPerRun": -1,
        "AudioRoot": ""
    }

    for (var property in defaults) {
        if (config[property] === undefined)
            config[property] = defaults[property];
    }
}

// ###################################################################
ListeningTest.prototype.nextTest = function () {

    this.pauseAllAudios();

    // save ratings from last test
    if (this.saveRatings(this.TestState.TestSequence[this.TestState.CurrentTest]) === false)
        return;

    // stop time measurement
    this.TestState.Runtime[this.TestState.TestSequence[this.TestState.CurrentTest]] += new Date().getTime() - this.TestState.startTime;
    
   
    // go to next test
    if (this.TestState.CurrentTest < this.TestState.TestSequence.length - 1) {
        this.TestState.CurrentTest++;
        if (this.TestState.CurrentTest >= 1) {
            $('#BtnPrevTest').show();
        }
        this.runTest(this.TestState.TestSequence[this.TestState.CurrentTest]);
    } else {
        // if previous test was last one, ask before loading final page and then exit test
        // if (confirm('This was the last test. Do you want to finish?')) {

        $('#TableContainer').hide();
        $('#PlayerControls').hide();
        $('#BtnNextTest').hide();
        $('#TestEnd').show();

        $('#ResultsBox').html(this.formatResults());
        if (this.TestConfig.ShowResults)
            $("#ResultsBox").show();
        else
            $("#ResultsBox").hide();

        $("#SubmitBox").show();
        $('#BtnSubmitData').show();

        $("#SubmitBox > .submitEmail").hide();
        if (this.TestConfig.EnableOnlineSubmission) {
            $("#SubmitBox > .submitOnline").show();
            $("#SubmitBox > .submitDownload").hide();
        } else {
            $("#SubmitBox > .submitOnline").hide();
            if (this.TestConfig.SupervisorContact) {
                $("#SubmitBox > .submitEmail").show();
                $(".supervisorEmail").html(this.TestConfig.SupervisorContact);
            }
            if (this.browserFeatures.webAPIs['Blob']) {
                $("#SubmitBox > .submitDownload").show();
            } else {
                $("#SubmitBox > .submitDownload").hide();
                $("#ResultsBox").show();
            }
        }
        this.SubmitTestResults();
        //}
        return;
    }
}

// ###################################################################
ListeningTest.prototype.prevTest = function () {

    this.pauseAllAudios();

    if (this.TestState.CurrentTest > 0) {
        // save ratings from last test
        if (this.saveRatings(this.TestState.TestSequence[this.TestState.CurrentTest]) == false)
            return;

        // stop time measurement
        var stopTime = new Date().getTime();
        this.TestState.Runtime[this.TestState.TestSequence[this.TestState.CurrentTest]] += stopTime - this.TestState.startTime;
        // go to previous test
        this.TestState.CurrentTest = this.TestState.CurrentTest - 1;
        this.runTest(this.TestState.TestSequence[this.TestState.CurrentTest]);
    }

    if (this.TestState.CurrentTest < 1) {
        $('#BtnPrevTest').hide();
    }
}

// ###################################################################
ListeningTest.prototype.startTests = function () {

    // init linear test sequence
    this.TestState.TestSequence = Array();
    for (var i = 0; i < this.TestConfig.Testsets.length; i++)
        this.TestState.TestSequence[i] = i;

    // shorten and/or shuffle the sequence
    if ((this.TestConfig.MaxTestsPerRun > 0) && (this.TestConfig.MaxTestsPerRun < this.TestConfig.Testsets.length)) {
        this.TestConfig.RandomizeTestOrder = true;
        this.TestState.TestSequence = shuffleArray(this.TestState.TestSequence);
        this.TestState.TestSequence = this.TestState.TestSequence.slice(0, this.TestConfig.MaxTestsPerRun);
    } else if (this.TestConfig.RandomizeTestOrder == true) {
        this.TestState.TestSequence = shuffleArray(this.TestState.TestSequence);
    }

    this.TestState.Ratings = Array(this.TestConfig.Testsets.length);
    this.TestState.resultset = [];
    this.TestState.Runtime = new Uint32Array(this.TestConfig.Testsets.length);
    //        this.TestState.Runtime.forEach(function(element, index, array){array[index] = 0});
    this.TestState.startTime = 0;

    // run first test
    this.TestState.CurrentTest = 0;
    this.runTest(this.TestState.TestSequence[this.TestState.CurrentTest]);
}

// ###################################################################    
// prepares display to run test with number TestIdx
ListeningTest.prototype.runTest = function (TestIdx) {

    this.pauseAllAudios();

    if ((TestIdx < 0) || (TestIdx > this.TestConfig.Testsets.length)) throw new RangeError("Test index out of range!");

    this.audioPool.clear();
    this.TestState.AudiosInLoadQueue = 0;
    this.TestState.AudioLoadError = false;

    this.createTestDOM(TestIdx);

    // set current test name
    $('#TestHeading').html(" Aufgabe " + (this.TestState.CurrentTest + 1) + " von " + this.TestState.TestSequence.length + "");// this.TestConfig.Testsets[TestIdx].Name + 
    $('#TestHeading').show();

    // hide everything instead of load animation
    $('#TestIntroduction').hide();
    $('#TestControls').hide();
    $('#TableContainer').hide();
    $('#PlayerControls').hide();
    $('#LoadOverlay').show();

    // set some state variables
    this.TestState.TestIsRunning = 1;

    var _this = this;
    $('.stopButton').each(function () {
        $(this).button();
        $(this).on('click', $.proxy(_this.pauseAllAudios, _this));
    });

    $('.playButton').each(function () {
        $(this).button();
        var audioID = $(this).attr('rel');
        $(this).on('click', $.proxy(function (event) { _this.playAudio(audioID) }, _this));
    });

    // load and apply already existing ratings
    if (typeof this.TestState.Ratings[TestIdx] !== 'undefined') this.readRatings(TestIdx);

    this.TestState.startTime = new Date().getTime();

}

// ###################################################################
// pause all audios
ListeningTest.prototype.pauseAllAudios = function () {
    this.audioPool.pause();
    $(".playButton").removeClass('playButton-active');
    $('.rateSlider').parent().css('background-color', 'transparent');
}

// ###################################################################
// read ratings from TestState object
ListeningTest.prototype.readRatings = function (TestIdx) {
    // overwrite and implement in inherited class
    alert('Function readRatings() has not been implemented in your inherited class!');
}

// ###################################################################
// save ratings to TestState object
ListeningTest.prototype.saveRatings = function (TestIdx) {
    // overwrite and implement in inherited class
    alert('Function saveRatings() has not been implemented in your inherited class!');
}

// ###################################################################
// evaluate test and format/print the results
ListeningTest.prototype.formatResults = function () {
    // overwrite and implement in inherited class
    alert('Function formatResults() has not been implemented in your inherited class!');
}

// ###################################################################
// create DOM for test display
ListeningTest.prototype.createTestDOM = function (TestIdx) {
    // overwrite and implement in inherited class
    alert('Function createTestDOM() has not been implemented in your inherited class!');
}

// ###################################################################
// is called whenever an <audio> tag fires the onDataLoaded event
ListeningTest.prototype.audioLoadedCallback = function () {
    this.TestState.AudiosInLoadQueue--;

    // show test if all files finished loading and no errors occured
    if ((this.TestState.AudiosInLoadQueue == 0) && (this.TestState.AudioLoadError == false)) {
        $('#TestControls').show();
        $('#TableContainer').show();
        $('#PlayerControls').show();
        $('#LoadOverlay').hide();
    }
}

// ###################################################################
// audio loading error callback
ListeningTest.prototype.audioErrorCallback = function (e) {

    this.TestState.AudioLoadError = true;

    var errorTxt = "<p>ERROR ";

    switch (e.target.error.code) {
        case e.target.error.MEDIA_ERR_NETWORK:
            errorTxt += "Network problem, ";
            break;
        case e.target.error.MEDIA_ERR_DECODE:
            errorTxt += "File corrupted or unsupported format, ";
            break;
        case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorTxt += "Wrong URL or unsupported file format, ";
            break;
        default:
            errorTxt += "Unknown error, ";
            break;
    }
    errorTxt += e.target.src + "</p>";

    $('#LoadOverlay').append(errorTxt);
}

// ###################################################################
// audio time update callback
ListeningTest.prototype.audioTimeCallback = function (e) {

    var s = parseInt(e.target.currentTime % 60);
    var m = parseInt((e.target.currentTime / 60) % 60);

    if (m < 10) m = "0" + m;
    if (s < 10) s = "0" + s;

    $('#duration > span').html(m + ':' + s);

    var progress = e.target.currentTime / e.target.duration * 100;

    $('#ProgressBar').progressbar("option", "value", progress);
}


// ###################################################################
// enable/disable looping for all audios
ListeningTest.prototype.toggleLooping = function () {
    this.audioPool.toggleLooped();
}

// ###################################################################
// enable/disable auto return for all audios
ListeningTest.prototype.toggleAutoReturn = function () {
    this.audioPool.toggleAutoReturn();
}

// ###################################################################
//play audio with specified html ID
ListeningTest.prototype.playAudio = function (id) {

    this.audioPool.pause();

    // reset all buttons and sliders
    $('.rateSlider').parent().css('background-color', 'transparent');
    $('.playButton').removeClass('playButton-active');

    // highlight active slider and button
    $(".rateSlider[rel=" + id + "]").parent().css('background-color', '#D5E5F6');
    $(".playButton[rel=" + id + "]").addClass('playButton-active');

    this.audioPool.play(id);
}

// ###################################################################
// add and load audio file with specified ID
ListeningTest.prototype.addAudio = function (TestIdx, fileID, relID) {
    this.TestState.AudiosInLoadQueue += 1;
    this.audioPool.addAudio(this.TestConfig.AudioRoot +
        this.TestConfig.Testsets[TestIdx].Files[fileID],
        relID)
}

// ###################################################################
// submit test results to server
ListeningTest.prototype.SubmitTestResults = function () {

    var UserObj = {};
    UserObj.UserName = $('#UserName').val();
    UserObj.UserEmail = $('#UserEMail').val();
    UserObj.UserComment = $('#UserComment').val();

    var userData = {};
    userData.age = document.getElementById('formage').value;
    userData.gender = document.getElementById('formgender').value;
    userData.user = Math.ceil(Math.random() * 10000000);

    $.ajax({
        type: "POST",
        timeout: 5000,
        url: '/submit-test',//testHandle.TestConfig.BeaqleServiceURL,
        //data: {data: JSON.stringify({data: this.TestState.resultset, user: userData})},
        data: { data: JSON.stringify({ data: this.TestState.resultset, user: userData }) },
        dataType: 'json'
    })
        .done(function (response) {
            $('#TestControls').hide();
        })
        .fail(function (xhr, ajaxOptions, thrownError) { });
    //$('#BtnSubmitData').button('option', { icons: { primary: 'load-indicator' } }).show();

}

// ###################################################################
// submit test results to server
ListeningTest.prototype.DownloadTestResults = function () {

    var UserObj = new Object();
    UserObj.UserName = $('#UserName').val();
    UserObj.UserEmail = $('#UserEMail').val();
    UserObj.UserComment = $('#UserComment').val();

    var EvalResults = this.TestState.EvalResults;
    EvalResults.push(UserObj)

    saveTextAsFile(JSON.stringify(EvalResults), getDateStamp() + "_" + UserObj.UserName + ".txt");

    this.TestState.TestIsRunning = 0;
}

// ###################################################################
// Check browser capabilities
ListeningTest.prototype.checkBrowserFeatures = function () {

    var features = new Object();

    features.webAPIs = new Array();
    features.webAPIs['webAudio'] = this.audioPool.waContext !== false;
    features.webAPIs['Blob'] = !!window.Blob;

    features.audioFormats = new Array();
    var a = document.createElement('audio');
    features.audioFormats['WAV'] = !!(a.canPlayType && a.canPlayType('audio/wav; codecs="1"').replace(/no/, ''));
    features.audioFormats['FLAC'] = !!(a.canPlayType && a.canPlayType('audio/flac').replace(/no/, ''));
    features.audioFormats['OGG'] = !!(a.canPlayType && a.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/, ''));
    features.audioFormats['MP3'] = !!(a.canPlayType && a.canPlayType('audio/mpeg;').replace(/no/, ''));
    features.audioFormats['AAC'] = !!(a.canPlayType && a.canPlayType('audio/mp4; codecs="mp4a.40.2"').replace(/no/, ''));

    this.browserFeatures = features;
}

// ###################################################################
// Get browser features formatted as a HTML string
ListeningTest.prototype.browserFeatureString = function () {
    var featStr = "Available HTML5 browser features:";
    if (this.browserFeatures.webAPIs['webAudio'])
        featStr += " <span class='feature-available'>WebAudioAPI</span>, ";
    else
        featStr += " <span class='feature-not-available'>WebAudioAPI</span>, ";

    if (this.browserFeatures.webAPIs['Blob'])
        featStr += " <span class='feature-available'>BlobAPI</span>, ";
    else
        featStr += " <span class='feature-not-available'>BlobAPI</span>, ";

    if (this.browserFeatures.audioFormats['WAV'])
        featStr += " <span class='feature-available'>WAV</span>, ";
    else
        featStr += " <span class='feature-not-available'>WAV</span>, ";

    if (this.browserFeatures.audioFormats['FLAC'])
        featStr += " <span class='feature-available'>FLAC</span>, ";
    else
        featStr += " <span class='feature-not-available'>FLAC</span>, ";

    if (this.browserFeatures.audioFormats['OGG'])
        featStr += " <span class='feature-available'>Vorbis</span>, ";
    else
        featStr += " <span class='feature-not-available'>Vorbis</span>, ";

    if (this.browserFeatures.audioFormats['MP3'])
        featStr += " <span class='feature-available'>MP3</span>, ";
    else
        featStr += " <span class='feature-not-available'>MP3</span>, ";

    if (this.browserFeatures.audioFormats['AAC'])
        featStr += " <span class='feature-available'>AAC</span>";
    else
        featStr += " <span class='feature-not-available'>AAC</span>";

    return featStr;
}
