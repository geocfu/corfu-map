// The Google Map.
var map;
var geoJsonOutput;
var downloadLink;
var mapContainer;
var value = "unknown";
var distance;
var circle;
var counter = 0;
var geojsonPathsCounter = 0;
var loginFlag = false;

var credentials = {
    Uid: null,
    Email: null,
    totalMeters: null
};

// Initialize Firebase
var config = {
    apiKey: "AIzaSyDDMHu3ZW4CLbORmrXK-hHxI_DQ-nwyhWM",
    authDomain: "geocfu-corfu-maps-90008.firebaseapp.com",
    databaseURL: "https://geocfu-corfu-maps-90008.firebaseio.com",
    projectId: "geocfu-corfu-maps-90008",
    storageBucket: "geocfu-corfu-maps-90008.appspot.com",
    messagingSenderId: "452451468709"
};
firebase.initializeApp(config);

firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        // User is signed in.
        document.getElementById("login_div").style.display = "none";
        document.getElementById("map-holder").style.display = "block";
        document.getElementById("side-nav-button").style.display = "block";
        document.getElementById("mySidenav").style.display = "block";

        var user = firebase.auth().currentUser;

        if(user != null){
          credentials.Email = user.email;
          credentials.Uid = user.uid;
          loginFlag = true;
        }

        document.getElementById("currentUser").innerHTML = "Logged in as: " + credentials.Email;
        document.getElementById("users").innerHTML = null;

        var usersArray = [];
        var usersEmailsAndMetersArray = [];

        firebase.database().ref("Users paths/").on("child_added", function(data) {
            usersArray.push({'Email': data.val().Email, 'Meters': data.val().totalMeters});

            usersArray.sort(function(a, b) {
                return ((a.Meters > b.Meters) ? -1 : ((a.Meters == b.Meters) ? 0 : 1));
            });

            document.getElementById("leaderboard").innerHTML ="Leaderboard<br>";

            for (var i = 0; i < usersArray.length; i++) {
                usersEmailsAndMetersArray[i] = "Email: " + usersArray[i].Email + "<br>Total Meters: " +usersArray[i].Meters + "<br><br>";
            }
            document.getElementById("users").innerHTML = usersEmailsAndMetersArray;
        });
    }
    else {
        // No user is signed in.
        document.getElementById("login_div").style.display = "block";
        document.getElementById("map-holder").style.display = "none";
        document.getElementById("side-nav-button").style.display = "none";
        document.getElementById("mySidenav").style.display = "none";
        document.getElementById("geojson-output").style.display = "none";
    }
});

function login() {
    var userEmail = document.getElementById("email").value;
    var userPass = document.getElementById("password").value;

    firebase.auth().signInWithEmailAndPassword(userEmail, userPass).catch(function(error) {
        window.alert("No account found, registering new account.");
        firebase.auth().createUserWithEmailAndPassword(userEmail, userPass).catch(function(error) {
            var errorCode = error.code;
            var errorMessage = error.message;
            window.alert("Error : " + errorMessage);
        });
    });
}

function logout() {
    firebase.auth().signOut();
    location.reload();
}

function init() {
    // Initialise the map.
    map = new google.maps.Map(document.getElementById('map-holder'), {
        center: {lat: 39.618199, lng: 19.8999581},
        zoom: 14,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeId: 'satellite',
        zoomControl: true,
        zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_CENTER
        },
    });

    map.data.setControls(['LineString']);

    map.data.setStyle( {
        editable: true,
        draggable: false,
        clickable: true
    });

    map.data.setStyle(function(feature) {
        var color = "#eee";
        if (feature.getProperty("Rating") == null && feature.getProperty("Color") == null ) {
            feature.setProperty("Rating", value);
            feature.setProperty("Color", value);
        }
        if (feature.getProperty("Color") != value) {
            var color = feature.getProperty("Color");
        }
        if (feature.getProperty("Id") == null) {
            feature.setProperty("Id", counter++);
        }
        if (loginFlag == true) {
            addToDatabase(geoJsonOutput.value, getTotalPathsDistance());
        }
        return ({
            strokeColor: color,
            strokeWeight: 4
        });
    });

    bindDataLayerListeners(map.data);

    // load the geoJson file with the paths
    map.data.loadGeoJson("data/2016149_review.geojson", {}, function(features) {
        var maxId = 0;
        map.data.forEach(function(feature) {
            if (feature.getProperty("Id") > maxId) {
                maxId = feature.getProperty("Id");
            }
            geojsonPathsCounter++;
        });
        counter = maxId;
    });

    //Attach click event handler to the map.
    map.data.addListener('click', function (event) {
        promptBox(event);
    });

    map.data.addListener('mouseover', function(event) {
        map.data.overrideStyle(event.feature, {
            strokeWeight: 7,
        });
        checkIfUserIsDrawingInPerimeter();
    });

    map.data.addListener('mouseout', function(event) {
        map.data.overrideStyle(event.feature, {
            strokeWeight: 4
        });
    });

    getCurrentLocation();

    // Retrieve HTML elements.
    mapContainer = document.getElementById('map-holder');
    geoJsonOutput = document.getElementById('geojson-output');
    downloadLink = document.getElementById('download-link');
}

