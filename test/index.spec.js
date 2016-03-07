
var assert = require('assert');
var path = require('path');
var fs = require('fs');

var async = require('async');

var analyzer = require('../');

var read = function(file) { return fs.readFileSync(file, 'utf-8') };

var files = [
  path.join(__dirname, 'fixtures', 'a.js'),
  path.join(__dirname, 'fixtures', 'b.js'),
  path.join(__dirname, 'fixtures', 'c.js'),
];

files = files.map(function(file) {return {file: file, src: read(file)}});

// TODO use js-schema to assert on the output

describe('analyzer-complexity', function(){
  describe('single file analysis', function(){
    var instance;
    beforeEach(function(){
      instance = analyzer();
    });

    it('should report the required fields', function(done){
      instance.run(files[2].file, files[2].src, function(err, report) {
        if (err) return done(err);
        assert(report.total.lloc > 0);
        assert(report.average.lloc > 0);
        done();
      });
    });
  });
  describe('aggregation', function(){
    var instance, reports;
    
    beforeEach(function(done){
      instance = analyzer();
      async.parallel(files.map(function(file){return function(cb){
        instance.run(file.file, file.src, function(err, result) {
          if (err) return cb(err);
          cb(null, {file: file.file, report: result});
        });
      }}), function(err, results) {
        if (err) return done(err);
        reports = results;
        done();
      });
    });
    
    it('should report totals for every file', function(done) {
      instance.aggregate(reports, function(err, report) {
        if (err) return done(err);
        assert.equal(report.each.length, 3);
        assert.equal(report.each[0].total.lloc, 2);
        done();
      });
    });

    it('should report averages and minmax', function(done){
      instance.aggregate(reports, function(err, report) {
        if (err) return done(err);
        // TODO assert [ave/min/max].average
        assert.equal(report.average.numFunctions, 2);
        assert.equal(report.average.total.lloc, 4);
        assert.equal(report.average.total.cyclomatic, 3);
        assert.equal(report.max.numFunctions.value, 3);
        assert.equal(report.max.total.lloc.value, 6);
        assert.equal(report.max.total.cyclomatic.value, 4);
        assert.equal(report.min.numFunctions.value, 1);
        assert.equal(report.min.total.lloc.value, 2);
        assert.equal(report.min.total.cyclomatic.value, 2);

        function simpleTypeExists(prop, type) {
          return function (property) {
            assert.equal(typeof report[type][prop][property], 'number', 'typeof ' + type + '.' + property);
            assert(report[type][prop][property] > 0,  'gt 0 ? ' + type + '.' + property)
          }
        }
        function complexTypeExists(prop, type) {
          return function (property) {
            assert(report[type][prop][property].file.length > 0, 'file is populated ' + type + '.' + property);
            assert.equal(typeof report[type][prop][property].value, 'number', 'typeof ' + type + '.' + property);
            assert(report[type][prop][property].value > 0,  'gt 0 ? ' + type + '.' + property)
          }
        }
        analyzer.properties.forEach(simpleTypeExists('total', 'average'));
        analyzer.properties.forEach(complexTypeExists('total', 'min'));
        analyzer.properties.forEach(complexTypeExists('total', 'max'));
        analyzer.properties.forEach(simpleTypeExists('average', 'average'));
        analyzer.properties.forEach(complexTypeExists('average', 'min'));
        analyzer.properties.forEach(complexTypeExists('average', 'max'));
        done();
      });
    });
  });

});