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

var distance = function(a, b) {

}

var distance = function(a, b) {
    var radlat1 = Math.PI * a.x / 180;
    var radlat2 = Math.PI * b.x / 180;
    var radlon1 = Math.PI * a.y / 180;
    var radlon2 = Math.PI * b.y / 180;
    var theta = a.y - b.y;

    var radtheta = Math.PI * theta / 180;
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist);
    dist = dist * 180 / Math.PI;
    dist = dist * 60 * 1.1515;

    dist = dist * 1.609344 // convert to KM
    return dist
}

module.exports = function(cb) {
  if (locTree != undefined) {
    cb(locTree);
  } else {
    console.log('Building tree');
    new lazy(fs.createReadStream(path.join(__dirname, '../', 'public/files/cities15000.txt')))
      .lines
      .forEach(function(line) {
        city = line.toString().split("\t");

        if (city[8] == 'CA' || city[8] == 'US') {
          point = {
            'x': parseFloat(city[4]),
            'y': parseFloat(city[5]),
            'city': city[1] + ', ' + lazyCountryShortcodeToFull[city[8]],
          };

          points.push(point);
        } 
      }
    ).on('pipe', function() {
      locTree = new kdTree.kdTree(points, distance, ['x', 'y']);
      cb(locTree);
    });
  } 
}