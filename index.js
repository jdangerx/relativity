var map;
var obsMarker;
var popups = [];
var popup;
var current_location;
var SPEED = 30; // miles per day
$("#speed").change(function (e) {
  updatePopups();
});
$(document).ready(function(){
  current_location = new L.LatLng(41.790636, -87.60104);
  map = L.map('map').setView(current_location, 5);
  L.tileLayer('http://{s}.tiles.mapbox.com/v3/jdangerx.k7m7mjbo/{z}/{x}/{y}.png', {
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
      maxZoom: 18
  }).addTo(map);
  obsMarker = L.marker(current_location, {draggable: true, title: "You are here."});
  obsMarker.addTo(map);
  obsMarker.on('dragend', function(e) {
    current_location = e.target._latlng;
    updatePopups();
  });

  map.on('click', function(e) {
    var targetPos = e.latlng;
    // var dist = haversine(current_location, targetPos);
    // var travelTime = dist / $("#speed").val() | 0; // days
    getNewsFrom4D(targetPos);
  });

  // setup with new york, chicago, LA, philadelphia, san francisco, houston
  var majorCities = [[42.3482, -75.1890], //nyc
                     [41.790636, -87.60104], // chicago
                     [34.0500, -118.2500], // LA
                     [37.7833, -122.4167], // sf
                     [39.9500, -75.1667], // philly
                     [29.7628, -95.3831] // houston
                    ];
  // majorCities.forEach(function(city) {
  //   var targetPos = new L.LatLng(city[0], city[1]);
  //   var dist = haversine(current_location, targetPos);
  //   var travelTime = dist / $("#speed").val() | 0; // days
  //   getNewsFrom4D(targetPos);
  // });


});

function getGLocFromPos(targetPos, callback) {
  var lat = targetPos.lat;
  var lng = targetPos.lng;
  $.get("http://api.tiles.mapbox.com/v4/geocode/mapbox.places-v1/"+lng+","+lat+".json", {
    access_token: mapboxToken
  }, function(res) {
    var features = res.features; // todo: parse features
    var city = features.filter(function(feature){
      return feature.id.slice(0, 4) == "city";
    });
    if (city.length > 0) {
      city = city[0].text.toLowerCase();
    } else {
      city = void 0;
    }

    var province = features.filter(function(feature){
      return feature.id.slice(0, 8) == "province";
    });
    if (province.length > 0) {
      province = province[0].text.toLowerCase();
    } else {
      province = void 0;
    }
    // if (res.features.length >= 4) {
    //   var province = res.features[res.features.length-2].text.toLowerCase();
    //   var city = res.features[0].text.toLowerCase();
    // }
    city = newYorkSpecialCase(city);
    callback(city, province);
  }, "JSON");

  return '("ILLINOIS")';
}

function newYorkSpecialCase(city) {
  var boroughsEtc = ["manhattan", "brooklyn", "queens", "the bronx",
                     "staten island", "new york", "elmont", "old wbury",
                     "ridgewood", "bronx", "far rockaway", "atlantic beach"];
  if (boroughsEtc.indexOf(city) == -1) {
    return city;
  } else {
    return "new york city";
  }
}

function getDateFromTravelTime(travelTime) {
  var date = new Date();
  var curday = date.getDate();
  date.setDate(curday-travelTime);
  var yearStr = ""+date.getFullYear();
  var month = date.getMonth()+1;
  var monthStr = month < 10? "0"+month : ""+month;
  var day = date.getDate();
  var dayStr = day < 10? "0"+day : ""+day;
  var datestr = yearStr+monthStr+dayStr;
  return datestr;
}

function getNewsFrom4D(targetPos){
  var dist = haversine(current_location, targetPos);
  var travelTime = dist / $("#speed").val() | 0; // in days
  var articles;
  getGLocFromPos(targetPos, function(city, province) {
    var glocations = "glocations:"+'("'+city+'", "'+province+'")';
    console.log(glocations);
    $.get("http://api.nytimes.com/svc/search/v2/articlesearch.json", {
      "api-key":API,
      sort: "newest",
      fq: glocations,
      fl: "headline,web_url,keywords,pub_date",
      end_date: getDateFromTravelTime(travelTime),
    }, function(res) {
      articles = res.response.docs;
      // var popup = L.popup().setLatLng(targetPos, {closeOnClick: false});
      $("#info").html("Distance: "+(dist|0)+" mi<br>Travel time: "+travelTime+" days");
      popup = L.popup().setLatLng(targetPos, {closeOnClick: false});
      popup.setContent(processArticles(articles, city, province));
      popup.openOn(map);
      // popups.push(popup);
      // popup.on('popupclose', function(e) {
      //   var p = e.popup;
      //   popups.splice(popups.indexOf(p), 1);
      // });
      return articles;
    }, "JSON");
  });
}

function processArticles(articles, city, province) {
  articles = articles.map(cleanKeywords);
  articles = articles.map(function (article) {
    article.locations = article.keywords.map(function(keyword) {
      return keyword.value.toLowerCase();
    });
    article.states = [];
    article.locations.forEach(function(location) {
      if (STATES.indexOf(location) != -1) {
        article.states.push(location);
      }
    });
    return article;
  });
  articles.filter(function (article) {
    if (article.states.length === 0) {
      return true;
    }
    else {
      return (article.states.indexOf(province) != -1);
    }
  });

  var location = {city: city, province: province};
  return prettify(articles, location);
}

function prettify(articles, location) {
  locStr = location.city? location.city + ", " + location.province : location.province;
  var artStrs = articles.map(function(article) {
    var pub_date = article.pub_date.substring(0, 10);
    return '<a href="' + article.web_url + '">' + article.headline.main + "</a><br>" + pub_date;
  });
  artStrs.unshift("<strong>"+locStr.toUpperCase()+"</strong>");

  return artStrs.join("<br>");
}

function cleanKeywords(article) {
  article.keywords = article.keywords.filter(function(val) { return val.name == "glocations"; });
  return article;
}

function toRadians(deg) {
  return deg * Math.PI / 180;
}

function haversine(latlng1, latlng2) {
  // Takes two L.LatLngs are returns a distance

  // var R = 6371; // km
  var R = 3959; // miles
  var phi1 = toRadians(latlng1.lat);
  var phi2 = toRadians(latlng2.lat);
  var dphi = toRadians(latlng2.lat - latlng1.lat);
  var dlambda = toRadians(latlng2.lng - latlng1.lng);

  var a = Math.sin(dphi/2) * Math.sin(dphi/2) +
          Math.cos(phi1) * Math.cos(phi2) *
          Math.sin(dlambda/2) * Math.sin(dlambda/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  var d = R * c;
  return d;
}

function updatePopups(){
  // popups.forEach(function(popup) {
    // var targetPos = popup.getLatLng();
    // getNewsFrom4D(targetPos);
  // });
  var targetPos = popup.getLatLng();
  getNewsFrom4D(targetPos);
}

var API = "240e8ee06f21f43d31b770c214bbf000:17:54902379";
var mapboxToken = "pk.eyJ1IjoiamRhbmdlcngiLCJhIjoic2t0aGl6SSJ9.e3gf0i6O2ecn2gwiii7yWw";

var STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California",
"Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii",
"Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
"Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
"Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska",
"Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York",
"North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
"Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
"Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
"West Virginia", "Wisconsin", "Wyoming", "District of Columbia",
              "Puerto Rico", "Guam", "American Samoa", "U.S. Virgin Islands", "Northern Mariana Islands "].map(function(val) {
                return val.toLowerCase();});
