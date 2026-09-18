"use strict";

const heightDefinitions = [
  { height: 10, model: "icon_d2", sourceLabel: "ICON-D2" },
  { height: 80, model: "icon_d2", sourceLabel: "ICON-D2" },
  { height: 120, model: "icon_d2", sourceLabel: "ICON-D2" },
  { height: 180, model: "icon_d2", sourceLabel: "ICON-D2" },
  { height: 300, model: "gfs", sourceLabel: "GFS (925 hPa)", level: "925hPa" },
  { height: 500, model: "gfs", sourceLabel: "GFS (925 hPa)", level: "925hPa" },
  { height: 800, model: "gfs", sourceLabel: "GFS (850 hPa)", level: "850hPa" },
  { height: 1000, model: "gfs", sourceLabel: "GFS (850 hPa)", level: "850hPa" },
  { height: 1500, model: "gfs", sourceLabel: "GFS (850 hPa)", level: "850hPa" },
  { height: 2000, model: "gfs", sourceLabel: "GFS (700 hPa)", level: "700hPa" },
  { height: 3000, model: "gfs", sourceLabel: "GFS (500 hPa)", level: "500hPa" }
];
const heights = heightDefinitions.map((entry) => entry.height);
const selectedDefaults = [10, 80, 120, 180];
const colors = ["#1570a6", "#0b8b57", "#ea7d24", "#8b5cf6", "#dc2626", "#0891b2", "#ca8a04", "#db2777", "#4f46e5", "#059669", "#d97706"];
const heightByValue = new Map(heightDefinitions.map((entry) => [entry.height, entry]));

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
  if (statusMessage) {
    statusMessage.className = "status-message error";
    statusMessage.textContent = "Leaflet wurde nicht geladen.";
  }
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
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatAltitude(value) {
  return `${new Intl.NumberFormat("de-DE").format(value)} m`;
}

function formatWindSpeed(value) {
  const speed = Math.max(0, Number(value) || 0);
  return `${speed.toFixed(1).replace(".", ",")} km/h`;
}

function formatWindDirection(value) {
  const degrees = ((Number(value) || 0) % 360 + 360) % 360;
  const directions = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"];
  return `${Math.round(degrees)}° (${directions[Math.round(degrees / 45) % 8]})`;
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
  heights.forEach((height) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    const span = document.createElement("span");
    checkbox.type = "checkbox";
    checkbox.name = "altitude";
    checkbox.value = String(height);
    checkbox.checked = selectedDefaults.includes(height);
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

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function calculateDistance(a, b) {
  const radius = 6371;
  const dLat = toRadians(b[0] - a[0]);
  const dLon = toRadians(b[1] - a[1]);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a[0])) * Math.cos(toRadians(b[0])) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function movePosition(position, speedKmh, directionFrom, seconds) {
  const distance = (Math.max(0, speedKmh) / 3.6) * seconds;
  const direction = toRadians((directionFrom + 180) % 360);
  return [
    position[0] + (distance * Math.cos(direction)) / 111320,
    position[1] + (distance * Math.sin(direction)) / (111320 * Math.max(0.01, Math.cos(toRadians(position[0]))))
  ];
}

function readInterpolatedHourlyValue(data, variable, timestamp) {
  const times = Array.isArray(data?.hourly?.time) ? data.hourly.time.map((time) => Date.parse(`${time}Z`)) : [];
  const values = Array.isArray(data?.hourly?.[variable]) ? data.hourly[variable].map(Number) : [];
  if (!times.length || !values.length) return 0;

  if (timestamp <= times[0]) return Math.max(0, values[0] || 0);
  if (timestamp >= times[times.length - 1]) return Math.max(0, values[values.length - 1] || 0);

  const upperIndex = times.findIndex((time) => time >= timestamp);
  const lowerIndex = upperIndex - 1;
  const ratio = (timestamp - times[lowerIndex]) / (times[upperIndex] - times[lowerIndex]);
  const lower = Number.isFinite(values[lowerIndex]) ? values[lowerIndex] : 0;
  const upper = Number.isFinite(values[upperIndex]) ? values[upperIndex] : lower;
  return Math.max(0, lower + (upper - lower) * ratio);
}

function getForecastVariableName(definition, type) {
  if (definition.model === "icon_d2") {
    return `${type}_${definition.height}m`;
  }
  return `${type}_${definition.level}`;
}

async function loadForecastForModel(model, latitude, longitude, variables) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=${variables.join(",")}&models=${model}&forecast_days=2&timezone=UTC`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Wetterdaten (${model}) konnten nicht geladen werden (${response.status}).`);
  const data = await response.json();
  if (!data.hourly || !Array.isArray(data.hourly.time)) throw new Error(`Die ${model}-Antwort ist unvollständig.`);
  return data;
}

