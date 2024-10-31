mapboxgl.accessToken = 'pk.eyJ1IjoiZHJzcGE0NCIsImEiOiJjamo5MWloNDYwNHZ6M2txeGVrMWJxc3ppIn0.RibkexMCj1fRzadpmTdgFw';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-2.2426, 53.4808],
    zoom: 6,
    minZoom: 5,
    maxZoom: 15,
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
    html += '<p>Postcode: ' + dtc.postcode + '</p>';
    //stats.html?dtc={id}
    html += '<p><a href="stats.html?dtc=' + dtc.id + '">See detailed fault statistics</a></p>';

    return html;
}



fetch('data/dtcs.geojson')
    .then(response => response.json())
    .then(data => map.on('load', () => addLayersToMap(data)))
    .catch(error => console.error('Error loading GeoJSON data:', error));

function addLayersToMap(data) {
    data.features.forEach(f => {
        f.properties.shortName = f.properties.name.replaceAll(' (London)', '')
            .replaceAll(' (Liverpool)', '')
            .replaceAll(' (Manchester)', '');
        f.properties.label = f.properties.shortName + ' ' + (100 * f.properties.pass).toFixed(0) + '%';

    });
    map.addSource('dtc', {
        type: 'geojson',
        data: data
    });

    map.addLayer({
        'id': 'dtc',
        'type': 'fill',
        'source': 'dtc',
        'paint': {
            'fill-color': ['get', 'fill'],
            'fill-opacity': 0.7,
        },
    });

    map.addLayer({
        'id': 'dtc-outline',
        'type': 'line',
        'source': 'dtc',
        'paint': {
            'line-color': '#000',
            'line-width': 1,
        },
    });

    //create source of points using features from data
    map.addSource('dtc-points', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: data.features.map(f => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [f.properties.longitude, f.properties.latitude]
                },
                properties: f.properties
            }))
        }
    });


    map.addLayer({
        'id': 'dtc-circle',
        'type': 'circle',
        'source': 'dtc-points',
        'paint': {
            'circle-radius': [
                'interpolate',
                ['linear'],
                ['get', 'dailyTestCount'],
                0, 1,
                10, 2, //percentile 35
                15, 3,
                20, 4,
                24, 5, //percentile 80
            ],
            'circle-color': '#000',
            'circle-opacity': 1.0,
        },
    });

    map.addLayer({
        'id': 'dtc-label',
        'type': 'symbol',
        'source': 'dtc-points',
        'layout': {
            'text-field': ['get', 'label'],
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
            'text-size': 18,
            'text-offset': [0, 0.6],
            'text-anchor': 'top',
        },
        'paint': {
            'text-color': '#000',
            'text-halo-color': '#fff',
            'text-halo-width': 3,
        },
        'minzoom': 9,
    });

    map.on('click', 'dtc', function (e) {
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(getHtmlForPopup(e.features[0].properties))
            .addTo(map);
    });
    map.on('mouseenter', 'dtc', function () {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'dtc', function () {
        map.getCanvas().style.cursor = '';
    });
}

// load geojson data
