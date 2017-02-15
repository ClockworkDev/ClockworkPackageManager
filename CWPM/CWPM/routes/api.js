var express = require('express');
var router = express.Router();

/* GET all the packages. */
router.get('/packages', function (req, res) {
    res.send('Hey those are all the packages');
});

/* GET all the versions for a package */
router.get('/packages/:id', function (req, res) {
    res.send('Hey those are all versions for package '+req.params.id);
});

/* GET the source for a package id + version */
router.get('/packages/:id/:version', function (req, res) {
    res.send('Hey this is package ' + req.params.id+' version '+req.params.version);
});

module.exports = router;