google.maps.event.addDomListener(window, 'load', init);

function getDistance(path) {
    return google.maps.geometry.spherical.computeLength(path.getGeometry().getArray()) | 0;
}

function getTotalPathsDistance() {
    var totalDistance = 0;
    map.data.forEach(function(feature) {
        if (loginFlag == true) {
            totalDistance = totalDistance + google.maps.geometry.spherical.computeLength(feature.getGeometry().getArray()) | 0;
        }
    });
    return totalDistance;
}

function checkIfUserIsDrawingInPerimeter() {
    var alertFlag = false;
    map.data.forEach(function(feature) {
        if (feature.getProperty("Id") > geojsonPathsCounter - 1) { // those are the predefined paths in number
            for (var i = 0; i < feature.getGeometry().getLength(); i++) {
                if ((google.maps.geometry.poly.containsLocation(feature.getGeometry().getAt(i), circle) == false)) {
                    if (alertFlag == false) {
                        alertFlag = true;
                        alert("You are only allowed to draw paths that are up to 100 meters from you.\nRemoving all the paths drawed from you that not comply");
                    }
                    map.data.remove(feature);
                }
            }
        }
    });
}

function promptBox(event) {
    bootbox.dialog({
        title: "Options",
        message: "<h3>The path is <font color='orange'>" + getDistance(event.feature) + "</font> meters long.</h3>" +
                    "Path's ID: " + event.feature.getProperty("Id") +
                    "<br>Path's Rating: " + event.feature.getProperty("Rating") +
                    "<br>Path's color: " + event.feature.getProperty("Color"),
        onEscape: true,
        backdrop: true,
        buttons: {
            ratePath: {
                label: "Rate Path",
                className: 'btn-success',
                callback: function(){
                    ratePath(event);
                }
            },
            deletePath: {
                label: "Delete Path",
                className: 'btn-danger',
                callback: function(){
                    deletePath(event);
                }
            },
            close: {
                label: "Close",
                className: 'btn-light',
                callback: function(){
                }
            }
        }
    });
}
function ratePath (event) {
    bootbox.prompt({
        title: "Please, specify your rating for the path!",
        inputType: 'select',
        backdrop: true,
        inputOptions: [
            {
                text: "Terrible quality path (1)",
                value: '1',
            },
            {
                text: 'Bad quality path (2)',
                value: '2',
            },
            {
                text: 'Medium quality path (3)',
                value: '3',
            },
            {
                text: 'Good quality path (4)',
                value: '4',
            },
            {
                text: 'Excelent quality path (5)',
                value: '5',
            }
        ],
        buttons: {
            confirm: {
                label: 'Rate Path',
                className: 'btn-success'
            },
            cancel: {
                label: 'Close',
                className: 'btn-light'
            }
        },
        callback: function (result) {
            if (result != null) {
                var rating = "unknown";

                if (result == 1) {
                    rating = 1;
                    setColor(event, '#E3170A');
                }
                else if (result == 2) {
                    rating = 2;
                    setColor(event, '#FFA552');
                }
                else if (result == 3) {
                    rating = 3;
                    setColor(event, '#F2DC5D');
                }
                else if (result == 4) {
                    rating = 4;
                    setColor(event, '#8EB1C7');
                }
                else if (result == 5) {
                    rating = 5;
                    setColor(event, '#00E676');
                }
                else {
                    bootbox.alert("Please, select one rating!");
                }
                event.feature.setProperty('Rating', rating);
            }
        }
    }).find('.modal-content').css({
        'margin-top': function () {
            var w = $(window).height();
            var b = $(".modal-dialog").height();
            var h = (w-b)/2;
            return h+"px";
        }
    });
}

function setColor(event, value) {
    color = value;
    map.data.overrideStyle(event.feature, {
        strokeColor: value
    });
    event.feature.setProperty("Color", value);
}

