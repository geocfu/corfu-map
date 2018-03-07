// The Google Map.
var map;
var geoJsonOutput;
var downloadLink;
var mapContainer;
var value = "unknown";

function init() {
    // Initialise the map.
    map = new google.maps.Map(document.getElementById('map-holder'), {
        center: {lat: 39.618199, lng: 19.8999581},
        zoom: 14,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeId: 'satellite'
    });

    map.data.setControls(['Point', 'LineString', 'Polygon']);

    map.data.setStyle( {
        editable: true,
        draggable: true,
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
        return ({
            strokeColor: color,
            strokeWeight: 4
        });

    });

    bindDataLayerListeners(map.data);

    // load the geoJson file with the paths
    map.data.loadGeoJson("data/2016149_review.geojson");

    //Attach click event handler to the map.
    map.data.addListener('click', function (event) {
        ratePath(event);
    });

    // When the user right clicks, delete the path.
    map.data.addListener('rightclick', function(event) {
        deletePath(event);
    });

    map.data.addListener('mouseover', function(event) {
        map.data.overrideStyle(event.feature, {
            strokeWeight: 7,
        });
    });

    map.data.addListener('mouseout', function(event) {
        map.data.overrideStyle(event.feature, {
            strokeWeight: 4
        });
    });

    // Retrieve HTML elements.
    mapContainer = document.getElementById('map-holder');
    geoJsonOutput = document.getElementById('geojson-output');
    downloadLink = document.getElementById('download-link');
}

google.maps.event.addDomListener(window, 'load', init);

// Refresh different components from other components.
function refreshGeoJsonFromData() {
    map.data.toGeoJson(function(geoJson) {
        geoJsonOutput.value = JSON.stringify(geoJson, null, "\t");
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
    var x = document.getElementById("geojson-output");
    if (x.style.display === "none") {
        x.style.display = "block";
    } else {
        x.style.display = "none";
    }
}

function removeAllPaths() {
    bootbox.confirm({
        message: "Are you sure that you want to delete all the paths?",
        buttons: {
            confirm: {
                label: 'Yes',
                className: 'btn-success'
            },
            cancel: {
                label: 'No',
                className: 'btn-danger'
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

function ratePath (event) {
    bootbox.prompt({
        title: "Please, specify your rating for the path!",
        inputType: 'checkbox',
        backdrop: true,
        inputOptions: [
            {
                text: '1',
                value: '1',
            },
            {
                text: '2',
                value: '2',
            },
            {
                text: '3',
                value: '3',
            },
            {
                text: '4',
                value: '4',
            },
            {
                text: '5',
                value: '5',
            }
        ],
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
            else {

            }
        }
    });
}

function deletePath(event) {
    bootbox.confirm({
        message: "Are you sure that you want to delete this path?",
        buttons: {
            confirm: {
                label: 'Yes',
                className: 'btn-success'
            },
            cancel: {
                label: 'No',
                className: 'btn-danger'
            }
        },
        callback: function (result) {
            if (result == true) {
                map.data.remove(event.feature);
            }
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
