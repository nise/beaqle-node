/*
 * @author: niels.seidel@fernuni-hagen.de
 * @titel: 
 * @description: 
 **/

var
    express = require('express'),
    expressValidator = require('express-validator'),
    expressMinify = require('express-minify-html'),
    app = express(),
    compression = require('compression'),
    path = require('path'),
    flash = require('connect-flash'),
    server = require('http').createServer(app)
    ;

let settings = {
    caching: true,
    application: 'beaqle-node',
    port: 3000
};


/* configure application **/
app.set('port', process.env.PORT || settings.port);
app.use(compression())
app.use(expressMinify({
    override: true,
    exception_url: false, //['/path/that/should/not/be/minified']
    htmlMinifier: {
        removeComments: true,
        collapseWhitespace: true,
        collapseBooleanAttributes: true,
        removeAttributeQuotes: true,
        removeEmptyAttributes: true,
        minifyJS: true
    }
}));
app.use(express.static(path.join(__dirname, 'public/')));
app.set('views', __dirname + '/public/');
app.set('view engine', 'ejs');
app.engine('ejs', require('ejs-locals'));

var cookieParser = require('cookie-parser');
app.use(cookieParser());
var json = require('express-json');
app.use(json());
var bodyParser = require('body-parser');
app.use(expressValidator());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
var methodOverride = require('method-override');
app.use(methodOverride());
var session = require('express-session');
app.use(session({
    secret: 'keyb22oar4d cat',
    saveUninitialized: true,
    resave: true
}));
app.use(flash());
//app.use(users.passport.initialize());
//app.use(users.passport.session());
app.set("jsonp callback", true); // ?????



server.listen(settings.port);
//server.setMaxListeners(0);
console.log(process.env.NODE_ENV);
console.log('\n\n***************************************************************');
console.log('Started server for application »' + settings.application + '« on port ' + settings.port);
console.log('***************************************************************\n\n');

var fs = require('fs');

app.post('/submit-test', function (req, res) {
    saveLog(req.body.data);
    console.log('test message ', req.body.data);
    res.redirect('/thanx');
});

app.get('/thanx', function (req, res) {
    res.send('Recht herzlichen Dank für die Teilnahme an dieser Studie!');
});

var saveLog = function (data) {
    var out = '';//'date,question,option,file,alternative\n';
    var data = JSON.parse(data);
    for (var i = 0; i < data.length; i++) {
        out += data[i].date + ',' + data[i].question + ',' + data[i].option + ',' + data[i].file + ',' + data[i].file_alternative + '\n';
    }
    fs.appendFile('./results/results.csv', out);
};



