/**
 * AB test
 *  */ 

// inherit from ListeningTest
function ABTest(TestData) {
    ListeningTest.apply(this, arguments);
}
ABTest.prototype = new ListeningTest();
ABTest.prototype.constructor = ABTest;


// implement specific code
ABTest.prototype.createTestDOM = function (TestIdx) {

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
        this.TestState.FileMappings[TestIdx] = { "X": "" };
        var RandFileNumber = Math.random();
        if (RandFileNumber > 0.5) {
            this.TestState.FileMappings[TestIdx].X = "A";
        } else {
            this.TestState.FileMappings[TestIdx].X = "B";
        }
    }

    // add reference
    fileID = "A";
    row = tab.insertRow(-1);
    cell[0] = row.insertCell(-1);
    cell[0].innerHTML = '<button id="play' + fileID + 'Btn" class="playButton btn btn-primary" rel="' + fileID + '">A</button>';
    this.addAudio(TestIdx, fileID, fileID);

    fileID = this.TestState.FileMappings[TestIdx].X;
    var relID = "X";
    //cell[1] = row.insertCell(-1);
    //cell[1].innerHTML =  '<button id="play'+relID+'Btn" class="playButton" rel="'+relID+'">X</button>';
    //this.addAudio(TestIdx, fileID, relID);

    fileID = "B";
    cell[2] = row.insertCell(-1);
    cell[2].innerHTML = '<button id="play' + fileID + 'Btn" class="playButton btn btn-primary" rel="' + fileID + '">B</button>';
    this.addAudio(TestIdx, fileID, fileID);

    cell[3] = row.insertCell(-1);
    cell[3].innerHTML = "<button class='stopButton btn btn-light'>Stop</button>";

    cell[4] = row.insertCell(-1);
    cell[4].innerHTML = this.TestConfig.instruction;

    row[1] = tab.insertRow(-1);
    cell[0] = row[1].insertCell(-1);
    cell[0].innerHTML = "<input type='radio' name='ItemSelection' id='selectA'/>";
    //        cell[1] = row[1].insertCell(-1);
    cell[2] = row[1].insertCell(-1);
    cell[2].innerHTML = "<input type='radio' name='ItemSelection' id='selectB'/>";
    cell[3] = row[1].insertCell(-1);
    cell[4] = row[1].insertCell(-1);
    cell[4].innerHTML = this.TestConfig.question;

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


ABTest.prototype.readRatings = function (TestIdx) {

    if (this.TestState.Ratings[TestIdx] === "A") {
        $("#selectA").prop("checked", true);
    } else if (this.TestState.Ratings[TestIdx] === "B") {
        $("#selectB").prop("checked", true);
    }

}

ABTest.prototype.saveRatings = function (TestIdx) {
    if ($("#selectA").prop("checked")) {
        this.TestState.Ratings[TestIdx] = "A";
        this.TestState.resultset[TestIdx] = { option: "A", question: TestIdx, file: this.TestConfig.Testsets[TestIdx].Files.A, file_alternative: this.TestConfig.Testsets[TestIdx].Files.B, date: Date.now() };
    } else if ($("#selectB").prop("checked")) {
        this.TestState.Ratings[TestIdx] = "B";
        this.TestState.resultset[TestIdx] = { option: "B", question: TestIdx, file: this.TestConfig.Testsets[TestIdx].Files.B, file_alternative: this.TestConfig.Testsets[TestIdx].Files.A, date: Date.now() };
    }
    console.log(TestIdx, this.TestState.Ratings[TestIdx]);
}

ABTest.prototype.formatResults = function () {

    var resultstring = "";
    var tab = document.createElement('table');
    var row;
    var cell;

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


            if (this.TestState.Ratings[i] === this.TestState.FileMappings[i].X) {
                this.TestState.EvalResults[i] = true;
                cell.innerHTML = "correct";
                numCorrect += 1;
            } else {
                this.TestState.EvalResults[i] = false;
                cell.innerHTML = "wrong";
                numWrong += 1;
            }
        }
    }

    resultstring += tab.outerHTML;

    resultstring += "<br/><p>Percentage of correct assignments: " + (numCorrect / this.TestConfig.Testsets.length * 100).toFixed(2) + " %</p>";
    return resultstring;
}

