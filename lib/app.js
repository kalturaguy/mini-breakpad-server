// rsync -v -a  --exclude "node_modules" --exclude ".git" --exclude "pool" /Users/guyjacubovski/dev/mini-breakpad-server dev@192.168.131.185:/opt/kaltura

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

    if (req.url==="/post") {
        return true;
    }

    if (ipAddress.indexOf("192.168") >= 0) {
        return true;
    }

    if (ipAddress.indexOf("62.0.105.133") >= 0) {
        return true;
    }

    console.warn("Rejected request for ",req.url, " from ",ipAddress)

    return false;

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
    let port=process.env.MINI_BREAKPAD_SERVER_PORT || 80;
    app.listen(port);
    console.log("Listening on port ", port, ' current directory', process.cwd());
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


app.get("/", function (req, res, next) {
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
app.get("/view/:id", function (req, res, next) {
    return db.restoreRecord(req.params.id, function (err, record) {
        if (err != null) {
            return next(err);
        }
        return reader.getStackTraceFromRecord(record, function (err, report) {
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


