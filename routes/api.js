var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt-nodejs');
var geardoc = require('@clockwork/geardoc');

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
            res.send(rows[0][0].value);
        }
    });
    request.addParameter('Id', TYPES.NVarChar, req.params.id);
    request.addParameter('Version', TYPES.NVarChar, req.params.version);
    connection.execSql(request);
});

/// /doc endpoints

/* GET the source for a package id + version */
router.get('/doc/:id/:version', function (req, res) {
    request = new Request("SELECT Source FROM dbo.Packages WHERE Id=@Id AND Version=@Version;", function (err, rowCount, rows) {
        if (err || rowCount != 1) {
            console.log(err);
            res.send("");
        } else {
            res.type('html');
            res.send(geardoc.generateDoc(rows[0][0].value));
        }
    });
    request.addParameter('Id', TYPES.NVarChar, req.params.id);
    request.addParameter('Version', TYPES.NVarChar, req.params.version);
    connection.execSql(request);
});

module.exports = router;