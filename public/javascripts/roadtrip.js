// intro
if(typeof(Storage) !== "undefined") {
  shownIntro = localStorage.getItem("shownIntro");
  if (!shownIntro) {
    $('#intro').modal({show: true});
    localStorage.setItem("shownIntro", true);    
  }
}

var initialLoc;
var map;
var paths;
var directionsDisplay;
var directionsService = new google.maps.DirectionsService();
var geocoder = new google.maps.Geocoder();
var total;

var categories = {
  restaurant: 1,
  beer: 0,
  active: 0,
  entertainment: 0,
}

function getLoc(next) {
  var geoSuccess = function(position) {
    map.setCenter(new google.maps.LatLng(position.coords.latitude, position.coords.longitude));
  }

  // initial loc
  navigator.geolocation.getCurrentPosition(geoSuccess);
}

function initialize() {
  // autocomplete
  placesOptions = { types: ['(cities)'], /*componentRestrictions: {country: "us"}*/};
  var from_autocomplete = new google.maps.places.Autocomplete(
    document.getElementById('from'), 
    placesOptions
  );

  var to_autocomplete = new google.maps.places.Autocomplete(
    document.getElementById('to'), 
    placesOptions
  );

  // map
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 10,
    center: new google.maps.LatLng(39.8282, -98.5795),
  });

  // directions
  directionsDisplay = new google.maps.DirectionsRenderer();
  directionsDisplay.setMap(map);
  //directionsDisplay.setPanel(document.getElementById('directions'));

  // markers
  /*addMarkers(sampleData = [
    {
      name: 'Kintako Japanese Restaurant',
      img_url: 'http://s3-media3.fl.yelpcdn.com/bphoto/speq8dyeJzlc7KLXj0njqw/ms.jpg',
      rating_img_url: 'http://s3-media1.fl.yelpcdn.com/assets/2/www/img/f1def11e4e79/ico/stars/v1/stars_5.png',
      address: '214 Laird Drive, Suite 101, Toronto, ON M4G 3W4, Canada',
      coords: [43.711754, -79.364118],
      url: 'http://www.yelp.ca/biz/kintako-japanese-restaurant-toronto',
      brief_descrip: 'Dinner started with a free noodle soup was so good we had to ask for seconds (which they most generously provided)',
      type: 'restaurant',
    },
    {
      title: 'Sudbury',
      img_url: 'http://s3-media3.fl.yelpcdn.com/bphoto/speq8dyeJzlc7KLXj0njqw/ms.jpg',
      rating_img_url: 'http://s3-media1.fl.yelpcdn.com/assets/2/www/img/f1def11e4e79/ico/stars/v1/stars_5.png',
      address: '214 Laird Drive, Suite 101, Toronto, ON M4G 3W4, Canada',
      coords: [43.642211, -79.421912],
      url: 'http://www.yelp.ca/biz/kintako-japanese-restaurant-toronto',
      brief_descrip: 'Dinner started with a free noodle soup was so good we had to ask for seconds (which they most generously provided)',
      type: 'attraction',
    },
    {
      title: 'Kingston',
      img_url: 'http://s3-media3.fl.yelpcdn.com/bphoto/speq8dyeJzlc7KLXj0njqw/ms.jpg',
      rating_img_url: 'http://s3-media1.fl.yelpcdn.com/assets/2/www/img/f1def11e4e79/ico/stars/v1/stars_5.png',
      address: '214 Laird Drive, Suite 101, Toronto, ON M4G 3W4, Canada',
      coords: [43.689214, -79.268691],
      url: 'http://www.yelp.ca/biz/kintako-japanese-restaurant-toronto',
      brief_descrip: 'Dinner started with a free noodle soup was so good we had to ask for seconds (which they most generously provided)',
      type: 'restaurant',
    },
  ]);*/

  // geocoder
  geocoder = new google.maps.Geocoder();

  getLoc();
}

function calcRoute() {
  clearMarkers();

  var start = document.getElementById('from').value;
  var end = document.getElementById('to').value;

  var request = {
    origin: start,
    destination: end,
    travelMode: google.maps.TravelMode.DRIVING
  };
  directionsService.route(request, function(response, status) {
    if (status == google.maps.DirectionsStatus.OK) {
      directionsDisplay.setDirections(response);

      // we don't look at alternative routes, and, because we
      // avoid waypoints, we only have a single leg in the journey
      steps = response.routes[0].legs[0].steps;
      if (steps) {
        paths = [];
        for (var i = 0; i < steps.length; i++) {
          for (var j = 0; j < steps[i].path.length; j++) {
            //console.log(steps[i].path[j]);
            paths.push({
              x: steps[i].path[j].G,
              y: steps[i].path[j].K,
            });
          }
        }
        getNearbyPlaces(paths);
      }          
    }
  });
}

