// Get the DTC ID from the URL
const dtc_id = new URLSearchParams(window.location.search).get('dtc');
const dtcPath = 'data/dtc/' + dtc_id + '.json';
const nationalPath = 'data/dtc/national.json';

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
    document.title = document.title.replaceAll('@', dtcData.address.name);
    document.querySelectorAll('.dtc-name').forEach(el => el.innerHTML = dtcData.address.name);

    console.log('DTC Data:', dtcData);
    console.log('National Data:', nationalData);
    populateFaultsTable(dtcData.fails, nationalData.fails, 'fail-faults-table');
    populateFaultsTable(dtcData.minors, nationalData.minors, 'minor-faults-table');
    populateManeuvresTable(dtcData, nationalData);
    Sortable.init();
}

function populateFaultsTable(dtcFaults, nationalFaults, tableId) {
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
    for (const [key, centreValue] of Object.entries(dtcFaults)) {
        const nationalValue = nationalFaults[key];
        if (nationalValue !== 0) {
            const difference = centreValue - nationalValue;
            const differencePercentage = centreValue / nationalValue;
            const rowColor = getRowColor(differencePercentage);
            table += `
                <tr style="background-color: ${rowColor}">
                    <td>${key}</td>
                    <td data-value=${centreValue}>${pct(centreValue)}</td>
                    <td data-value=${nationalValue}>${pct(nationalValue)}</td>
                    <td data-value=${difference}>${plusSign(difference)}${pct(difference)}</td>
                    <td data-value=${differencePercentage}>${pct(differencePercentage)}</td>
                </tr>
            `;
        }
    }

    table += '</tbody>';
    document.getElementById(tableId).innerHTML = table;
}

function populateManeuvresTable(dtcData, nationalData) {
    let tbody = '';
    dtcData.maneuvres.forEach(dtcManeuvre => {
        const nationalManeuvre = nationalData.maneuvres.find(nm => nm.name === dtcManeuvre.name);
        const localDifficulty = (dtcManeuvre.pass - dtcData.pass) / dtcManeuvre.pass;
        const nationalDifficulty = (nationalManeuvre.pass - nationalData.pass) / nationalManeuvre.pass;
        const rowColor = getRowColor(1 + (-localDifficulty * 4)); //for more contrasting colours
        tbody += `
            <tr style="background-color: ${rowColor}">
                <td>${dtcManeuvre.name}</td>
                <td data-value=${dtcManeuvre.frequency}>${pct(dtcManeuvre.frequency)}</td>
                <td data-value=${dtcManeuvre.pass}>${pct(dtcManeuvre.pass)}</td>
                <td data-value=${nationalManeuvre.pass}>${pct(nationalManeuvre.pass)}</td>
                <td data-value=${localDifficulty}>${plusSign(localDifficulty)}${pct(localDifficulty)}</td>
                <td data-value=${nationalDifficulty}>${plusSign(nationalDifficulty)}${pct(nationalDifficulty)}</td>
            </tr>
        `;

    });
    document.getElementById('maneuvre-table-body').innerHTML = tbody;
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