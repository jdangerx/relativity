$(document).ready(function(){
  var current_location = new L.LatLng(41.790636, -87.60104);
  var map = L.map('map').setView(current_location, 5);
  L.tileLayer('http://{s}.tiles.mapbox.com/v3/jdangerx.k7m7mjbo/{z}/{x}/{y}.png', {
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
      maxZoom: 18
  }).addTo(map);

  var WALKING = 30; // miles per day

  map.on('click', function(e) {
    var targetPos = e.latlng;
    var dist = haversine(current_location, targetPos);
    var travelTime = dist / WALKING | 0; // days
    getNewsFrom4D(travelTime, targetPos);

  });
});

function getGLocFromPos(targetPos) {
  return '("NEW YORK CITY")';
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

function getNewsFrom4D(travelTime, targetPos){
  var search_base = "http://api.nytimes.com/svc/search/v2/articlesearch.JSON?&fq=";
  var glocations = "glocations:"+getGLocFromPos(targetPos);
  var end_date = "&end_date="+getDateFromTravelTime(travelTime);
  var sort = "&sort=newest";
  var api_key = "api-key=240e8ee06f21f43d31b770c214bbf000:17:54902379";
  var search_str = search_base+glocations+end_date+sort+api_key;
  console.log(search_str);
  $.ajax({method: "GET",
          url: search_str,
          success: function(data, textStatus, xhr) {
            console.log("success!");
            console.log(data);
          },
          error: function(xhr, textStatus, errorThrown) {
            console.log("AJAX Get Error in getNewsFrom4D: " + textStatus + ", " + errorThrown);
          },
          dataType: "json"
        });
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
