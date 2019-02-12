

// ###################################################################
// Preference test main object (modelled after ABX-Test)

// inherit from ListeningTest
function PrefTest(TestData) {
    ListeningTest.apply(this, arguments);
}
PrefTest.prototype = new ListeningTest();
PrefTest.prototype.constructor = PrefTest;


// implement specific code
PrefTest.prototype.createTestDOM = function (TestIdx) {

    // clear old test table
    if ($('#TableContainer > table')) {
        $('#TableContainer > table').remove();
    }

    // create new test table
    var tab = document.createElement('table');
    tab.setAttribute('id', 'TestTable');

    var fileID = "";
    var row = new Array();
    var cell = new Array();


    // create random file mapping if not yet done
    if (!this.TestState.FileMappings[TestIdx]) {
        this.TestState.FileMappings[TestIdx] = { "A": "", "B": "" };
        var RandFileNumber = Math.random();
        if (this.TestConfig.RandomizeFileOrder && RandFileNumber > 0.5) {
            this.TestState.FileMappings[TestIdx].A = "B";
            this.TestState.FileMappings[TestIdx].B = "A";
        } else {
            this.TestState.FileMappings[TestIdx].A = "A";
            this.TestState.FileMappings[TestIdx].B = "B";
        }
    }

    // add reference
    fileID = this.TestState.FileMappings[TestIdx].A;
    row = tab.insertRow(-1);
    cell[0] = row.insertCell(-1);
    cell[0].innerHTML = '<button id="play' + fileID + 'Btn" class="playButton btn btn-primary" rel="' + fileID + '">A</button>';
    this.addAudio(TestIdx, fileID, fileID);

    fileID = this.TestState.FileMappings[TestIdx].B;
    cell[1] = row.insertCell(-1);
    cell[1].innerHTML = '<button id="play' + fileID + 'Btn" class="playButton btn btn-primary" rel="' + fileID + '">B</button>';
    this.addAudio(TestIdx, fileID, fileID);

    cell[2] = row.insertCell(-1);
    cell[2].innerHTML = "<button class='stopButton btn btn-light'>Stop</button>";

    cell[3] = row.insertCell(-1);
    cell[3].innerHTML = "Press buttons to start/stop playback.";

    row[1] = tab.insertRow(-1);
    cell[0] = row[1].insertCell(-1);
    cell[0].innerHTML = "<input type='radio' name='ItemSelection' id='selectA'/>";
    cell[1] = row[1].insertCell(-1);
    cell[1].innerHTML = "<input type='radio' name='ItemSelection' id='selectB'/>";
    cell[2] = row[1].insertCell(-1);
    cell[3] = row[1].insertCell(-1);
    cell[3].innerHTML = "Please select the item which you prefer!";

    // add spacing
    row = tab.insertRow(-1);
    row.setAttribute("height", "5");

    // append the created table to the DOM
    $('#TableContainer').append(tab);

    // randomly preselect one radio button
    if (typeof this.TestState.Ratings[TestIdx] == 'undefined') {
        /*if (Math.random() > 0.5) {
           $("#selectB").prop("checked", true);
        } else {
           $("#selectA").prop("checked", true);
        }*/
    }
}


PrefTest.prototype.readRatings = function (TestIdx) {

    if (this.TestState.Ratings[TestIdx] === "A") {
        $("#selectA").prop("checked", true);
    } else if (this.TestState.Ratings[TestIdx] === "B") {
        $("#selectB").prop("checked", true);
    }

}

PrefTest.prototype.saveRatings = function (TestIdx) {

    if ($("#selectA").prop("checked")) {
        this.TestState.Ratings[TestIdx] = "A";
        this.TestState.resultset[TestIdx] = { option: "A", question: TestIdx, file: this.TestConfig.Testsets[TestIdx].Files.A, file_alternative: this.TestConfig.Testsets[TestIdx].Files.B, date: new Date() };
    } else if ($("#selectB").prop("checked")) {
        this.TestState.Ratings[TestIdx] = "B";
        this.TestState.resultset[TestIdx] = { option: "B", question: TestIdx, file: this.TestConfig.Testsets[TestIdx].Files.B, file_alternative: this.TestConfig.Testsets[TestIdx].Files.A, date: new Date() };
    }


}

PrefTest.prototype.formatResults = function () {

    var resultstring = "";
    var tab = document.createElement('table');
    var head = tab.createTHead();
    var row = head.insertRow(-1);
    var cell = row.insertCell(-1); cell.innerHTML = "Test Name and ID";
    cell = row.insertCell(-1); cell.innerHTML = "presented order";
    cell = row.insertCell(-1); cell.innerHTML = "time in ms";
    cell = row.insertCell(-1); cell.innerHTML = "chosen preference";

    var numCorrect = 0;
    var numWrong = 0;

    // evaluate single tests
    for (var i = 0; i < this.TestConfig.Testsets.length; i++) {
        this.TestState.EvalResults[i] = new Object();
        this.TestState.EvalResults[i].TestID = this.TestConfig.Testsets[i].TestID;
        if (this.TestState.TestSequence.indexOf(i) >= 0) {
            row = tab.insertRow(-1);
            cell = row.insertCell(-1);
            cell.innerHTML = this.TestConfig.Testsets[i].Name + "(" + this.TestConfig.Testsets[i].TestID + ")";
            cell = row.insertCell(-1);
            this.TestState.EvalResults[i].PresentationOrder = "A=" + this.TestState.FileMappings[i].A + ", B=" + this.TestState.FileMappings[i].B;
            cell.innerHTML = this.TestState.EvalResults[i].PresentationOrder;
            cell = row.insertCell(-1);
            this.TestState.EvalResults[i].Runtime = this.TestState.Runtime[i];
            cell.innerHTML = this.TestState.EvalResults[i].Runtime;
            cell = row.insertCell(-1);
            this.TestState.EvalResults[i].Preference = this.TestState.Ratings[i];
            cell.innerHTML = this.TestState.EvalResults[i].Preference;
        }
    }
    resultstring += tab.outerHTML;
    return resultstring;
}
