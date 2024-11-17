mapboxgl.accessToken = 'pk.eyJ1IjoiZHJzcGE0NCIsImEiOiJjamo5MWloNDYwNHZ6M2txeGVrMWJxc3ppIn0.RibkexMCj1fRzadpmTdgFw';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-2.2426, 53.4808],
    zoom: 6,
    minZoom: 5,
    maxZoom: 15,
});
fetch('data/dtcs.geojson')
    .then(response => response.json())
    .then(data => map.on('load', () => addLayersToMap(data)))
    .catch(error => alert('Please refresh. Error loading GeoJSON data: ' + error));


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
    map.addSource('isochrone', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    });
    map.addLayer({
        'id': 'isochrone',
        'type': 'fill',
        'source': 'isochrone',
        'paint': {
            'fill-color': '#000',
            'fill-opacity': 0.3,
        },
    });
    map.on('click', 'dtc', onDtcClick);
    map.on('mouseenter', 'dtc', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'dtc', () => map.getCanvas().style.cursor = '');
}

function onDtcClick(e) {
    map.setFilter('dtc', ['!=', 'id', e.features[0].properties.id]);
    new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(getHtmlForPopup(e.features[0].properties))
        .addTo(map);
    const url = `https://api.mapbox.com/isochrone/v1/mapbox/driving-traffic/${e.features[0].properties.longitude},${e.features[0].properties.latitude}?access_token=${mapboxgl.accessToken}` +
        '&contours_minutes=15&polygons=true&exclude=motorway,toll,ferry,unpaved';
    fetch(url)
        .then(response => response.json())
        .then(data => map.getSource('isochrone').setData(data))
        .catch(error => console.error('Error loading isochrone data:', error));
    gtag('event', 'dtc-click', {
        'event_category': 'engagement',
        'event_label': e.features[0].properties.name
    });
}

function getHtmlForPopup(dtc) {
    let html =  `<h3>${dtc.name}</h3>`;
    html += `<b>Postcode:</b> <a href="https://www.google.com/maps/search/?api=1&query=${dtc.latitude},${dtc.longitude}" target="_blank">${dtc.postcode}</a>`;
    html += `<br><b>Pass Rate:</b> ${(100 * dtc.pass).toFixed(2)}% ${getEmojiForPassRate(dtc.pass)}`;
    if (dtc.dailyTestCount < 1) {
        html += `<br><b>Capacity:</b> ${(dtc.dailyTestCount * 30).toFixed(1)} tests per month`;
    } else if (dtc.dailyTestCount < 3) {
        html += `<br><b>Capacity:</b> ${(dtc.dailyTestCount * 7).toFixed(1)} tests per week`;
    } else {
        html += `<br><b>Capacity:</b> ${dtc.dailyTestCount.toFixed(1)} tests per day`;
    }
    html += `<p><button onclick="window.open('stats.html?dtc=${dtc.id}&name=${dtc.name}', '_blank');">See fault stats >></button></p>`;
    return html;
}

function getEmojiForPassRate(pass) {
    const intervals = [0.4, 0.45, 0.5, 0.55, 0.65, 1.0];
    const emojis = ['😡', '😠', '😐', '😊', '😃', '🤩'];
    return emojis[intervals.findIndex(i => pass <= i)];
}
