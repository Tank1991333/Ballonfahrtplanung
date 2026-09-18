"use strict";

const definitions = [
  [10, "icon_d2", "ICON-D2"],
  [80, "icon_d2", "ICON-D2"],
  [120, "icon_d2", "ICON-D2"],
  [180, "icon_d2", "ICON-D2"],
  [200, "gfs_seamless", "GFS (925 hPa)", "925hPa"],
  [300, "gfs_seamless", "GFS (925 hPa)", "925hPa"],
  [500, "gfs_seamless", "GFS (925 hPa)", "925hPa"],
  [800, "gfs_seamless", "GFS (850 hPa)", "850hPa"],
  [1000, "gfs_seamless", "GFS (850 hPa)", "850hPa"],
  [1500, "gfs_seamless", "GFS (850 hPa)", "850hPa"],
  [2000, "gfs_seamless", "GFS (700 hPa)", "700hPa"],
  [3000, "gfs_seamless", "GFS (500 hPa)", "500hPa"]
].map(([height, model, sourceLabel, level]) => ({ height, model, sourceLabel, level }));

const heights = definitions.map((definition) => definition.height);
const byHeight = new Map(definitions.map((definition) => [definition.height, definition]));
const defaults = [10, 80, 120, 180];
const colors = ["#1570a6", "#0b8b57", "#ea7d24", "#8b5cf6", "#dc2626", "#0891b2", "#ca8a04", "#db2777", "#4f46e5", "#059669", "#d97706"];
const $ = (id) => document.getElementById(id);
const latInput = $("lat");
const lonInput = $("lon");
const displayZone = $("display-zone");
const displayEasting = $("display-easting");
const displayNorthing = $("display-northing");
const locationName = $("current-location-name");
const duration = $("duration");
const durationValue = $("duration-val");
const dateInput = $("date");
const startInput = $("start");
const searchInput = $("search-location");
const searchButton = $("search-button");
const runButton = $("run");
const status = $("status");
const results = $("results");
const count = $("selected-count");
const levels = $("levels");
const emptyResults = results.innerHTML;
let layers = [];
let requestId = 0;

if (typeof L === "undefined") throw new Error("Leaflet wurde nicht geladen.");

const lat0 = Number(latInput.value) || 47.1696;
const lon0 = Number(lonInput.value) || 16.0093;
const map = L.map("map").setView([lat0, lon0], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap"
}).addTo(map);

const marker = L.marker([lat0, lon0], { draggable: true }).addTo(map);
marker.bindPopup("<b>Startplatz</b><br>Marker verschieben oder auf die Karte klicken.").openPopup();

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

function formatSpeed(value) {
  return `${Math.max(0, Number(value) || 0).toFixed(1).replace(".", ",")} km/h`;
}

function formatDirection(value) {
  const degrees = ((Number(value) || 0) % 360 + 360) % 360;
  return `${Math.round(degrees)}° (${["N", "NO", "O", "SO", "S", "SW", "W", "NW"][Math.round(degrees / 45) % 8]})`;
}

function setStatus(message, type) {
  status.textContent = message;
  status.className = `status-message ${type}`;
}

function updateUtm(latitude, longitude) {
  const zone = Math.floor((longitude + 180) / 6) + 1;
  const centralMeridian = (zone - 1) * 6 - 177;
  const a = 6378137;
  const eccentricitySquared = 0.00669438;
  const k0 = 0.9996;
  const lat = latitude * Math.PI / 180;
  const lon = longitude * Math.PI / 180;
  const central = centralMeridian * Math.PI / 180;
  const ep2 = eccentricitySquared / (1 - eccentricitySquared);
  const n = a / Math.sqrt(1 - eccentricitySquared * Math.sin(lat) ** 2);
  const t = Math.tan(lat) ** 2;
  const c = ep2 * Math.cos(lat) ** 2;
  const aa = Math.cos(lat) * (lon - central);
  const m = a * ((1 - eccentricitySquared / 4 - 3 * eccentricitySquared ** 2 / 64 - 5 * eccentricitySquared ** 3 / 256) * lat - (3 * eccentricitySquared / 8 + 3 * eccentricitySquared ** 2 / 32 + 45 * eccentricitySquared ** 3 / 1024) * Math.sin(2 * lat) + (15 * eccentricitySquared ** 2 / 256 + 45 * eccentricitySquared ** 3 / 1024) * Math.sin(4 * lat) - (35 * eccentricitySquared ** 3 / 3072) * Math.sin(6 * lat));
  const easting = k0 * n * (aa + (1 - t + c) * aa ** 3 / 6 + (5 - 18 * t + t ** 2 + 72 * c - 58 * ep2) * aa ** 5 / 120) + 500000;
  const northing = k0 * (m + n * Math.tan(lat) * (aa ** 2 / 2 + (5 - t + 9 * c + 4 * c ** 2) * aa ** 4 / 24 + (61 - 58 * t + t ** 2 + 600 * c - 330 * ep2) * aa ** 6 / 720));

  displayZone.textContent = `${zone}${latitude < 0 ? "S" : "N"}`;
  displayEasting.textContent = `${Math.round(easting)} m`;
  displayNorthing.textContent = `${Math.round(northing)} m`;
}

