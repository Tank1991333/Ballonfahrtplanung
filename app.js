// ==========================================
// 1. KARTEN-INITIALISIERUNG (LEAFLET)
// ==========================================

// Standard-Koordinaten aus dem HTML auslesen (Hartberg)
const defaultLat = parseFloat(document.getElementById('lat').value) || 47.28100;
const defaultLon = parseFloat(document.getElementById('lon').value) || 15.97000;

// Karte erzeugen und zentrieren
const map = L.map('map', {
    zoomControl: true
}).setView([defaultLat, defaultLon], 13);

// Dunkles Kacheldesign (CartoDB DarkMatter) – passt perfekt zu Ihrem Sci-Fi/Dark-CSS Theme
L.tileLayer('https://{s}://{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors &copy; <a href="https://carto.com">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// ==========================================
// 2. STARTPLATZ-MARKER & SYNCHRONISIERUNG
// ==========================================

// Verschiebbarer Marker (Draggable) für den Ballonstartplatz
const startMarker = L.marker([defaultLat, defaultLon], {
    draggable: true
}).addTo(map);

startMarker.bindPopup("<b>Startplatz</b><br>Bewege mich, um den Ort anzupassen.").openPopup();

// DOM-Elemente für Koordinaten
const latInput = document.getElementById('lat');
const lonInput = document.getElementById('lon');
const updatePosButton = document.getElementById('update-position');

// Wenn der Marker gezogen wird: Inputs updaten
startMarker.on('dragend', function (e) {
    const position = startMarker.getLatLng();
    latInput.value = position.lat.toFixed(5);
    lonInput.value = position.lng.toFixed(5);
});

// Button: Karte auf die manuell eingetippten Koordinaten zentrieren
updatePosButton.addEventListener('click', () => {
    const lat = parseFloat(latInput.value);
    const lon = parseFloat(lonInput.value);
    
    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        const newLatLng = new L.LatLng(lat, lon);
        startMarker.setLatLng(newLatLng);
        map.setView(newLatLng, 13);
    } else {
        alert("Bitte gültige Koordinaten eingeben (Breitengrad: -90 bis 90, Längengrad: -180 bis 180).");
    }
});

// ==========================================
// 3. DYNAMISCHE FORMULAR-LOGIK
// ==========================================

// Schieberegler für Flugdauer synchronisieren
const durationInput = document.getElementById('duration');
const durationVal = document.getElementById('duration-val');

if (durationInput && durationVal) {
    durationInput.addEventListener('input', (e) => {
        durationVal.textContent = parseFloat(e.target.value).toFixed(1) + " Std";
    });
}

// Datum und Uhrzeit auf aktuelle Werte vorbefüllen, falls leer
const timeInput = document.getElementById('start');
const dateInput = document.getElementById('date');

if (timeInput && dateInput) {
    const now = new Date();
    // Zeit im Format HH:MM
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    timeInput.value = `${hours}:${minutes}`;
    
    // Datum im Format YYYY-MM-DD
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;
}

// Array zur Speicherung gezeichneter Trajektorielinien auf der Karte
let trajectoryLayers = [];

// ==========================================
// 4. BERECHNUNG & SIMULATION (DUMMY/API STUB)
// ==========================================

const runButton = document.getElementById('run');
const statusBox = document.getElementById('status');
const resultsBox = document.getElementById('results');

runButton.addEventListener('click', () => {
    // 1. Status auf "Berechnet..." setzen
    statusBox.textContent = "Berechne...";
    statusBox.className = "status-message"; // Reset Klassen
    statusBox.style.color = "var(--orange)";

    // 2. Werte aus den Inputs sammeln
    const lat = parseFloat(latInput.value);
    const lon = parseFloat(lonInput.value);
    const date = dateInput.value;
    const time = timeInput.value;
    const duration = parseFloat(durationInput.value);
    const model = document.getElementById('model-display').value;

    // Ausgewählte Checkboxen sammeln
    const checkedAltitudes = [];
    document.querySelectorAll('#levels input[type="checkbox"]:checked').forEach(cb => {
        checkedAltitudes.push(cb.value);
    });

    if (checkedAltitudes.length === 0) {
        statusBox.textContent = "Fehler";
        statusBox.style.color = "var(--red)";
        alert("Bitte wähle mindestens eine Flughöhe aus!");
        return;
    }

    // Altsystem-Layer löschen, falls bereits Linien existieren
    trajectoryLayers.forEach(layer => map.removeLayer(layer));
    trajectoryLayers = [];

    // 3. Simulation eines API-Requests mit Timeout (Simulierte Trajektorienberechnung)
    setTimeout(() => {
        statusBox.textContent = "Erfolgreich";
        statusBox.style.color = "var(--green)";

        // Demodaten generieren: Wir zeichnen Linien auf Basis der ausgewählten Höhen
        // In der echten App ersetzen Sie dies durch den Fetch-Call Ihrer Wetter-API
        let tableRowsHtml = "";

        checkedAltitudes.forEach((altitude, index) => {
            // Generiere pseudo-zufällige Punkte, die sich je nach Höhe in Windrichtung bewegen
            const pathCoordinates = [[lat, lon]];
            const steps = duration * 2; // Alle 30 Min ein Punkt
            
            // Richtungsdrift je nach Höhe variieren (Simulierter Wind)
            const driftLat = (index + 1) * 0.015;
            const driftLon = (4 - index) * 0.025;

            let currentLat = lat;
            let currentLon = lon;

            for(let s = 1; s <= steps; s++) {
                currentLat += (Math.random() * 0.005) + driftLat;
                currentLon += (Math.random() * 0.015) + driftLon;
                pathCoordinates.push([currentLat, currentLon]);
            }

            // Farben aus Ihrem CSS-Theme für unterschiedliche Höhenlinien wählen
            const colors = ['var(--blue)', 'var(--violet)', 'var(--orange)', 'var(--yellow)'];
            const lineColor = colors[index % colors.length];

            // 4. Linie (Polyline) auf der Karte einzeichnen
            const polyline = L.polyline(pathCoordinates, {
                color: lineColor,
                weight: 4,
                opacity: 0.8
            }).addTo(map);
            
            // Linien-Referenz merken, um sie später löschen zu können
            trajectoryLayers.push(polyline);

            // Landemarker am Ende der Trajektorie setzen
            const finalPoint = pathCoordinates[pathCoordinates.length - 1];
            const landingMarker = L.circleMarker(finalPoint, {
                radius: 6,
                fillColor: lineColor,
                color: '#fff',
                weight: 2,
                fillOpacity: 1
            }).addTo(map);
            landingMarker.bindPopup(`<b>Landepunkt (${altitude} hPa)</b>`);
            trajectoryLayers.push(landingMarker);

            // Tabellenzeile für die Ergebnisspalte generieren
            tableRowsHtml += `
                <tr>
                    <td><b style="color: ${lineColor}">■</b> ${altitude} hPa</td>
                    <td>${finalPoint[0].toFixed(4)}</td>
                    <td>${finalPoint[1].toFixed(4)}</td>
                </tr>
            `;
        });

        // Alle Linien im sichtbaren Bereich der Karte fokussieren
        const group = new L.featureGroup(trajectoryLayers);
        map.fitBounds(group.getBounds().pad(0.1));

        // 5. Ergebnistabelle in das Panel (.results-column) schreiben
        resultsBox.innerHTML = `
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Höhenschicht</th>
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

    }, 1200); // 1.2 Sekunden Ladeanimation simulieren
});
