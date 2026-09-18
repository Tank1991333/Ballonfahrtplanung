"use strict";

const heights = [10, 80, 120, 180];
const colors = ["#1570a6", "#0b8b57", "#ea7d24", "#8b5cf6"];

const $ = (id) => document.getElementById(id);
const latInput = $("lat");
const lonInput = $("lon");
const displayLat = $("display-lat");
const displayLon = $("display-lon");
const currentLocationName = $("current-location-name");
const durationRange = $("duration");
const durationValue = $("duration-val");
const dateInput = $("date");
const startInput = $("start");
const searchInput = $("search-location");
const searchButton = $("search-button");
const runButton = $("run");
const statusMessage = $("status");
const resultsContainer = $("results");
const selectedCount = $("selected-count");
const levelsContainer = $("levels");
const mapStatusText = $("map-status-text");
const emptyResultsHtml = resultsContainer.innerHTML;

if (typeof L === "undefined") {
  $("map").innerHTML = '<div class="map-fallback">Die Karte konnte nicht geladen werden.</div>';
  setStatus("Leaflet wurde nicht geladen.", "error");
  throw new Error("Leaflet wurde nicht geladen.");
}

const startLatitude = Number.parseFloat(latInput.value) || 47.1696;
const startLongitude = Number.parseFloat(lonInput.value) || 16.0093;
const map = L.map("map").setView([startLatitude, startLongitude], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap"
}).addTo(map);
const startMarker = L.marker([startLatitude, startLongitude], { draggable: true }).addTo(map);
startMarker.bindPopup("<b>Startplatz</b><br>Marker verschieben oder auf die Karte klicken.").openPopup();
let simulationLayers = [];
if (mapStatusText) mapStatusText.textContent = "Karte geladen";

function setStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function formatAltitude(value) {
  return new Intl.NumberFormat("de-DE").format(value) + " m";
}

function updateCoordinates(latitude, longitude, locationName) {
  latInput.value = latitude.toFixed(5);
  lonInput.value = longitude.toFixed(5);
  displayLat.textContent = latitude.toFixed(5);
  displayLon.textContent = longitude.toFixed(5);
  if (locationName) {
    currentLocationName.textContent = locationName;
    startMarker.setPopupContent(`<b>Startplatz</b><br>${escapeHtml(locationName)}`);
  }
}

function clearSimulation() {
  simulationLayers.forEach((layer) => map.removeLayer(layer));
  simulationLayers = [];
}

function addHeightControls() {
  heights.forEach((height, index) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    const span = document.createElement("span");
    checkbox.type = "checkbox";
    checkbox.name = "altitude";
    checkbox.value = String(height);
    checkbox.checked = [10, 80, 120, 180].includes(height);
    span.textContent = formatAltitude(height);
    label.append(checkbox, span);
    levelsContainer.append(label);
  });
  levelsContainer.querySelectorAll("input").forEach((checkbox) => checkbox.addEventListener("change", updateSelectedCount));
  updateSelectedCount();
}

function updateSelectedCount() {
  selectedCount.textContent = String(levelsContainer.querySelectorAll("input:checked").length);
}

function selectHeights(values) {
  levelsContainer.querySelectorAll("input").forEach((checkbox) => {
    checkbox.checked = values.includes(Number(checkbox.value));
  });
  updateSelectedCount();
}

function toRadians(value) { return value * Math.PI / 180; }
function calculateDistance(a, b) {
  const radius = 6371;
  const dLat = toRadians(b[0] - a[0]);
  const dLon = toRadians(b[1] - a[1]);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a[0])) * Math.cos(toRadians(b[0])) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function movePosition(position, speedKmh, directionFrom, seconds) {
  const direction = toRadians(directionFrom + 180);
  const distance = speedKmh / 3.6 * seconds;
  const latitude = position[0] + distance * Math.cos(direction) / 111320;
  const longitude = position[1] + distance * Math.sin(direction) / (111320 * Math.max(0.01, Math.cos(toRadians(position[0]))));
  return [latitude, longitude];
}

function readHourlyValue(data, variable, timestamp) {
  const index = data.hourly.time.findIndex((time) => Date.parse(`${time}Z`) >= timestamp);
  const safeIndex = index < 0 ? data.hourly.time.length - 1 : index;
  return Number(data.hourly[variable][safeIndex]);
}