function updateLocation(latitude, longitude, name) {
  latInput.value = latitude.toFixed(5);
  lonInput.value = longitude.toFixed(5);
  updateUtm(latitude, longitude);
  if (name) {
    locationName.textContent = name;
    marker.setPopupContent(`<b>Startplatz</b><br>${escapeHtml(name)}`);
  }
}

function clearLayers() {
  layers.forEach((layer) => map.removeLayer(layer));
  layers = [];
}

function resetResults(message) {
  requestId += 1;
  clearLayers();
  results.innerHTML = emptyResults;
  setStatus(message, "info");
}

function selectHeights(values) {
  levels.querySelectorAll("input").forEach((input) => {
    input.checked = values.includes(Number(input.value));
  });
  updateCount();
}

function updateCount() {
  count.textContent = String(levels.querySelectorAll("input:checked").length);
}

function distance(a, b) {
  const r = 6371;
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLon = (b[1] - a[1]) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function move(position, speed, direction, seconds) {
  const d = Math.max(0, speed) / 3.6 * seconds;
  const angle = (direction + 180) * Math.PI / 180;
  return [
    position[0] + d * Math.cos(angle) / 111320,
    position[1] + d * Math.sin(angle) / (111320 * Math.max(0.01, Math.cos(position[0] * Math.PI / 180)))
  ];
}

function valueAt(data, variable, timestamp) {
  const times = (data.hourly?.time || []).map((time) => Date.parse(`${time}Z`));
  const values = data.hourly?.[variable] || [];

  if (!times.length || !values.length) {
    throw new Error(`Keine Daten für ${variable} erhalten.`);
  }

  let index = times.findIndex((time) => time >= timestamp);
  if (index < 0) index = times.length - 1;
  if (index === 0) return Number(values[0]) || 0;

  const previous = times[index - 1];
  const current = times[index];
  const ratio = (timestamp - previous) / (current - previous || 1);
  const beforeValue = Number(values[index - 1]) || 0;
  const afterValue = Number(values[index]) || 0;

  return beforeValue + (afterValue - beforeValue) * ratio;
}

function localTimestamp(date, time) {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, min).getTime();
}

function variable(definition, type) {
  if (definition.model === "icon_d2") {
    return `${type}_${definition.height}m`;
  }
  return `${type}_${definition.level}`;
}

async function load(model, lat, lon, variables) {
  const uniqueVariables = [...new Set(variables)];
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${uniqueVariables.join(",")}&models=${model}&forecast_days=2&timezone=UTC`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Wetterdaten (${model}) konnten nicht geladen werden (${response.status}).`);
  }
  return response.json();
}

async function forecasts(lat, lon, selected) {
  const groups = new Map();

  selected.forEach((height) => {
    const definition = byHeight.get(height);
    if (!groups.has(definition.model)) {
      groups.set(definition.model, []);
    }
    groups.get(definition.model).push(
      variable(definition, "windspeed"),
      variable(definition, "winddirection")
    );
  });

  const forecastData = new Map();
  await Promise.all([...groups].map(async ([model, variables]) => {
    forecastData.set(model, await load(model, lat, lon, variables));
  }));

  return forecastData;
}

function build(definition, forecast, lat, lon, start, hours) {
  let position = [lat, lon];
  const points = [position];
  const seconds = 900;
  const steps = Math.ceil(hours * 3600 / seconds);

  for (let step = 1; step <= steps; step += 1) {
    const timestamp = start + step * seconds * 1000;
    const speed = valueAt(forecast, variable(definition, "windspeed"), timestamp);
    const direction = valueAt(forecast, variable(definition, "winddirection"), timestamp);
    position = move(position, speed, direction, seconds);
    points.push(position);
  }

  return points;
}

