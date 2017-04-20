var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt-nodejs');
var geardoc = require('geardoc');

var Connection = require('tedious').Connection;
var config = {
    userName: 'user',
    password: process.env.SQLpassword,
    server: 'f40cam8e8a.database.windows.net',
    // If you are on Microsoft Azure, you need this:  
    options: { encrypt: true, database: 'cwpm', rowCollectionOnRequestCompletion: true }
};
var connection = new Connection(config);
connection.on('connect', function (err) {
    // If no error, then good to proceed.  
    console.log("Connected");
});

var Request = require('tedious').Request;
var TYPES = require('tedious').TYPES;

//// /PACKAGES endpoints

/* GET all the packages. */
router.get('/packages', function (req, res) {
    request = new Request("SELECT Id, Author FROM dbo.Packages AS p;", function (err, rowCount, rows) {
        if (err) {
            console.log(err);
            res.send(JSON.stringify([]));
        } else {
            res.send(JSON.stringify(rows.map(function (columns) {
                return { id: columns[0].value, by: columns[1].value };
            })));
        }
    });
    connection.execSql(request);
});

/* GET all the versions for a package */
router.get('/packages/:id', function (req, res) {
    request = new Request("SELECT Version, Date FROM dbo.Packages WHERE Id=@Id;", function (err, rowCount, rows) {
        if (err) {
            console.log(err);
            res.send(JSON.stringify([]));
        } else {
            res.send(JSON.stringify(rows.map(function (columns) {
                return { version: columns[0].value, date: columns[1].value };
            })));
        }
    });
    request.addParameter('Id', TYPES.NVarChar, req.params.id);
    connection.execSql(request);
});

/* GET the source for a package id + version */
router.get('/packages/:id/:version', function (req, res) {
    request = new Request("SELECT Source FROM dbo.Packages WHERE Id=@Id AND Version=@Version;", function (err, rowCount, rows) {
        if (err || rowCount != 1) {
            console.log(err);
            res.send("");
        } else {
            res.
            res.send(geardoc.generateDoc(rows[0][0].value));
        }
    });
    request.addParameter('Id', TYPES.NVarChar, req.params.id);
    request.addParameter('Version', TYPES.NVarChar, req.params.version);
    connection.execSql(request);
});

//POST for publishing a package
router.post('/packages/:id/:version', function (req, res) {
    request = new Request("SELECT DISTINCT Author FROM dbo.Packages WHERE Id=@Id;", function (err, rowCount, rows) {
        if (rows.length == 0 || rows[0][0].value == req.body.username) {
            //Only allow to publish new packages or update packages published by that users
            checkPassword(req.body.username, req.body.password, function (auth) {
                if (auth) {
                    request = new Request("INSERT INTO dbo.Packages VALUES (@Id, @Version, @Date, @Author, @Source);", function (err, rowCount, rows) {
                        if (err) {
                            res.send(JSON.stringify({ res: "ERROR", err: err }));
                        } else {
                            res.send(JSON.stringify({ res: "OK" }));
                        }
                    });
                    request.addParameter('Id', TYPES.NVarChar, req.params.id);
                    request.addParameter('Version', TYPES.NVarChar, req.params.version);
                    request.addParameter('Date', TYPES.DateTime, new Date());
                    request.addParameter('Author', TYPES.NVarChar, req.body.username);
                    request.addParameter('Source', TYPES.NVarChar, req.body.source);
                    connection.execSql(request);
                } else {
                    res.send(JSON.stringify({ res: "ERROR", err: "The username or password is invalid" }));
                }
            });
        } else {
            res.send(JSON.stringify({ res: "ERROR", err: "Only the original author is allowed to update the package" }));
        }
    });
    request.addParameter('Id', TYPES.NVarChar, req.params.id);
    connection.execSql(request);
});

function checkPassword(user, password, callback) {
    request = new Request("SELECT Password FROM dbo.Developers WHERE Name=@Name;", function (err, rowCount, rows) {
        if (rows.length == 0) {
            callback(false);
        } else {
            bcrypt.compare(password, rows[0][0].value, function (err, res) {
                callback(res);
            });
        }
    });
    request.addParameter('Name', TYPES.NVarChar, user);
    connection.execSql(request);
}

/// /doc endpoints

/* GET the source for a package id + version */
router.get('/doc/:id/:version', function (req, res) {
    request = new Request("SELECT Source FROM dbo.Packages WHERE Id=@Id AND Version=@Version;", function (err, rowCount, rows) {
        if (err || rowCount != 1) {
            console.log(err);
            res.send("");
        } else {
            res.type('html'); 
            res.send(rows[0][0].value);
        }
    });
    request.addParameter('Id', TYPES.NVarChar, req.params.id);
    request.addParameter('Version', TYPES.NVarChar, req.params.version);
    connection.execSql(request);
});

//// /developers endpoints

/* GET all the developers. */
router.get('/developers', function (req, res) {
    request = new Request("SELECT Name FROM dbo.Developers;", function (err, rowCount, rows) {
        if (err) {
            console.log(err);
            res.send(JSON.stringify([]));
        } else {
            res.send(JSON.stringify(rows.map(function (columns) {
                return columns[0].value;
            })));
        }
    });
    connection.execSql(request);
});

//POST for registering a developer
router.post('/developers', function (req, res) {
    request = new Request("INSERT INTO dbo.Developers VALUES (@Name, @Password, @Email);", function (err, rowCount, rows) {
        if (err) {
            res.send(JSON.stringify({ res: "ERROR", err: err }));
        } else {
            res.send(JSON.stringify({ res: "OK" }));
        }
    });
    request.addParameter('Name', TYPES.NVarChar, req.body.name);
    request.addParameter('Email', TYPES.NVarChar, req.body.email);
    bcrypt.hash(req.body.password, bcrypt.genSaltSync(), null, function (err, hash) { //Hash async to avoid blocking the CPU
        request.addParameter('Password', TYPES.NVarChar, hash);
        connection.execSql(request);
    });
});


module.exports = router;