
var parser = require('shift-parser');
var complexity = require('shift-complexity').default;

function pluck(keys) {
  return function(obj) {
    var rv = {};
    keys.forEach(function(key) {
      rv[key] = obj[key];
    });
    return rv;
  }
}

var fns = {
  average: function average(reports, fn) {
    return reports.reduce(function(p,n){return p + fn(n)},0) / reports.length;
  },
  max: function min(reports, fn) {
    return reports.reduce(function(p,n){return p.value > fn(n) ? p : {file: n.file, value: fn(n)}},-Infinity);
  },
  min: function min(reports, fn) {
    return reports.reduce(function(p,n){return p.value < fn(n) ? p : {file: n.file, value: fn(n)}},Infinity);
  },
};

function fromObject(property, fn) {
  return function(n) { return fn(n)[property] }
}

function generateSummary(objFn) {
  return function (fn, reports, properties) {
    return properties.reduce(function(p, n) {
      return p[n] = fn(reports, fromObject(n, objFn)), p;
    },{});
  }
}

var properties = [
  'lloc',
  'cyclomatic',
  'vocabulary',
  'length',
  'maintainability',
  'time',
  'bugs',
  'volume',
  'difficulty',
  'effort',
];

module.exports = function(config) {
  return {
    aggregate: function(reports, done) {
      var results = ['average', 'max', 'min'].reduce(function(p,n){
        p[n] = generateSummary(function(obj){ return obj.report.total; })(fns[n], reports, properties);
        p[n].functions = fns[n](reports, function(n) {return n.report.functions.length});
        return p;
      },{});
      results.each = reports.map(function(report) {
        return {
          file: report.file,
          total: pluck(properties)(report.report.total)
        };
      });
      done(null, results);
    },
    run: function(filename, src, done) {
      var results = complexity.analyze(parser.parseModule(src));
      var keys = properties;
      results.functions = results.functions.map(pluck(keys));
      results = pluck(['root', 'average', 'total', 'functions'])(results);
      done(null, results);
    }
  }
};

module.exports.properties = properties; 