async function runSimulation() {
  const lat = Number(latInput.value);
  const lon = Number(lonInput.value);
  const hours = Number(duration.value);
  const selected = [...levels.querySelectorAll("input:checked")].map((input) => Number(input.value));
  const currentRequest = ++requestId;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return setStatus("Die Startkoordinaten sind ungültig.", "error");
  }

  if (!selected.length) {
    return setStatus("Bitte mindestens eine Höhe auswählen.", "error");
  }

  const start = localTimestamp(dateInput.value, startInput.value || "07:00");
  if (!Number.isFinite(start)) {
    return setStatus("Datum oder Startzeit ist ungültig.", "error");
  }

  clearLayers();
  runButton.disabled = true;
  runButton.textContent = "Wetterdaten werden geladen...";
  setStatus("ICON-D2- und GFS-Winddaten werden geladen...", "loading");

  try {
    const data = await forecasts(lat, lon, selected);
    if (currentRequest !== requestId) return;

    let rows = "";
    const allPoints = [];

    selected.forEach((height, index) => {
      const definition = byHeight.get(height);
      const forecast = data.get(definition.model);
      const points = build(definition, forecast, lat, lon, start, hours);
      const end = points.at(-1);
      const endTime = start + (points.length - 1) * 900000;
      const speed = valueAt(forecast, variable(definition, "windspeed"), endTime);
      const direction = valueAt(forecast, variable(definition, "winddirection"), endTime);
      const color = colors[index % colors.length];

      const line = L.polyline(points, {
        color,
        weight: 4,
        opacity: 0.82,
        bubblingMouseEvents: false
      }).addTo(map).bindPopup(`<b>Windroute</b><br>${formatAltitude(height)}<br>${definition.sourceLabel}`);

      const endMarker = L.circleMarker(end, {
        radius: 7,
        fillColor: color,
        color: "#fff",
        weight: 2,
        fillOpacity: 1,
        bubblingMouseEvents: false
      }).addTo(map);

      layers.push(line, endMarker);
      allPoints.push(...points);

      rows += `<tr><td><span class="result-color" style="background:${color}"></span>${formatAltitude(height)}</td><td>${definition.sourceLabel}</td><td>${formatDirection(direction)}</td><td>${formatSpeed(speed)}</td><td>${distance([lat, lon], end).toFixed(2)} km</td></tr>`;
    });

    results.innerHTML = `<div class="table-wrapper"><table><thead><tr><th>Höhe</th><th>Modell / Druckniveau</th><th>Windrichtung</th><th>Windgeschwindigkeit</th><th>Entfernung</th></tr></thead><tbody>${rows}</tbody></table></div>`;

    const bounds = L.latLngBounds(allPoints);
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.12), { maxZoom: 13 });
    }

    setStatus(`${selected.length} Trajektorien mit echten Modellvorhersagen berechnet.`, "success");
  } catch (error) {
    if (currentRequest === requestId) {
      clearLayers();
      results.innerHTML = emptyResults;
      setStatus(error.message || "Berechnung fehlgeschlagen.", "error");
    }
  } finally {
    if (currentRequest === requestId) {
      runButton.disabled = false;
      runButton.textContent = "Simulation ausführen";
    }
  }
}

function searchLocation() {
  const query = searchInput.value.trim();
  if (!query) {
    return setStatus("Bitte einen Ort oder eine Postleitzahl eingeben.", "error");
  }

  searchButton.disabled = true;

  fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=at&accept-language=de&q=${encodeURIComponent(query)}`, {
    headers: { Accept: "application/json" }
  })
    .then((response) => {
      if (!response.ok) throw new Error("Ortssuche fehlgeschlagen");
      return response.json();
    })
    .then((data) => {
      if (!data.length) throw new Error("Ort nicht gefunden");
      const lat = Number(data[0].lat);
      const lon = Number(data[0].lon);
      marker.setLatLng([lat, lon]);
      map.setView([lat, lon], 13);
      updateLocation(lat, lon, data[0].display_name || query);
      resetResults("Startort geändert. Bitte Simulation erneut ausführen.");
    })
    .catch((error) => setStatus(error.message, "error"))
    .finally(() => {
      searchButton.disabled = false;
    });
}

function addControls() {
  heights.forEach((height) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    const span = document.createElement("span");

    input.type = "checkbox";
    input.name = "altitude";
    input.value = String(height);
    input.checked = defaults.includes(height);
    span.textContent = formatAltitude(height);

    label.append(input, span);
    levels.append(label);
  });

  levels.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", updateCount);
  });

  updateCount();
}

marker.on("dragend", () => {
  const point = marker.getLatLng();
  updateLocation(point.lat, point.lng, "Manuell gewählter Startpunkt");
  resetResults("Startpunkt geändert. Bitte Simulation erneut ausführen.");
});

map.on("click", (event) => {
  marker.setLatLng(event.latlng);
  updateLocation(event.latlng.lat, event.latlng.lng, "Manuell gewählter Startpunkt");
  resetResults("Startpunkt geändert. Bitte Simulation erneut ausführen.");
});

const now = new Date();
dateInput.value = now.toISOString().slice(0, 10);
updateUtm(lat0, lon0);

duration.addEventListener("input", () => {
  durationValue.textContent = `${Number(duration.value).toFixed(1).replace(".", ",")} Stunden`;
});

[dateInput, startInput].forEach((input) => {
  input.addEventListener("change", () => resetResults("Datum oder Startzeit geändert. Bitte Simulation erneut ausführen."));
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
$("btn-balloon-levels").addEventListener("click", () => selectHeights(defaults));

addControls();
setStatus("Bereit.", "success");
