const id = new URLSearchParams(window.location.search).get('dtc');
const dtcPath = `data/${id}.json`;
const nationalPath = 'data/national.json';

// Use Promise.all to load both files concurrently
Promise.all([fetch(dtcPath), fetch(nationalPath)])
    .then(async ([dtcResponse, nationalResponse]) => {
        // Parse JSON from both responses
        const dtcData = await dtcResponse.json();
        const nationalData = await nationalResponse.json();

        // Pass both datasets to onDataLoad for processing
        onDataLoad(dtcData, nationalData);
    })
    .catch(error => {
        console.error('Error loading data:', error);
    });


// Updated onDataLoad function to accept both DTC and national data
function onDataLoad(dtcData, nationalData) {
    document.title = document.title.replaceAll('@', dtcData.name);
    document.querySelectorAll('.dtc-name').forEach(el => el.innerHTML = dtcData.name);
    document.querySelectorAll('.dtc-pass-rate').forEach(el => el.innerHTML = pct(dtcData.pass));

    console.log('DTC Data:', dtcData);
    console.log('National Data:', nationalData);
    populateFaultsTable(dtcData.fails, nationalData.fails, 'fail-faults-table', pct);
    populateFaultsTable(dtcData.minors, nationalData.minors, 'minor-faults-table', minorFaultAgg);
    populateManeuvresTable(dtcData, nationalData);
    populateTimeOfDayTable(dtcData);
    if (dtcData.address) {
        populateSpeedLimitLinks(dtcData);
    }
}

function populateFaultsTable(dtcFaults, nationalFaults, tableId, displayFunction) {
    let table = `
        <thead>
            <tr>
                <th>Fault Category</th>
                <th>This centre</th>
                <th>National</th>
                <th>Diff</th>
                <th>Diff %</th>
            </tr>
        </thead>
        <tbody>
    `;
    for (const [key, centreValue] of Object.entries(dtcFaults)) {
        const nationalValue = nationalFaults[key];
        if (nationalValue !== 0) {
            const difference = centreValue - nationalValue;
            const differencePercentage = centreValue / nationalValue;
            const rowColor = getRowColor(differencePercentage);
            table += `
                <tr style="background-color: ${rowColor}">
                    <td>${key}</td>
                    <td>${displayFunction(centreValue)}</td>
                    <td>${displayFunction(nationalValue)}</td>
                    <td>${plusSign(difference)}${pct(difference)}</td>
                    <td>${pct(differencePercentage)}</td>
                </tr>
            `;
        }
    }

    table += '</tbody>';
    document.getElementById(tableId).innerHTML = table;
    new DataTable('#' + tableId, {
        order: [[3, 'desc']],
        searching: false,
        paging: false,
        info: false,
        responsive: true
    })
}

function populateManeuvresTable(dtcData, nationalData) {
    let tbody = '';
    dtcData.maneuvres.forEach(dtcManeuvre => {
        const nationalManeuvre = nationalData.maneuvres.find(nm => nm.name === dtcManeuvre.name);
        const rowColor = getRowColor(1 + (dtcManeuvre.maneuvre_fails * 4)); //for more contrasting colours
        tbody += `
            <tr style="background-color: ${rowColor}">
                <td>${dtcManeuvre.name}</td>
                <td>${pct(dtcManeuvre.frequency)}</td>
                <td>${pct(dtcManeuvre.maneuvre_fails)}</td>
                <td>${pct(nationalManeuvre.maneuvre_fails)}</td>
                <td>${pct(dtcManeuvre.pass)}</td>
                <td>${pct(nationalManeuvre.pass)}</td>
            </tr>
        `;

    });
    document.getElementById('maneuvre-table-body').innerHTML = tbody;
    new DataTable('#maneuvre-table', {
        order: [[3, 'desc']],
        searching: false,
        paging: false,
        info: false,
        responsive: true
    })
}

