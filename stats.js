// Get the DTC ID from the URL
const dtc_id = new URLSearchParams(window.location.search).get('dtc');
const dtcPath = 'data/dtc/' + dtc_id + '.json';
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
    document.title = `${dtcData.address.name} - Driving Test Centre Statistics`;
    document.querySelectorAll('.dtc-name').forEach(el => el.innerHTML = dtcData.address.name);

    console.log('DTC Data:', dtcData);
    console.log('National Data:', nationalData);

    let table = `
        <thead>
            <tr>
                <th>Fault Category</th>
                <th>This centre</th>
                <th>National</th>
                <th>Difference</th>
                <th>Difference %</th>
            </tr>
        </thead>
        <tbody>
    `;

    for (const [key, centreValue] of Object.entries(dtcData.fails)) {
        const nationalValue = nationalData.fails[key];
        const difference = centreValue - nationalValue;
        const differencePercentage = centreValue / nationalValue;
        const rowColor = getRowColor(differencePercentage);

        table += `
            <tr style="background-color: ${rowColor}">
                <td>${key}</td>
                <td>${pct(centreValue)}</td>
                <td>${pct(nationalValue)}</td>
                <td>${plusSign(difference)}${pct(difference)}</td>
                <td>${pct(differencePercentage)}</td>
            </tr>
        `;
    }

    table += '</tbody>';
    document.getElementById('fail-faults-table').innerHTML = table;
    Sortable.init();
    Sortable.initTable(document.getElementById('fail-faults-table'));
}

function pct(value) {
    return (value * 100).toFixed(2) + '%';
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