async function loadWeatherForSelection(latitude, longitude, selectedHeights) {
  const requirementsByModel = new Map();

  selectedHeights.forEach((height) => {
    const definition = heightByValue.get(height);
    if (!definition) return;
    if (!requirementsByModel.has(definition.model)) {
      requirementsByModel.set(definition.model, []);
    }
    const variableSet = requirementsByModel.get(definition.model);
    variableSet.push(getForecastVariableName(definition, "wind_speed"));
    variableSet.push(getForecastVariableName(definition, "wind_direction"));
  });

  const forecastMap = new Map();
  const work = Array.from(requirementsByModel.entries()).map(async ([model, variables]) => {
    const uniqueVariables = [...new Set(variables)];
    const forecast = await loadForecastForModel(model, latitude, longitude, uniqueVariables);
    forecastMap.set(model, forecast);
  });

  await Promise.all(work);
  return forecastMap;
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
    setStatus(error.message || "Ortssuche fehlgeschlagen.", "error");
  } finally {
    searchButton.disabled = false;
  }
}

function buildTrajectory(height, latitude, longitude, startTimestamp, durationHours, forecast, model, level) {
  const points = [[latitude, longitude]];
  const stepSeconds = 15 * 60;
  const steps = Math.max(1, Math.ceil((durationHours * 3600) / stepSeconds));
  let current = [latitude, longitude];

  for (let step = 1; step <= steps; step += 1) {
    const timestamp = startTimestamp + step * stepSeconds * 1000;
    const variableName = model === "icon_d2" ? `wind_speed_${height}m` : `wind_speed_${level}`;
    const directionName = model === "icon_d2" ? `wind_direction_${height}m` : `wind_direction_${level}`;
    const speed = readInterpolatedHourlyValue(forecast, variableName, timestamp);
    const direction = readInterpolatedHourlyValue(forecast, directionName, timestamp);
    current = movePosition(current, speed, direction, stepSeconds);
    points.push(current);
  }
  return points;
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
  runButton.textContent = "Wetterdaten werden geladen...";
  setStatus("Winddaten werden geladen...", "loading");

  try {
    const forecastMap = await loadWeatherForSelection(latitude, longitude, selected);
    const startTimestamp = Date.parse(`${dateInput.value}T${startInput.value || "07:00"}:00Z`);
    if (!Number.isFinite(startTimestamp)) throw new Error("Datum oder Startzeit ist ungültig.");

    const allPoints = [];
    let rows = "";

    selected.forEach((height) => {
      const definition = heightByValue.get(height);
      if (!definition) return;
      const forecast = forecastMap.get(definition.model);
      const points = buildTrajectory(height, latitude, longitude, startTimestamp, duration, forecast, definition.model, definition.level || `${height}m`);
      const color = colors[heights.indexOf(height)] || colors[0];
      const end = points[points.length - 1];
      const endTimestamp = startTimestamp + (points.length - 1) * 15 * 60 * 1000;
      const speedName = getForecastVariableName(definition, "wind_speed");
      const directionName = getForecastVariableName(definition, "wind_direction");
      const endSpeed = readInterpolatedHourlyValue(forecast, speedName, endTimestamp);
      const endDirection = readInterpolatedHourlyValue(forecast, directionName, endTimestamp);
      const line = L.polyline(points, { color, weight: 4, opacity: 0.82, bubblingMouseEvents: false }).addTo(map).bindPopup(`<b>Windroute</b><br>${formatAltitude(height)}<br>${definition.sourceLabel}`);
      const marker = L.circleMarker(end, { radius: 7, fillColor: color, color: "#fff", weight: 2, fillOpacity: 1, bubblingMouseEvents: false }).addTo(map);

      simulationLayers.push(line, marker);
      allPoints.push(...points);
      rows += `<tr><td><span class="result-color" style="background:${color}"></span>${formatAltitude(height)}</td><td>${definition.sourceLabel}</td><td>${formatWindDirection(endDirection)}</td><td>${formatWindSpeed(endSpeed)}</td><td>${calculateDistance([latitude, longitude], end).toFixed(2)} km</td></tr>`;
    });

    resultsContainer.innerHTML = `<div class="table-wrapper"><table><thead><tr><th>Höhe</th><th>Modell</th><th>Windrichtung</th><th>Windgeschwindigkeit</th><th>Entfernung</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    const bounds = L.latLngBounds(allPoints);
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.12), { maxZoom: 13 });
    setStatus(`${selected.length} Trajektorien wurden berechnet.`, "success");
  } catch (error) {
    clearSimulation();
    resultsContainer.innerHTML = emptyResultsHtml;
    setStatus(`${error.message || "Berechnung fehlgeschlagen."} Bitte Datum innerhalb der nächsten 48 Stunden wählen.`, "error");
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
durationRange.addEventListener("input", () => {
  durationValue.textContent = `${Number(durationRange.value).toFixed(1).replace(".", ",")} Stunden`;
});
searchButton.addEventListener("click", searchLocation);
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchLocation();
  }
});
runButton.addEventListener("click", runSimulation);
$("btn-all-levels").addEventListener("click", () => selectHeights(heights));
$("btn-no-levels").addEventListener("click", () => selectHeights([]));
$("btn-balloon-levels").addEventListener("click", () => selectHeights(selectedDefaults));
addHeightControls();
window.addEventListener("load", () => setTimeout(() => map.invalidateSize(), 150));
setStatus("Bereit.", "success");
