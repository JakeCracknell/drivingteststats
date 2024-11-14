const id = new URLSearchParams(window.location.search).get('dtc');
const dtcPath = `data/${id}.json`;
const nationalPath = 'data/national.json';
const faultDescriptionsPath = 'data/fault_descriptions.json';

const maneuvreDetails = {
    "Emergency stop": "Following a briefing, you will be directed to drive straight ahead. The examiner will say 'Stop!' and you must brake quickly and safely. Then drive on. You must perform 360\u00b0 observations before moving off.",
    "Forward bay park": "Drive forwards into any parking bay on the left or right. You must finish within the lines, but you don't need to be straight and you can readjust. Then reverse out. You must perform 360\u00b0 observations before reversing and maintain good awareness throughout.",
    "Parallel park": "Pull up alongside a parked car chosen by the examiner. Reverse in and park reasonably close (~30 cm max) and parallel to the kerb and within two car lengths of the parked car. You may readjust. You must perform 360\u00b0 observations before reversing and maintain good awareness throughout.",
    "Reverse bay park": "Reverse into any parking bay on the left or right. You must finish within the lines, but you don't need to be straight and you can readjust. You must perform 360\u00b0 observations before reversing and maintain good awareness throughout. This might be carried out in the test centre car park.",
    "Reverse right": "Pull up on the right-hand side of the road. Reverse back two car lengths, keeping reasonably close to the kerb (~30 cm max). Then rejoin the traffic. You must perform 360\u00b0 observations before reversing and maintain good awareness throughout."
}

// Use Promise.all to load both files concurrently
Promise.all([fetch(dtcPath), fetch(nationalPath), fetch(faultDescriptionsPath)])
    .then(async ([dtcResponse, nationalResponse, faultDescriptionsResponse]) => {
        const dtcData = await dtcResponse.json();
        const nationalData = await nationalResponse.json();
        const faultDescriptions = await faultDescriptionsResponse.json();
        onDataLoad(dtcData, nationalData, faultDescriptions);
    })
    .catch(error => {
        console.error('Error loading data:', error);
    });


// Updated onDataLoad function to accept both DTC and national data
function onDataLoad(dtcData, nationalData, faultDescriptions) {
    document.title = document.title.replaceAll('@', dtcData.name);
    document.querySelectorAll('.dtc-name').forEach(el => el.innerHTML = dtcData.name);
    document.querySelectorAll('.dtc-pass-rate').forEach(el => el.innerHTML = pct(dtcData.pass));
    document.querySelectorAll('.dtc-test-count').forEach(el => el.innerHTML = dtcData.totalTestCount);
    document.querySelectorAll('.dtc-minors-count').forEach(el => el.innerHTML = dtcData.minor_count.toFixed(2));
    document.querySelectorAll('.national-minors-count').forEach(el => el.innerHTML = nationalData.minor_count.toFixed(2));
    document.querySelectorAll('.dtc-any-minors').forEach(el => el.innerHTML = pct(1 - dtcData.minor_any));
    document.querySelectorAll('.national-any-minors').forEach(el => el.innerHTML = pct(1 - nationalData.minor_any));

    if (dtcData.address) {
        document.getElementById('dtc-address').innerHTML = [1, 2, 3, 4, 5]
            .map(x => dtcData.address['addrLine' + x].trim()).filter(x => x)
            .concat(dtcData.address.postcode).join(', ');
    }
    populateFaultsTable(faultDescriptions, dtcData.fails, nationalData.fails, 'fail-faults-table', pct);
    populateFaultsTable(faultDescriptions, dtcData.minors, nationalData.minors, 'minor-faults-table', minorFaultAgg);
    populateManeuvresTable(dtcData, nationalData);
    populateTimeOfDayTable(dtcData);
    if (dtcData.address) {
        populateLocalAreaLinks(dtcData);
    }
}

