
// ###################################################################
// MUSHRA test main object

// inherit from ListeningTest
function MushraTest(TestData) {
    ListeningTest.apply(this, arguments);
}
MushraTest.prototype = new ListeningTest();
MushraTest.prototype.constructor = MushraTest;


// implement specific code


// ###################################################################
// create random mapping to test files
MushraTest.prototype.createFileMapping = function (TestIdx) {
    var NumFiles = $.map(this.TestConfig.Testsets[TestIdx].Files, function (n, i) { return i; }).length;
    var fileMapping = new Array(NumFiles);

    $.each(this.TestConfig.Testsets[TestIdx].Files, function (index, value) {

        do {
            var RandFileNumber = Math.floor(Math.random() * (NumFiles));
            if (RandFileNumber > NumFiles - 1) RandFileNumber = NumFiles - 1;
        } while (typeof fileMapping[RandFileNumber] !== 'undefined');

        if (RandFileNumber < 0) alert(fileMapping);
        fileMapping[RandFileNumber] = index;
    });

    this.TestState.FileMappings[TestIdx] = fileMapping;
}

// ###################################################################
// read ratings from TestState object
MushraTest.prototype.readRatings = function (TestIdx) {

    if ((TestIdx in this.TestState.Ratings) == false) return false;

    var testObject = this;
    $(".rateSlider").each(function () {
        var pos = $(this).attr('id').lastIndexOf('slider');
        var fileNum = $(this).attr('id').substring(pos + 6, $(this).attr('id').length);

        $(this).slider('value', testObject.TestState.Ratings[TestIdx][fileNum]);
        $(this).slider('refresh');
    });

}

// ###################################################################
// save ratings to TestState object
MushraTest.prototype.saveRatings = function (TestIdx) {
    var ratings = new Object();
    $(".rateSlider").each(function () {
        var pos = $(this).attr('id').lastIndexOf('slider');
        var fileNum = $(this).attr('id').substring(pos + 6, $(this).attr('id').length);

        ratings[fileNum] = $(this).slider("option", "value");
    });

    var MaxRatingFound = false;
    for (var prop in ratings) {
        if (ratings[prop] === this.TestConfig.RateMaxValue) {
            MaxRatingFound = true;
        }
    }

    if ((MaxRatingFound == true) || (this.TestConfig.RequireMaxRating == false)) {
        this.TestState.Ratings[TestIdx] = ratings;
        return true;
    } else {
        $.alert("At least one of your ratings has to be " + this.TestConfig.RateMaxValue + " for valid results!", "Warning!")
        return false;
    }
}


MushraTest.prototype.createTestDOM = function (TestIdx) {

    // clear old test table
    if ($('#TableContainer > table')) {
        $('#TableContainer > table').remove();
    }

    // create random file mapping if not yet done
    if (!this.TestState.FileMappings[TestIdx]) {
        this.createFileMapping(TestIdx);
    }

    // create new test table
    var tab = document.createElement('table');
    tab.setAttribute('id', 'TestTable');

    var fileID = "";
    var row = new Array();
    var cell = new Array();

    // add reference
    fileID = "Reference";
    row = tab.insertRow(-1);
    cell[0] = row.insertCell(-1);
    cell[0].innerHTML = "<span class='testItem'>Reference</span>";
    cell[1] = row.insertCell(-1);
    cell[1].innerHTML = '<button id="play' + fileID + 'Btn" class="playButton btn btn-primary" rel="' + fileID + '">Play</button>';
    cell[2] = row.insertCell(-1);
    cell[2].innerHTML = "<button class='stopButton btn btn-light'>Stop</button>";
    cell[3] = row.insertCell(-1);
    cell[3].innerHTML = "<img id='ScaleImage' src='" + this.TestConfig.RateScalePng + "'/>";

    this.addAudio(TestIdx, fileID, fileID);

    // add spacing
    row = tab.insertRow(-1);
    row.setAttribute("height", "5");

    var rateMin = this.TestConfig.RateMinValue;
    var rateMax = this.TestConfig.RateMaxValue;

    // add test items
    for (var i = 0; i < this.TestState.FileMappings[TestIdx].length; i++) {

        var fileID = this.TestState.FileMappings[TestIdx][i];
        var relID = "";
        if (fileID === "Reference")
            relID = "HiddenRef";
        else
            relID = fileID;

        row[i] = tab.insertRow(-1);
        cell[0] = row[i].insertCell(-1);
        cell[0].innerHTML = "<span class='testItem'>Test Item " + (i + 1) + "</span>";
        cell[1] = row[i].insertCell(-1);
        cell[1].innerHTML = '<button id="play' + relID + 'Btn" class="playButton btn btn-primary" rel="' + relID + '">Play</button>';
        cell[2] = row[i].insertCell(-1);
        cell[2].innerHTML = "<button class='stopButton btn btn-light'>Stop</button>";
        cell[3] = row[i].insertCell(-1);
        var fileIDstr = "";
        if (this.TestConfig.ShowFileIDs) {
            fileIDstr = fileID;
        }
        cell[3].innerHTML = "<div class='rateSlider' id='slider" + fileID + "' rel='" + relID + "'>" + fileIDstr + "</div>";

        this.addAudio(TestIdx, fileID, relID);

    }

    // append the created table to the DOM
    $('#TableContainer').append(tab);

    var mushraConf = this.TestConfig;
    $('.rateSlider').each(function () {
        $(this).slider({
            value: mushraConf.RateDefaultValue,
            min: mushraConf.RateMinValue,
            max: mushraConf.RateMaxValue,
            animate: false,
            orientation: "horizontal"
        });
        $(this).css('background-image', 'url(' + mushraConf.RateScaleBgPng + ')');
    });

}

MushraTest.prototype.formatResults = function () {

    var resultstring = "";


    var numCorrect = 0;
    var numWrong = 0;

    // evaluate single tests
    for (var i = 0; i < this.TestConfig.Testsets.length; i++) {
        this.TestState.EvalResults[i] = new Object();
        this.TestState.EvalResults[i].TestID = this.TestConfig.Testsets[i].TestID;

        if (this.TestState.TestSequence.indexOf(i) >= 0) {
            this.TestState.EvalResults[i].Runtime = this.TestState.Runtime[i];
            this.TestState.EvalResults[i].rating = new Object();
            this.TestState.EvalResults[i].filename = new Object();

            resultstring += "<p><b>" + this.TestConfig.Testsets[i].Name + "</b> (" + this.TestConfig.Testsets[i].TestID + "), Runtime:" + this.TestState.Runtime[i] / 1000 + "sec </p>\n";

            var tab = document.createElement('table');
            var row;
            var cell;

            row = tab.insertRow(-1);
            cell = row.insertCell(-1);
            cell.innerHTML = "Filename";
            cell = row.insertCell(-1);
            cell.innerHTML = "Rating";

            var fileArr = this.TestConfig.Testsets[i].Files;
            var testResult = this.TestState.EvalResults[i];


            $.each(this.TestState.Ratings[i], function (fileID, rating) {
                row = tab.insertRow(-1);
                cell = row.insertCell(-1);
                cell.innerHTML = fileArr[fileID];
                cell = row.insertCell(-1);
                cell.innerHTML = rating;

                testResult.rating[fileID] = rating;
                testResult.filename[fileID] = fileArr[fileID];
            });

            resultstring += tab.outerHTML + "\n";
        }
    }

    return resultstring;
}


