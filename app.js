"use strict";

if (typeof L === "undefined") {
  const mapElement = document.getElementById("map");
  if (mapElement) mapElement.innerHTML = '<div class="map-fallback">Die Karte konnte nicht geladen werden. Bitte Internetverbindung oder Browser-Schutz prüfen.</div>';
  const failedMessage = document.getElementById("map-message");
  const failedText = document.getElementById("map-status-text");
  if (failedMessage) failedMessage.classList.add("is-error");
  if (failedText) failedText.textContent = "Karte nicht verfügbar";
  throw new Error("Leaflet wurde nicht geladen.");
}

const heights = [100, 300, 500, 800, 1000, 1500, 2000, 3000];
const defaultHeights = [100, 500, 1000, 2000];
const balloonHeights = heights.filter(height => height <= 2000);

const latInput = document.getElementById("lat");
const lonInput = document.getElementById("lon");
const displayLat = document.getElementById("display-lat");
const displayLon = document.getElementById("display-lon");
const currentLocationName = document.getElementById("current-location-name");
const durationRange = document.getElementById("duration");
const durationValue = document.getElementById("duration-val");
const dateInput = document.getElementById("date");
const searchInput = document.getElementById("search-location");
const searchButton = document.getElementById("search-button");
const runButton = document.getElementById("run");
const statusMessage = document.getElementById("status");
const resultsContainer = document.getElementById("results");
const selectedCount = document.getElementById("selected-count");
const levelsContainer = document.getElementById("levels");
const mapStatusText = document.getElementById("map-status-text");
const emptyResultsHtml = resultsContainer.innerHTML;

heights.forEach(height => {
  const label = document.createElement("label");
  const checkbox = document.createElement("input");
  const span = document.createElement("span");
  checkbox.type = "checkbox";
  checkbox.name = "altitude";
  checkbox.value = String(height);
  checkbox.checked = defaultHeights.includes(height);
  span.textContent = new Intl.NumberFormat("de-DE").format(height) + " m";
  label.append(checkbox, span);
  levelsContainer.append(label);
});

const altitudeCheckboxes = Array.from(levelsContainer.querySelectorAll('input[type="checkbox"]'));
const startLatitude = Number.parseFloat(latInput.value) || 47.1696;
const startLongitude = Number.parseFloat(lonInput.value) || 16.0093;
const map = L.map("map", { zoomControl: true }).setView([startLatitude, startLongitude], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
const startMarker = L.marker([startLatitude, startLongitude], { draggable: true }).addTo(map);
startMarker.bindPopup("<b>Startplatz</b><br>Marker verschieben oder auf die Karte klicken.").openPopup();
let simulationLayers = [];
if (mapStatusText) mapStatusText.textContent = "Karte geladen";

window.addEventListener("load", () => setTimeout(() => map.invalidateSize(), 150));

function updateCoordinates(latitude, longitude, locationName) {
  latInput.value = latitude.toFixed(5);
  lonInput.value = longitude.toFixed(5);
  displayLat.textContent = latitude.toFixed(5);
  displayLon.textContent = longitude.toFixed(5);
  if (locationName) {
    currentLocationName.textContent = locationName;
    startMarker.setPopupContent("<b>Startplatz</b><br>" + escapeHtml(locationName));
  }
}

function selectHeights(values) {
  altitudeCheckboxes.forEach(cb => { cb.checked = values.includes(Number(cb.value)); });
  updateSelectedCount();
}

function updateSelectedCount() {
  selectedCount.textContent = String(levelsContainer.querySelectorAll('input[type="checkbox"]:checked').length);
}

function setStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = "status-message " + type;
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function formatAltitude(altitude) {
  return new Intl.NumberFormat("de-DE").format(altitude) + " m";
}

function clearSimulationLayers() {
  simulationLayers.forEach(layer => map.removeLayer(layer));
  simulationLayers = [];
}

function resetResultsIfStale() {
  if (!simulationLayers.length) return false;
  clearSimulationLayers();
  resultsContainer.innerHTML = emptyResultsHtml;
  return true;
}

function toRadians(degrees) { return degrees * Math.PI / 180; }
function calculateDistance(lat1, lon1, lat2, lon2) {
  const r = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function notifyStartChanged() {
  if (resetResultsIfStale()) setStatus("Startpunkt geändert. Bitte die Simulation erneut ausführen.", "info");
}

startMarker.on("dragend", () => {
  const p = startMarker.getLatLng();
  updateCoordinates(p.lat, p.lng, "Manuell gewählter Startpunkt");
  notifyStartChanged();
});
map.on("click", event => {
  startMarker.setLatLng(event.latlng);
  updateCoordinates(event.latlng.lat, event.latlng.lng, "Manuell gewählter Startpunkt");
  notifyStartChanged();
});

const now = new Date();
const offset = now.getTimezoneOffset() * 60000;
dateInput.value = new Date(now.getTime() - offset).toISOString().split("T")[0];
durationRange.addEventListener("input", event => {
  durationValue.textContent = Number.parseFloat(event.target.value).toFixed(1).replace(".", ",") + " Stunden";
});
altitudeCheckboxes.forEach(cb => cb.addEventListener("change", updateSelectedCount));
document.getElementById("btn-all-levels").addEventListener("click", () => { selectHeights(heights); setStatus("Alle Höhen wurden ausgewählt.", "success"); });
document.getElementById("btn-no-levels").addEventListener("click", () => { selectHeights([]); setStatus("Die Höhenauswahl wurde geleert.", "success"); });
document.getElementById("btn-balloon-levels").addEventListener("click", () => { selectHeights(balloonHeights); setStatus("Höhen von " + formatAltitude(Math.min(...balloonHeights)) + " bis " + formatAltitude(Math.max(...balloonHeights)) + " wurden ausgewählt.", "success"); });
updateSelectedCount();

async function searchLocation() {
  const query = searchInput.value.trim();
  if (!query) { setStatus("Bitte einen Ort oder eine Postleitzahl eingeben.", "error"); return; }
  const original = searchButton.textContent;
  searchButton.disabled = true;
  searchButton.textContent = "Suche...";
  try {
    const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=at&accept-language=de&q=" + encodeURIComponent(query);
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Ortssuche fehlgeschlagen");
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) { setStatus("Der Ort wurde in Österreich nicht gefunden.", "error"); return; }
    const latitude = Number.parseFloat(data[0].lat);
    const longitude = Number.parseFloat(data[0].lon);
    const label = data[0].display_name || query;
    startMarker.setLatLng([latitude, longitude]);
    map.setView([latitude, longitude], 13);
    updateCoordinates(latitude, longitude, label);
    startMarker.openPopup();
    resetResultsIfStale();
    setStatus("Startort wurde aktualisiert.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Ortssuche nicht verfügbar. Startpunkt bitte auf der Karte wählen.", "error");
  } finally {
    searchButton.disabled = false;
    searchButton.textContent = original;
  }
}
searchButton.addEventListener("click", searchLocation);
searchInput.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); searchLocation(); } });

