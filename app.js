var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var Q = require('q');
var cache = require('memory-cache');
var sleep = require('sleep');
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
  categoryToYelpFilter = {
    restaurant: 'food,restaurants',
    beer: 'nightlife',
    active: 'active',
    entertainment: 'arts',
  }
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

    queries = [];
    categoriesSelected = req.body.categories;
    Object.keys(unique_cities).forEach(function(city) {
      Object.keys(categoriesSelected).forEach(function(category) {
        if (categoriesSelected[category] == 1) {
          queries.push(Q.Promise(function(resolve, reject, notify) {
            cityData = getFromCache(city)
            if (cityData) {
              console.log('Accessing cache');
              resolve(cityData);
            } else {
              yelp.search({
                category_filter: categoryToYelpFilter[category],
                location: city, 
                limit: 3, 
                sort: 2, // sort mode: 2=Highest Rated
              }, function(error, data) {
                if (error) {
                  reject(new Error(error));
                }
                else {
                  if (data['businesses'] && data['businesses'].length > 0) {
                    results = data['businesses'].map(function(business) {
                      return {
                        img_url: business.image_url,
                        name: business.name,
                        url: business.url,
                        rating_img_url: business.rating_img_url,
                        review_count: business.review_count,
                        address: [business.location.address[0], business.location.city, 
                          business.location.state_code, business.location.country_code].join(', '),
                        brief_descrip: business.snippet_text,
                        type: category,
                        city: city,
                      };
                    });

                    resolve(results);
                  }
                }
              });
            }
          }));
        }
      });
    });

    Q.all(queries)
    .then(function(data) {
      res.json({'results': data})
    }, function(err) {
      res.json({'errorDetails': err});
    });
  });
});

function getFromCache(city) {
  return cache.get(city);
}

app.post('/cache', function(req, res) {
  city = req.body.location.city;

  cityData = cache.get(city);
  if (!cityData) {
    cache.put(city, [req.body.location]);
  } else {
    cityData.push(req.body.location);
    cache.del(city);
    cache.put(city, cityData)
  }
  
  res.json('success!');
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
