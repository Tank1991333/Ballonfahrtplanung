// ==========================================
// 1. KARTEN-INITIALISIERUNG & SETUP
// ==========================================

const startLat = parseFloat(document.getElementById('lat').value) || 47.16960;
const startLon = parseFloat(document.getElementById('lon').value) || 16.00930;

// Karte im passenden dunklen Design laden (CartoDB DarkMatter)
const map = L.map('map', { zoomControl: true }).setView([startLat, startLon], 12);

L.tileLayer('https://{s}://{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// Startmarker erzeugen (Verschiebbar)
const startMarker = L.marker([startLat, startLon], { draggable: true }).addTo(map);
startMarker.bindPopup("<b>Startplatz</b><br>Bewege mich, um den Ort anzupassen.").openPopup();

// DOM Elemente für die Koordinatenanzeigen
const latInput = document.getElementById('lat');
const lonInput = document.getElementById('lon');
const displayLat = document.getElementById('display-lat');
const displayLon = document.getElementById('display-lon');

// Automatisches Update beim Verschieben des Markers
startMarker.on('dragend', function () {
    const pos = startMarker.getLatLng();
    latInput.value = pos.lat.toFixed(5);
    lonInput.value = pos.lng.toFixed(5);
    displayLat.textContent = pos.lat.toFixed(5);
    displayLon.textContent = pos.lng.toFixed(5);
});

// Klick auf Karte setzt den Marker neu
map.on('click', function(e) {
    startMarker.setLatLng(e.latlng);
    latInput.value = e.latlng.lat.toFixed(5);
    lonInput.value = e.latlng.lng.toFixed(5);
    displayLat.textContent = e.latlng.lat.toFixed(5);
    displayLon.textContent = e.latlng.lng.toFixed(5);
});

// ==========================================
// 2. STEUERUNGSELEMENTE & SCHNELLAUSWAHL
// ==========================================

// Flugdauer Schieberegler synchronisieren
const durationRange = document.getElementById('duration');
const durationVal = document.getElementById('duration-val');
durationRange.addEventListener('input', (e) => {
    durationVal.textContent = parseFloat(e.target.value).toFixed(1) + " Stunden";
});

// KORRIGIERT: Sicheres Vorbefüllen des heutigen Datums ohne Array-Crash
const dateInput = document.getElementById('date');
if (dateInput) {
    const todayParts = new Date().toISOString().split('T');
    dateInput.value = todayParts[0];
}

// Logik für Schnellauswahl-Buttons
const checkboxes = document.querySelectorAll('#levels input[type="checkbox"]');

document.getElementById('btn-all-levels').addEventListener('click', () => {
    checkboxes.forEach(cb => cb.checked = true);
});

document.getElementById('btn-no-levels').addEventListener('click', () => {
    checkboxes.forEach(cb => cb.checked = false);
});

document.getElementById('btn-balloon-levels').addEventListener('click', () => {
    const balloonAltitudes = ["80", "100", "150", "180"];
    checkboxes.forEach(cb => {
        cb.checked = balloonAltitudes.includes(cb.value);
    });
});

// ==========================================
// 3. SIMULIERTE API-AUSFÜHRUNG & VISUALISIERUNG
// ==========================================

let mapLayers = [];
const statusMsg = document.getElementById('status');
const resultsDiv = document.getElementById('results');

document.getElementById('run').addEventListener('click', () => {
    statusMsg.textContent = "Berechne Trajektorien...";
    statusMsg.className = "status-message";
    statusMsg.style.color = "var(--orange)";

    const currentLat = parseFloat(latInput.value);
    const currentLon = parseFloat(lonInput.value);
    const duration = parseFloat(durationRange.value);

    // Ausgewählte Höhen einsammeln
    let selectedHeights = [];
    document.querySelectorAll('#levels input[type="checkbox"]:checked').forEach(cb => {
        selectedHeights.push(cb.value);
    });

    if (selectedHeights.length === 0) {
        statusMsg.textContent = "Fehler!";
        statusMsg.style.color = "var(--red)";
        alert("Bitte wählen Sie mindestens eine Höhe aus!");
        return;
    }

    // Alte Layer löschen
    mapLayers.forEach(l => map.removeLayer(l));
    mapLayers = [];

    setTimeout(() => {
        statusMsg.textContent = "Berechnung abgeschlossen.";
        statusMsg.style.color = "var(--green)";

        let tableRowsHtml = "";
        const colors = ['var(--blue)', 'var(--green)', 'var(--orange)', 'var(--yellow)', 'var(--violet)', '#ff5252'];

        selectedHeights.forEach((height, i) => {
            let points = [[currentLat, currentLon]];
            let steps = duration * 2; 
            
            let windDriftLat = 0.012 + (i * 0.003);
            let windDriftLon = 0.022 - (i * 0.002);

            let cLat = currentLat;
            let cLon = currentLon;

            for(let s = 1; s <= steps; s++) {
                cLat += windDriftLat + (Math.random() * 0.002 - 0.001);
                cLon += windDriftLon + (Math.random() * 0.002 - 0.001);
                points.push([cLat, cLon]);
            }

            const lineColor = colors[i % colors.length];

            // Linie auf Karte zeichnen
            const polyline = L.polyline(points, {
                color: lineColor,
                weight: 4,
                opacity: 0.8
            }).addTo(map);
            mapLayers.push(polyline);

            // Letzten Endpunkt markieren
            const endPoint = points[points.length - 1];
            const endMarker = L.circleMarker(endPoint, {
                radius: 6,
                fillColor: lineColor,
                color: '#ffffff',
                weight: 2,
                fillOpacity: 1
            }).addTo(map).bindPopup(`<b>Endpunkt (${height} m)</b>`);
            mapLayers.push(endMarker);

            tableRowsHtml += `
                <tr>
                    <td><span style="display:inline-block; width:10px; height:10px; background:${lineColor}; border-radius:50%;"></span> ${height} m</td>
                  console.log("endPoint:", endPoint);
console.log("Typ:", typeof endPoint);
console.log("Ist Array:", Array.isArray(endPoint));
                    <td>${endPoint.toFixed(4)}</td>
                    <td>${endPoint.toFixed(4)}</td>
                </tr>
            `;
        });

        const featureGroup = new L.featureGroup(mapLayers);
        map.fitBounds(featureGroup.getBounds().pad(0.1));

        resultsDiv.innerHTML = `
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Höhe</th>
                            <th>Lat (Ende)</th>
                            <th>Lon (Ende)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHtml}
                    </tbody>
                </table>
            </div>
        `;

    }, 1000);
});

// Orts-Ortssuche (Dummy-Trigger für das Suchfeld)
document.getElementById('search-button').addEventListener('click', () => {
    const query = document.getElementById('search-location').value;
    alert(`Ortssuche nach "${query}" gestartet.`);
});