function populateFaultsTable(faultDescriptions, dtcFaults, nationalFaults, tableId, displayFunction) {
    let table = `
        <thead>
            <tr>
                <th class="all">Fault</th>
                <th class="all">This centre</th>
                <th class="all">UK</th>
                <th class="all">Diff</th>
                <th class="all">Diff %</th>
                <th class="none">Typical situations causing this fault</th>
                <th class="none">Why this might be more common here</th>
            </tr>
        </thead>
        <tbody>
    `;
    for (const [faultName, centreValue] of Object.entries(dtcFaults)) {
        const nationalValue = nationalFaults[faultName];
        const faultDescription = faultDescriptions[faultName];
        if (nationalValue !== 0) {
            if (faultDescription.highReasons.length === 0) {
                faultDescription.highReasons.push('N/A');
            }
            const difference = centreValue - nationalValue;
            const differencePercentage = centreValue / nationalValue;
            const rowColor = getRowColor(differencePercentage);
            table += `
                <tr style="background-color: ${rowColor}" data-fault-name="${faultName}">
                    <td>${faultName}</td>
                    <td>${displayFunction(centreValue)}</td>
                    <td>${displayFunction(nationalValue)}</td>
                    <td>${plusSign(difference)}${pct(difference)}</td>
                    <td>${pct(differencePercentage, 0)}</td>
                    <td><ul>${faultDescription.scenarios.map(scenario => `<li>${scenario}</li>`).join('\n')}</ul></td>
                    <td><ul>${faultDescription.highReasons.map(reason => `<li>${reason}</li>`).join('\n')}</ul></td>
                </tr>
            `;
        }
    }

    table += '</tbody>';
    document.getElementById(tableId).innerHTML = table;
    addRowClickAbility(new DataTable('#' + tableId, {
        order: [[4, 'desc']],
        searching: false,
        paging: false,
        info: false,
        responsive: true
    }));
}

function populateManeuvresTable(dtcData, nationalData) {
    let tbody = '';
    dtcData.maneuvres.forEach(dtcManeuvre => {
        const details = maneuvreDetails[dtcManeuvre.name];
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
                <td>${details}</td>
            </tr>
        `;

    });
    document.getElementById('maneuvre-table-body').innerHTML = tbody;
    addRowClickAbility(new DataTable('#maneuvre-table', {
        order: [[2, 'desc']],
        searching: false,
        paging: false,
        info: false,
        responsive: true
    }));
}

function addRowClickAbility(datatable) {
    datatable.on('click', 'td:not(.dtr-control)', function () {
        $(this).closest('tr').find('td:first-child').click();
    });
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
                            const color = getRowColor(timeData.pass / dtcData.pass, false);
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
        info: false
    });
}

function populateLocalAreaLinks(dtcData) {
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

    const cleanedName = dtcData.name.replace(/\(.*\)/g, '').trim();
    const searchQuery = encodeURIComponent(`${cleanedName} driving test route site:plotaroute.com/route/`);
    document.getElementById('route-search-link').href = `https://www.google.com/search?q=${searchQuery}`;
}


function pct(value, fractionDigits = 2) {
    return (value * 100).toFixed(fractionDigits) + '%';
}

function minorFaultAgg(value) {
    return value.toFixed(3);
}

function plusSign(value) {
    return value > 0 ? '+' : '';
}

// Between 0.5 and 1.5, measure distance. Alpha is 0.5 if far, 0=transparent if close (i.e. same as national average)
function getRowColor(differencePercentage, highIsBad = true) {
    let alpha = Math.abs(Math.max(0.5, Math.min(1.5, differencePercentage)) - 1);
    //alpha = highIsBad ? alpha : alpha * -1;
    if (differencePercentage > 1.00 ^ highIsBad) {
        return `rgba(var(--bs-success-rgb), ${alpha})`;
    } else {
        return `rgba(var(--bs-danger-rgb), ${alpha})`;
    }
}