function getNearbyPlaces(paths) {
  $('.alert-default-progress').attr('style', 'width:0%');
  $('#loading-alert').fadeIn();
  $.ajax('/nearby-cities', {
    type: 'POST',
    data: JSON.stringify({paths: paths, categories: categories}),
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    success: function(data, status) {
      addMarkers(data["results"]);
    },
    error: function(jqXHR, status, error) {
      alert(status + ': ' + error);
    }
  });
}

markers = [];
function addMarkers(results) {
  total = 0;
  clearMarkers();

  for (var i = 0; i < results.length; i++) {
    for (var j = 0; j < results[i].length; j++) {
      total += 1;
      addFreshGeocode(results[i][j], total * 1100);
    }  
  }
}

function addFreshGeocode(location, delay) {
  window.setTimeout(function() {
    geocodeViaNominatim(location.address, function(coords) {
      location.coords = coords;
      if (validPoint(location.coords[0], location.coords[1])) {
        addMarker(location);
        //cacheLocation(location);
      }
      else {
        total -= 1;
        updateProgress();
      }
    });
  }, delay);
}

function geocodeViaNominatim(address, cb) {
  $.get('http://open.mapquestapi.com/nominatim/v1/search.php?' + $.param({
      q: address,
      format: 'json',
      addressdetails: 1,
    }), null, function(data, status) {
    if (data.length > 0) {
      cb([data[0].lat, data[0].lon]);
    }
    else {
      total -= 1;
      updateProgress();
    }
  });
}

function addMarker(location) {
  var infoWindow = new google.maps.InfoWindow({
    content:
      '<div class="container-fluid">' +
        '<h3>' + location.name + '</h3>' +
        '<div class="row">' +
          '<div class="col-sm-3">' +
            '<div class="thumbnail">' +
              '<img style="width:100%;" src="' + location.img_url + '">' +
            '</div>' +
          '</div>' +
          '<div class="col-sm-9">' +
            '<p><img src="' + location.rating_img_url + '"> (' + location.review_count + ' reviews)</p>' +
            '<p><strong>Address: </strong>' + location.address + '</p>' +
            '<p><strong>Description: </strong>' + location.brief_descrip + '</p>' +
          '</div>' +
        '</div>' +
        '<hr>' +
        '<div class="row">' +
          '<div class="col-sm-12">' +
            '<p>Learn more by visiting: <a href="' + location.url + '">' + location.url + '</a></p>' +
          '</div>' +
        '</div>' +
      '</div>'
  });
  var marker = new google.maps.Marker({
    position: new google.maps.LatLng(location.coords[0], location.coords[1]),
    map: map,
    title: location.title,
    animation: google.maps.Animation.DROP,
    icon: '/images/pins/' + location.type + '_marker.png',
  });

  google.maps.event.addListener(marker, 'click', function() {
    //if (infoWindow) infoWindow.close();
    infoWindow.open(map, marker);
  });

  markers.push(marker);
  updateProgress();
}

function clearMarkers() {
  markers.forEach(function(marker) {
    marker.setMap(null);
  })
  markers = [];
  total = 0;
}

function updateProgress() {
  //console.log('Progress: ', markers.length, total);
  $('.alert-default-progress').attr('style', 'width:' + markers.length / total * 100 + '%;')
  if (markers.length == total) {
    $('#loading-alert').fadeOut();
  }
}

function cacheLocation(location) {
  if (location.coords) {
    $.ajax('/cache', {
      type: 'POST',
      data: JSON.stringify({location: location}),
      contentType: "application/json; charset=utf-8",
      dataType: "json",
      success: function(data, status) {
        console.log(status + ': ' + data);
      },
      error: function(jqXHR, status, error) {
        alert(status + ': ' + error);
      }
    });
  }
  
}

google.maps.event.addDomListener(window, 'load', initialize);

$('#submitRoute').click(function(event) {
  event.preventDefault();
  calcRoute();
});

function validPoint(lat, lng) {
  isValid = false;
  for (var i = 0; i < paths.length - 1; i++) {
    if(distanceToPathSegment(
        lat, lng, 
        paths[i].x, paths[i].y, 
        paths[i + 1].x, paths[i + 1].y) < 0.05)
      isValid = true;
  }
  return isValid;
}

function distanceToPathSegment(x, y, x1, y1, x2, y2) {
  var A = x - x1;
  var B = y - y1;
  var C = x2 - x1;
  var D = y2 - y1;

  var dot = A * C + B * D;
  var len_sq = C * C + D * D;
  var param = -1;
  if (len_sq != 0) //in case of 0 length line
      param = dot / len_sq;

  var xx, yy;
  if (param < 0) {
    xx = x1;
    yy = y1;
  }
  else if (param > 1) {
    xx = x2;
    yy = y2;
  }
  else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  var dx = x - xx;
  var dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

$('.select-category').click(function() {
  id = $(this).attr("id");
  if (categories[id] == 1) {
    $(this).attr('src', '/images/pins/' + id + '_marker_white.png');
    categories[id] = 0;
  }
  else {
    $(this).attr('src', '/images/pins/' + id + '_marker.png');
    categories[id] = 1;
  }
});

$(function () {
  $('[data-toggle="tooltip"]').tooltip()
});