function deletePath(event) {
    bootbox.confirm({
        message: "Are you sure that you want to delete this path?",
        backdrop: true,
        buttons: {
            confirm: {
                label: 'Delete Path',
                className: 'btn-danger'
            },
            cancel: {
                label: 'Close',
                className: 'btn-light'
            }
        },
        callback: function (result) {
            if (result == true) {
                map.data.remove(event.feature);
            }
        }
    }).find('.modal-content').css({
        'margin-top': function () {
            var w = $(window).height();
            var b = $(".modal-dialog").height();
            var h = (w-b)/2;
            return h+"px";
        }
    });
}

function getCurrentLocation() {
    var infoWindow = new google.maps.InfoWindow;

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            infoWindow.setPosition(pos);
            infoWindow.setContent('You are here.');
            infoWindow.open(map);
            map.setCenter(pos);
            map.setZoom(17);
            drawPerimeter()
        }, function() {
            handleLocationError(true, infoWindow, map.getCenter());
        }, geolocationOptions);
    }
    else {
        // Browser doesn't support Geolocation
        handleLocationError(false, infoWindow, map.getCenter());
    }

    var geolocationOptions = {
        enableHighAccuracy: true,
        maximumAge        : 0,
        timeout           : 5000
    }
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    infoWindow.setPosition(pos);
    infoWindow.setContent(browserHasGeolocation ?
                          'Error: The Geolocation service failed.' :
                          'Error: Your browser doesn\'t support geolocation.');
    infoWindow.open(map);
}

function drawPerimeter() {
    circle = new google.maps.Polygon({
        map: map,
        paths: [drawCircle(map.getCenter(), 100, 1)],
        strokeColor: "#FF0000",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        zIndex: -1
   });
}

function drawCircle(point, radius, dir) {
    var d2r = Math.PI / 180;   // degrees to radians
    var r2d = 180 / Math.PI;   // radians to degrees
    var earthsradius = 6378137;

    var points = 128;

    // find the raidus in lat/lon
    var rlat = (radius / earthsradius) * r2d;
    var rlng = rlat / Math.cos(point.lat() * d2r);

    var extp = new Array();

    if (dir==1) {
        var start=0;
        var end=points+1; // one extra here makes sure we connect the path
    }
    else {
        var start=points+1;
        var end=0;
    }
    for (var i=start; (dir==1 ? i < end : i > end); i=i+dir) {
        var theta = Math.PI * (i / (points/2));
        ey = point.lng() + (rlng * Math.cos(theta)); // center a + radius x * cos(theta)
        ex = point.lat() + (rlat * Math.sin(theta)); // center b + radius y * sin(theta)
        extp.push(new google.maps.LatLng(ex, ey));
    }
    return extp;
}

function addToDatabase(json, meters) {
    firebase.database().ref('Users paths/' + credentials.Uid).set({
        Email: credentials.Email,
        Paths : json,
        totalMeters: meters
    });
}

// Refresh different components from other components.
function refreshGeoJsonFromData() {
    map.data.toGeoJson(function(geoJson) {
        geoJsonOutput.value = JSON.stringify(geoJson);
        refreshDownloadLinkFromGeoJson();
    });
}
// Refresh download link.
function refreshDownloadLinkFromGeoJson() {
    downloadLink.href = "data:;base64," + btoa(geoJsonOutput.value);
}

// Apply listeners to refresh the GeoJson display on a given data layer.
function bindDataLayerListeners(dataLayer) {
    dataLayer.addListener('addfeature', refreshGeoJsonFromData);
    dataLayer.addListener('removefeature', refreshGeoJsonFromData);
    dataLayer.addListener('setgeometry', refreshGeoJsonFromData);
    dataLayer.addListener('setproperty', refreshGeoJsonFromData);
}

function geojsonOutput() {
    var output = document.getElementById("geojson-output");
    if (output.style.display === 'none') {
        output.style.display = "block";
    }
    else {
        output.style.display = "none";
    }
}

function removeAllPaths() {
    bootbox.confirm({
        message: "Are you sure that you want to delete all the paths?",
        backdrop: true,
        buttons: {
            confirm: {
                label: 'Delete All Paths',
                className: 'btn-danger'
            },
            cancel: {
                label: 'Close',
                className: 'btn-light'
            }
        },
        callback: function (result) {
            if (result == true) {
                map.data.forEach(function(feature) {
                    map.data.remove(feature);
                });
            }
        }
    });
}

function openNav() {
    document.getElementById("mySidenav").style.width = "270px";
    document.getElementById("side-nav-button").style.visibility = "hidden";
}

function closeNav() {
    document.getElementById("mySidenav").style.width = "0";
    document.getElementById("side-nav-button").style.visibility = "visible";
}
