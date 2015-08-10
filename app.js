var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var yelp = require("yelp").createClient({
  consumer_key: "B6bWEcfpjbithTKt2uuGvg", 
  consumer_secret: "fxEsn1IZ2-G2E4q-OrXp6B0jCew",
  token: "EEAB9_3JVCCrMAnAHexPqPoCCRpEQ7Li",
  token_secret: "g0F3MtRIHoV8bFSXyyfO4OyBCfg"
});

var locTree = require('./lib/locTree');
locTree(function(locTree) {
  console.log('Testing...')
  console.log(locTree.nearest({ x: 43.822014, y: -79.109414 }, 1, 10));
})

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json({limit: '500mb'}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res, next) {
  res.render('index');
});

app.post('/nearby-cities', function(req, res) {
  locTree(function (locTree) {
    unique_cities = {}
    req.body.paths.forEach(function(path) {
      results = locTree.nearest({ x: path.x, y: path.y }, 1, 10);
      if (results.length > 0) {
        city = results[0][0].city;

        if (!(city in unique_cities))
          unique_cities[city] = city;
      }
    });

    Object.keys(unique_cities).forEach(function(city) {
      console.log(city);
      /*yelp.search({
        category_filter: 'food,restaurants',
        location: city, 
        limit: 3, 
        sort: 2, // sort mode: 2=Highest Rated
      }, function(error, data) {
        if (error) {
          console.log(error);
        }
        else {
          if (data['businesses'] && data['businesses'].length > 0) {
            // we only need some of the properties of a Yelp business result
            results = data['businesses'].map(function(business) {
              return {
                image_url: business.image_url,
                name: business.name,
                url: business.url,
                rating_img_url: business.rating_img_url,
                location: business.location.display_address.join(', '),
              }
            });
            console.log(results);
          }
        }
      });*/
    });
    
    res.contentType('json');
    res.status(200);
    res.send('Success!');  
    
  });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
