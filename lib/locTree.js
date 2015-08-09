var kdTree = require('./kdTree');
var path = require('path');
var fs = require('fs');
var lazy = require('lazy');

locTree = undefined;

lazyCountryShortcodeToFull = {
  'CA': 'Canada',
  'US': 'United States',
}

var points = [];

var distance = function(a, b){
  return Math.pow(a.x - b.x, 2) +  Math.pow(a.y - b.y, 2);
}

module.exports = function(cb) {
  if (locTree != undefined) {
    cb(locTree);
  } else {
    new lazy(fs.createReadStream(path.join(__dirname, '../', 'public/files/cities15000.txt')))
      .lines
      .forEach(function(line) {
        city = line.toString().split("\t");

        if (city[8] == 'CA') {
          point = {
            'x': parseFloat(city[4]),
            'y': parseFloat(city[5]),
            'city': city[1] + ', ' + lazyCountryShortcodeToFull[city[8]],
          };

          //console.log('Pushing...' + JSON.stringify(point));
          points.push(point);
        } 
      }
    ).on('pipe', function() {
      locTree = new kdTree.kdTree(points, distance, ['x', 'y']);
      cb(locTree);
    });
  } 
}