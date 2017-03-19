// rsync -v -a  --exclude "node_modules" --exclude "pool" /Users/guyjacubovski/dev/mini-breakpad-server dev@192.168.131.185:/opt/kaltura

const path = require('path');

const express = require('express');

const reader = require('./reader');

const saver = require('./saver');

const Database = require('./database');

const WebHook = require('./webhook');

const compression = require('compression')

const symbols  = require('./symbols')


let app = express();
let webhook = new WebHook;
let db = new Database;


function isAllowed(req) {
    var ipAddress = req.connection.remoteAddress;

    if (ipAddress === "::1")
        return true;

    if (ipAddress.indexOf("192.168") >= 0) {
        return true;
    }
    return true;

}

app.use(function (req, res, next) {
    if (!isAllowed(req)) {
        res.status(403).send('forbidden');
        return;
    }
    next();
})

app.use(compression())
app.disable('x-powered-by');


db.on('load', function () {
    var port, _ref;
    port = (_ref = process.env.MINI_BREAKPAD_SERVER_PORT) != null ? _ref : 80;
    app.listen(port);
    return console.log("Listening on port ", port, ' currnet directory', process.cwd());
});

app.set('views', path.resolve(__dirname, '..', 'views'));

app.set('view engine', 'jade');


app.use(function (err, req, res, next) {
    return res.send(500, "Bad things happened:<br/> " + err.message);
});

app.post('/webhook', function (req, res, next) {
    webhook.onRequest(req);
    console.log('webhook requested', req.body.repository.full_name);
    return res.end();
});

app.post('/post', function (req, res, next) {
    return saver.saveRequest(req, db, function (err, filename) {
        if (err != null) {
            return next(err);
        }
        console.log('saved', filename);
        res.send(path.basename(filename));
        return res.end();
    });
});
app.post('/symbol', function (req, res, next) {
    return symbols.saveSymbols(req, function (err, record) {
        return res.end();
    });
});

let root = process.env.MINI_BREAKPAD_SERVER_ROOT != null ? "" + process.env.MINI_BREAKPAD_SERVER_ROOT + "/" : '';

app.get("/" + root, function (req, res, next) {
    return res.render('index', {
        title: 'Crash Reports',
        records: db.getAllRecords()
    });
});
app.get("/download/:id", function (req, res, next) {
    return db.restoreRecord(req.params.id, function (err, record) {
        if (err != null) {
            return next(err);
        }
        res.sendFile(path.join(__dirname, "../", record.path));
    });
});
app.get("/delete/:id", function (req, res, next) {
    return db.deleteRecord(req.params.id, function (err, record) {
        if (err != null) {
            return next(err);
        }
        res.end("dump " + req.params.id + " deleted!");
    });
});
app.get("/" + root + "view/:id", function (req, res, next) {
    return db.restoreRecord(req.params.id, function (err, record) {
        if (err != null) {
            return next(err);
        }
        return reader.getStackTraceFromRecord(record, function (err, report) {
            var fields;
            if (err != null) {
                return next(err);
            }
            return res.render('view', {
                title: 'Crash Report',
                report: report,
                record: record
            });
        });
    });
});