runButton.addEventListener("click", () => {
  const latitude = Number.parseFloat(latInput.value);
  const longitude = Number.parseFloat(lonInput.value);
  const duration = Number.parseFloat(durationRange.value);
  const selected = Array.from(levelsContainer.querySelectorAll('input[type="checkbox"]:checked')).map(cb => Number(cb.value)).sort((a,b) => a-b);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return setStatus("Die Startkoordinaten sind ungültig.", "error");
  if (!selected.length) return setStatus("Bitte mindestens eine Höhe auswählen.", "error");
  runButton.disabled = true;
  runButton.textContent = "Simulation läuft...";
  setStatus("Trajektorien werden berechnet...", "loading");
  clearSimulationLayers();
  setTimeout(() => {
    try {
      const colors = ["#1570a6","#0b8b57","#ea7d24","#8b5cf6","#dc2626","#0891b2","#ca8a04","#db2777","#4f46e5","#059669","#d97706","#7c3aed"];
      let rows = "";
      selected.forEach(altitude => {
        const points = [[latitude, longitude]];
        const steps = Math.max(2, Math.round(duration * 4));
        const factor = altitude / 3000;
        // Richtung und Kurve hängen nur von der Höhe ab, nicht von der Auswahl.
        const angle = (45 + factor * 55) * Math.PI / 180;
        const distance = 0.0035 + factor * 0.0065;
        let lat = latitude, lon = longitude;
        for (let step = 1; step <= steps; step++) {
          const curve = Math.sin(step / steps * Math.PI) * 0.00025 * (1 + factor);
          lat += Math.cos(angle) * distance + curve;
          // Längengrade werden mit der Breite schmaler: Ost-West-Anteil entsprechend korrigieren.
          lon += Math.sin(angle) * distance / Math.cos(toRadians(lat)) - curve * 0.5;
          points.push([lat, lon]);
        }
        // Feste Farbe je Höhe, unabhängig von der aktuellen Auswahl.
        const color = colors[heights.indexOf(altitude) % colors.length];
        // bubblingMouseEvents: false verhindert, dass ein Klick auf die Route den Startpunkt verschiebt.
        const line = L.polyline(points, { color, weight: 4, opacity: .82, bubblingMouseEvents: false }).addTo(map).bindPopup("<b>Simulierte Route</b><br>" + formatAltitude(altitude));
        simulationLayers.push(line);
        const end = points[points.length - 1];
        const marker = L.circleMarker(end, { radius: 7, fillColor: color, color: "#fff", weight: 2, fillOpacity: 1, bubblingMouseEvents: false }).addTo(map).bindPopup("<b>Simulierter Endpunkt</b><br>Höhe: " + formatAltitude(altitude));
        simulationLayers.push(marker);
        rows += `<tr><td><span class="result-color" style="background:${color}"></span>${formatAltitude(altitude)}</td><td>${end[0].toFixed(5)}</td><td>${end[1].toFixed(5)}</td><td>${calculateDistance(latitude, longitude, end[0], end[1]).toFixed(1)} km</td></tr>`;
      });
      resultsContainer.innerHTML = `<div class="table-wrapper"><table><thead><tr><th>Höhe</th><th>Lat. Ende</th><th>Lon. Ende</th><th>Entfernung</th></tr></thead><tbody>${rows}</tbody></table></div>`;
      const bounds = L.featureGroup(simulationLayers).getBounds();
      if (bounds.isValid()) map.fitBounds(bounds.pad(.12), { maxZoom: 13 });
      setStatus(selected.length + " Trajektorien wurden berechnet.", "success");
    } catch (error) {
      console.error(error);
      clearSimulationLayers();
      resultsContainer.innerHTML = emptyResultsHtml;
      setStatus("Die Berechnung ist fehlgeschlagen. Bitte erneut versuchen.", "error");
    } finally {
      runButton.disabled = false;
      runButton.textContent = "Simulation ausführen";
    }
  }, 400);
});