function populateTimeOfDayTable(dtcData) {
    const dayTypes = ['Mon-Fri', 'Saturday', 'Sunday'];
    const times = [...new Set(dtcData.times.map(td => td.time))].sort();
    const medianDailyTests = dtcData.times.map(td => td.dailyTests).sort()[Math.floor(dtcData.times.length / 2)];
    const dailyTestThresholdToBlank = medianDailyTests / 5;
    document.getElementById('time-of-day-table').innerHTML = `
        <thead>
            <tr>
                <th>Time</th>
                ${dayTypes.map(dayType => `<th>${dayType}</th>`).join('')}
            </tr>
        </thead>
        <tbody>
            ${times.map(time => `
                <tr>
                    <td>${time}</td>
                    ${dayTypes.map(dayType => {
                        const timeData = dtcData.times.find(td => td.dayType === dayType && td.time === time);
                        if (timeData) {
                            const color = getRowColor(timeData.pass / dtcData.pass);
                            const opacity = timeData.dailyTests < dailyTestThresholdToBlank ? 0.25 : 1;
                            return `<td style="background-color: ${color}; opacity: ${opacity}">
                                    ${pct(timeData.pass)} (${timeData.dailyTests.toFixed(2)}/day)</td>`;
                        } else {
                            return '<td></td>';
                        }
                    }).join('')}
                </tr>
            `).join('')}
        </tbody>
    `;
    new DataTable('#time-of-day-table', {
        ordering: false,
        searching: false,
        paging: false,
        info: false,
        responsive: true
    });
}

function populateSpeedLimitLinks(dtcData) {
    const zoomLevel = `12`;
    function buildSpeedLimitLink(speedLimitQuery, text) {
        return `<a href="https://iandees.github.io/TIGERMap/docs/WorldMap/?filter=highway;${speedLimitQuery}#map=${zoomLevel}/${dtcData.address.latitude}/${dtcData.address.longitude}" target="_blank">${text}</a>`;
    }
    const absolutes = [20, 30, 40].map(speedLimit => {
        return buildSpeedLimitLink(`maxspeed=${speedLimit} mph`, `${speedLimit} mph`);
    });
    const mins = [50, 60, 70].map(speedLimit => {
        return buildSpeedLimitLink(`maxspeed>=${speedLimit} mph`, `${speedLimit}+ mph`);
    });
    const nsl = buildSpeedLimitLink(`maxspeed:type=GB:nsl_single,GB:nsl_dual,GB:motorway`, `National Speed Limit`);
    const allLinks = [...absolutes, ...mins, nsl];
    document.getElementById('speed-limit-links').innerHTML = allLinks.join('\n');


    document.getElementById('stop-signs-link').href = `https://overpass-turbo.eu/?Q=node%5Bhighway%3Dstop%5D%28%7B%7Bbbox%7D%7D%29%3Bout%3B&C=${dtcData.address.latitude}%3B${dtcData.address.longitude}%3B${zoomLevel}&R=`;
    document.getElementById('google-maps-link').href = `https://www.google.com/maps/search/?api=1&query=${dtcData.address.latitude},${dtcData.address.longitude}`;
    document.getElementById('osm-link').href = `https://www.openstreetmap.org/?mlat=${dtcData.address.latitude}&mlon=${dtcData.address.longitude}&zoom=${zoomLevel}`;
}


function pct(value) {
    return (value * 100).toFixed(2) + '%';
}

function minorFaultAgg(value) {
    return value.toFixed(3);
}

function plusSign(value) {
    return value > 0 ? '+' : '';
}

// Between 0.5 and 1.5, measure distance. Alpha is 0.5 if far, 0=transparent if close (i.e. same as national average)
function getRowColor(differencePercentage) {
    const alpha = Math.abs(Math.max(0.5, Math.min(1.5, differencePercentage)) - 1);
    if (differencePercentage > 1) {
        return `rgba(var(--bs-danger-rgb), ${alpha})`;
    } else {
        return `rgba(var(--bs-success-rgb), ${alpha})`;
    }
}