async function loadIconD2(latitude, longitude) {
  const variables = heights.flatMap((height) => [`wind_speed_${height}m`, `wind_direction_${height}m`]).join(",");
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=${variables}&models=icon_d2&forecast_days=2&timezone=UTC`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`ICON-D2-Abfrage fehlgeschlagen (${response.status})`);
  const data = await response.json();
  if (!data.hourly || !Array.isArray(data.hourly.time)) throw new Error("Die ICON-D2-Antwort ist unvollständig.");
  return data;
}

async function searchLocation() {
  const query = searchInput.value.trim();
  if (!query) return setStatus("Bitte einen Ort oder eine Postleitzahl eingeben.", "error");
  searchButton.disabled = true;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=at&accept-language=de&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Ortssuche fehlgeschlagen");
    const data = await response.json();
    if (!data.length) throw new Error("Ort nicht gefunden");
    const latitude = Number(data[0].lat);
    const longitude = Number(data[0].lon);
    startMarker.setLatLng([latitude, longitude]);
    map.setView([latitude, longitude], 13);
    updateCoordinates(latitude, longitude, data[0].display_name || query);
    setStatus("Startort wurde aktualisiert.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    searchButton.disabled = false;
  }
}

async function runSimulation() {
  const latitude = Number(latInput.value);
  const longitude = Number(lonInput.value);
  const duration = Number(durationRange.value);
  const selected = Array.from(levelsContainer.querySelectorAll("input:checked"), (checkbox) => Number(checkbox.value));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return setStatus("Die Startkoordinaten sind ungültig.", "error");
  if (!selected.length) return setStatus("Bitte mindestens eine Höhe auswählen.", "error");
  clearSimulation();
  runButton.disabled = true;
  runButton.textContent = "ICON-D2 wird geladen...";
  setStatus("Winddaten aus dem ICON-D2-Modell werden geladen...", "loading");
  try {
    const forecast = await loadIconD2(latitude, longitude);
    const startTimestamp = Date.parse(`${dateInput.value}T${startInput.value || "07:00"}:00Z`);
    if (!Number.isFinite(startTimestamp)) throw new Error("Datum oder Startzeit ist ungültig.");
    const allPoints = [];
    let rows = "";
    selected.forEach((height) => {
      let position = [latitude, longitude];
      const points = [position];
      const steps = Math.max(1, Math.ceil(duration * 4));
      for (let step = 0; step < steps; step += 1) {
        const timestamp = startTimestamp + step * 15 * 60 * 1000;
        const speed = readHourlyValue(forecast, `wind_speed_${height}m`, timestamp);
        const direction = readHourlyValue(forecast, `wind_direction_${height}m`, timestamp);
        position = movePosition(position, speed, direction, 15 * 60);
        points.push(position);
      }
      const color = colors[heights.indexOf(height)];
      const line = L.polyline(points, { color, weight: 4, opacity: 0.82, bubblingMouseEvents: false }).addTo(map).bindPopup(`<b>ICON-D2-Route</b><br>${formatAltitude(height)}`);
      const end = points[points.length - 1];
      const marker = L.circleMarker(end, { radius: 7, fillColor: color, color: "#fff", weight: 2, fillOpacity: 1, bubblingMouseEvents: false }).addTo(map);
      simulationLayers.push(line, marker);
      allPoints.push(...points);
      rows += `<tr><td><span class="result-color" style="background:${color}"></span>${formatAltitude(height)}</td><td>${end[0].toFixed(5)}</td><td>${end[1].toFixed(5)}</td><td>${calculateDistance([latitude, longitude], end).toFixed(2)} km</td></tr>`;
    });
    resultsContainer.innerHTML = `<div class="table-wrapper"><table><thead><tr><th>Höhe</th><th>Lat. Ende</th><th>Lon. Ende</th><th>Entfernung</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    const bounds = L.latLngBounds(allPoints);
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.12), { maxZoom: 13 });
    setStatus(`${selected.length} ICON-D2-Trajektorien wurden berechnet.`, "success");
  } catch (error) {
    clearSimulation();
    resultsContainer.innerHTML = emptyResultsHtml;
    setStatus(`${error.message} Bitte Datum innerhalb der nächsten 48 Stunden wählen.`, "error");
  } finally {
    runButton.disabled = false;
    runButton.textContent = "Simulation ausführen";
  }
}

startMarker.on("dragend", () => {
  const point = startMarker.getLatLng();
  updateCoordinates(point.lat, point.lng, "Manuell gewählter Startpunkt");
});
map.on("click", (event) => {
  startMarker.setLatLng(event.latlng);
  updateCoordinates(event.latlng.lat, event.latlng.lng, "Manuell gewählter Startpunkt");
});

const now = new Date();
dateInput.value = now.toISOString().slice(0, 10);
durationRange.addEventListener("input", () => { durationValue.textContent = Number(durationRange.value).toFixed(1).replace(".", ",") + " Stunden"; });
searchButton.addEventListener("click", searchLocation);
searchInput.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); searchLocation(); } });
runButton.addEventListener("click", runSimulation);
$("btn-all-levels").addEventListener("click", () => selectHeights(heights));
$("btn-no-levels").addEventListener("click", () => selectHeights([]));
$("btn-balloon-levels").addEventListener("click", () => selectHeights(heights));
addHeightControls();
