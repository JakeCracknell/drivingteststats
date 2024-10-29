mapboxgl.accessToken = 'pk.eyJ1IjoiZHJzcGE0NCIsImEiOiJjamo5MWloNDYwNHZ6M2txeGVrMWJxc3ppIn0.RibkexMCj1fRzadpmTdgFw';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-2.2426, 53.4808],
    zoom: 6
});

function getHtmlForPopup(dtc) {
    //{"id": 245, "name": "Benbecula Island", "totalTestCount": 67, "dailyTestCount": 0.3116, "pass": 0.9104, "attemptNum": 1.3134, "isFirstAttempt": 0.791, "emergencyStop": 0.2985, "reverseBayPark": 0.1343, "forwardBayPark": 0.2537, "parallelPark": 0.2985, "reverseRight": 0.3134, "anyManeuvre": 1.0, "latitude": 57.4725, "longitude": -7.3747, "addrLine1": "Driver and Vehicle Standards Agency", "addrLine2": "Driving Test Centre Benbecula Island", "addrLine3": "Balivanich Airport", "addrLine4": "Benbecula Island", "addrLine5": "", "postcode": "HS7 5LA",
    // return HTML with all of this information
    let html =  '<h3>' + dtc.name + '</h3>';
    html += '<p>Pass Rate: ' + (100 * dtc.pass).toFixed(2) + '%</p>';
    if (dtc.dailyTestCount < 1) {
        html += '<p>Capacity: ' + (dtc.dailyTestCount * 30).toFixed(1) + ' tests per month</p>';
    } else if (dtc.dailyTestCount < 3) {
        html += '<p>Capacity: ' + (dtc.dailyTestCount * 7).toFixed(1) + ' tests per week</p>';
    } else {
        html += '<p>Capacity: ' + dtc.dailyTestCount.toFixed(1) + ' tests per day</p>';
    }
    html += '<p>Postcode: <a href="https://www.google.com/maps/search/?api=1&query=' + dtc.latitude + ',' + dtc.longitude + '" target="_blank">' + dtc.postcode + '</a></p>';
    //stats.html?dtc={id}
    html += '<p><a href="stats.html?dtc=' + dtc.id + '">See detailed fault statistics</a></p>';

    return html;
}

// load geojson data
map.on('load', function() {
    map.addSource('dtc', {
        type: 'geojson',
        data: 'data/dtcs.geojson'
    });

    // take fill-opacity from the source data
    map.addLayer({
        'id': 'dtc',
        'type': 'fill',
        'source': 'dtc',
        'paint': {
            'fill-color': ['get', 'fill'],
            'fill-opacity': 0.7,
        },
    });

    // add popup
    map.on('click', 'dtc', function(e) {
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(getHtmlForPopup(e.features[0].properties))
            .addTo(map);
    });

    // change cursor to pointer when hovering over a clickable feature
    map.on('mouseenter', 'dtc', function() {
        map.getCanvas().style.cursor = 'pointer';
    });

    // change it back to a pointer when it leaves
    map.on('mouseleave', 'dtc', function() {
        map.getCanvas().style.cursor = '';
    });
});