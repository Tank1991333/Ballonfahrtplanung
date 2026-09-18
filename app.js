"use strict";

/*
  ============================================================
  BALLOON FLIGHT PLANNER
  ============================================================

  Diese Anwendung ist eine vereinfachte Planungshilfe.

  Die berechneten Linien sind keine realen Flugbahnen.
  Die Anwendung ersetzt keine:
  - offizielle Flugwetterberatung
  - Luftraumprüfung
  - Hindernisprüfung
  - Landeflächenprüfung
  - Entscheidung des verantwortlichen Ballonpiloten
*/

/*
  ============================================================
  GRUNDEINSTELLUNGEN
  ============================================================
*/

const DEFAULT_LOCATION = {
  name: "Bad Waltersdorf",
  latitude: 47.1696,
  longitude: 16.0093
};

const AVAILABLE_HEIGHTS = [10, 80, 120, 180];

const ROUTE_COLORS = {
  10: "#43d17c",
  80: "#ffad33",
  120: "#ff5252",
  180: "#b25cff"
};

const state = {
  location: { ...DEFAULT_LOCATION },
  weather: null,
  routeLayers: [],
  destinationMarkers: []
};

/*
  ============================================================
  HTML-ELEMENTE
  ============================================================
*/

const elements = {
  locationInput: document.getElementById("locationInput"),
  searchButton: document.getElementById("searchButton"),
  searchResults: document.getElementById("searchResults"),

  latitudeValue: document.getElementById("latitudeValue"),
  longitudeValue: document.getElementById("longitudeValue"),
  selectedLocationName: document.getElementById(
    "selectedLocationName"
  ),

  flightDate: document.getElementById("flightDate"),
  flightTime: document.getElementById("flightTime"),
  flightDuration: document.getElementById("flightDuration"),
  durationValue: document.getElementById("durationValue"),
  heightSelect: document.getElementById("heightSelect"),

  loadWeatherButton: document.getElementById(
    "loadWeatherButton"
  ),

  statusMessage: document.getElementById("statusMessage"),

  weatherEmpty: document.getElementById("weatherEmpty"),
  weatherContent: document.getElementById("weatherContent"),

  forecastTime: document.getElementById("forecastTime"),
  forecastTimeMirror: document.getElementById(
    "forecastTimeMirror"
  ),

  temperatureValue: document.getElementById(
    "temperatureValue"
  ),

  precipitationValue: document.getElementById(
    "precipitationValue"
  ),

  cloudCoverValue: document.getElementById(
    "cloudCoverValue"
  ),

  selectedHeightValue: document.getElementById(
    "selectedHeightValue"
  ),

  windSpeedValue: document.getElementById(
    "windSpeedValue"
  ),

  windFromValue: document.getElementById(
    "windFromValue"
  ),

  travelDirectionValue: document.getElementById(
    "travelDirectionValue"
  ),

  distanceValue: document.getElementById("distanceValue"),
  windTableBody: document.getElementById("windTableBody")
};

/*
  ============================================================
  KARTE INITIALISIEREN
  ============================================================
*/

let map = null;
let startMarker = null;

function initializeMap() {
  if (typeof L === "undefined") {
    setStatus(
      "Die Karte konnte nicht geladen werden. Bitte prüfe die Leaflet-Einbindung in der index.html.",
      "error"
    );

    return;
  }

  map = L.map("map", {
    zoomControl: true,
    attributionControl: true
  }).setView(
    [
      DEFAULT_LOCATION.latitude,
      DEFAULT_LOCATION.longitude
    ],
    11
  );

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer;

  startMarker = L.marker(
    [
      DEFAULT_LOCATION.latitude,
      DEFAULT_LOCATION.longitude
    ],
    {
      draggable: true,
      title: "Startpunkt verschieben"
    }
  ).addTo(map);

  updateStartMarkerPopup();

  /*
    Startpunkt mit Kartenklick setzen
  */

  map.on("click", function (event) {
    elements.locationInput.value = "";
    elements.searchResults.innerHTML = "";

    setLocation(
      {
        name: "Ausgewählter Kartenpunkt",
        latitude: event.latlng.lat,
        longitude: event.latlng.lng
      },
      map.getZoom()
    );
  });

  /*
    Startmarker verschieben
  */

  startMarker.on("dragend", function () {
    const coordinates = startMarker.getLatLng();

    elements.locationInput.value = "";
    elements.searchResults.innerHTML = "";

    setLocation(
      {
        name: "Verschobener Startpunkt",
        latitude: coordinates.lat,
        longitude: coordinates.lng
      },
      map.getZoom()
    );
  });

  window.setTimeout(function () {
    map.invalidateSize();
  }, 300);
}

/*
  ============================================================
  STANDARD-DATUM EINSTELLEN
  ============================================================
*/

function setDefaultFlightDate() {
  const today = new Date();
  const nextSunday = new Date(today);

  let daysUntilSunday = (7 - today.getDay()) % 7;

  /*
    Wenn heute Sonntag ist, wird der heutige Sonntag verwendet.
  */

  if (daysUntilSunday === 0) {
    daysUntilSunday = 0;
  }

  nextSunday.setDate(today.getDate() + daysUntilSunday);

  elements.flightDate.value =
    formatDateForInput(nextSunday);

  /*
    Kein vergangenes Datum erlauben
  */

  elements.flightDate.min = formatDateForInput(today);
}

function formatDateForInput(date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/*
  ============================================================
  STATUSMELDUNGEN
  ============================================================
*/

function setStatus(message, type = "") {
  if (!elements.statusMessage) {
    return;
  }

  elements.statusMessage.textContent = message;
  elements.statusMessage.className = "status-message";

  if (type) {
    elements.statusMessage.classList.add(type);
  }
}

/*
  ============================================================
  STARTORT VERWALTEN
  ============================================================
*/

function setLocation(location, zoomLevel = 12) {
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    setStatus(
      "Die Koordinaten des ausgewählten Ortes sind ungültig.",
      "error"
    );

    return;
  }

  state.location = {
    name: location.name || "Ausgewählter Startpunkt",
    latitude,
    longitude
  };

  updateLocationDisplay();

  if (map && startMarker) {
    const coordinates = [latitude, longitude];

    startMarker.setLatLng(coordinates);
    updateStartMarkerPopup();

    map.setView(coordinates, zoomLevel);
  }

  clearRoutes();
  resetWeatherDisplay();

  setStatus(
    "Neuer Startort ausgewählt. Lade jetzt die Wetterdaten.",
    "success"
  );
}

function updateLocationDisplay() {
  if (elements.latitudeValue) {
    elements.latitudeValue.textContent =
      state.location.latitude.toFixed(5);
  }

  if (elements.longitudeValue) {
    elements.longitudeValue.textContent =
      state.location.longitude.toFixed(5);
  }

  if (elements.selectedLocationName) {
    elements.selectedLocationName.textContent =
      state.location.name;
  }
}

function updateStartMarkerPopup() {
  if (!startMarker) {
    return;
  }

  const popupContent = `
    <div style="min-width:180px">
      <strong>🎈 Startpunkt</strong>
      <br>
      ${escapeHtml(state.location.name)}
      <br><br>
      <small>
        ${state.location.latitude.toFixed(5)},
        ${state.location.longitude.toFixed(5)}
      </small>
    </div>
  `;

  startMarker.bindPopup(popupContent);
}

/*
  ============================================================
  WETTERANZEIGE ZURÜCKSETZEN
  ============================================================
*/

function resetWeatherDisplay() {
  state.weather = null;

  if (elements.weatherContent) {
    elements.weatherContent.classList.add("hidden");
  }

  if (elements.weatherEmpty) {
    elements.weatherEmpty.classList.remove("hidden");
  }

  if (elements.windTableBody) {
    elements.windTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="no-data-cell">
          Noch keine Daten
        </td>
      </tr>
    `;
  }

  if (elements.forecastTimeMirror) {
    elements.forecastTimeMirror.textContent =
      "siehe Ergebnis";
  }
}

/*
  ============================================================
  HTML SICHER AUSGEBEN
  ============================================================
*/

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/*
  ============================================================
  ORTSSUCHE
  ============================================================
*/

async function searchLocation() {
  const searchTerm =
    elements.locationInput.value.trim();

  if (searchTerm.length < 2) {
    setStatus(
      "Bitte mindestens zwei Zeichen für die Ortssuche eingeben.",
      "error"
    );

    return;
  }

  setSearchButtonLoading(true);
  elements.searchResults.innerHTML = "";

  setStatus("Der Ort wird gesucht...");

  try {
    const url = new URL(
      "https://geocoding-api.open-meteo.com/v1/search"
    );

    url.searchParams.set("name", searchTerm);
    url.searchParams.set("count", "8");
    url.searchParams.set("language", "de");
    url.searchParams.set("format", "json");

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(
        `HTTP-Fehler bei der Ortssuche: ${response.status}`
      );
    }

    const data = await response.json();
    const results = data.results || [];

    if (results.length === 0) {
      elements.searchResults.innerHTML = `
        <div class="empty-state">
          <div>
            <strong>Kein Ort gefunden</strong>
            <p>
              Versuche es mit Ort und Land, zum Beispiel
              „Bad Waltersdorf, Österreich“.
            </p>
          </div>
        </div>
      `;

      setStatus(
        "Für den Suchbegriff wurde kein Ort gefunden.",
        "error"
      );

      return;
    }

    renderSearchResults(results);

    setStatus(
      `${results.length} mögliche Orte gefunden. Wähle den passenden Ort aus.`,
      "success"
    );
  } catch (error) {
    console.error("Fehler bei der Ortssuche:", error);

    setStatus(
      "Die Ortssuche konnte nicht geladen werden. Bitte versuche es später erneut.",
      "error"
    );
  } finally {
    setSearchButtonLoading(false);
  }
}

function setSearchButtonLoading(isLoading) {
  if (!elements.searchButton) {
    return;
  }

  elements.searchButton.disabled = isLoading;

  elements.searchButton.innerHTML = isLoading
    ? "<span>⌛</span> Suche läuft"
    : "<span>⌕</span> Suchen";
}

function renderSearchResults(results) {
  elements.searchResults.innerHTML = "";

  results.forEach(function (result) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "search-result-button";

    const locationDescription = [
      result.postcodes?.[0],
      result.admin2,
      result.admin1,
      result.country
    ]
      .filter(Boolean)
      .join(", ");

    button.innerHTML = `
      <strong>${escapeHtml(result.name)}</strong>
      <span>${escapeHtml(locationDescription)}</span>
    `;

    button.addEventListener("click", function () {
      const fullLocationName = [
        result.name,
        result.admin1,
        result.country
      ]
        .filter(Boolean)
        .join(", ");

      elements.locationInput.value = result.name;
      elements.searchResults.innerHTML = "";

      setLocation({
        name: fullLocationName,
        latitude: result.latitude,
        longitude: result.longitude
      });
    });

    elements.searchResults.appendChild(button);
  });
}

/*
  ============================================================
  WETTERDATEN LADEN
  ============================================================
*/

async function loadWeather() {
  const selectedDate = elements.flightDate.value;
  const selectedTime = elements.flightTime.value;

  if (!selectedDate || !selectedTime) {
    setStatus(
      "Bitte Datum und Startzeit auswählen.",
      "error"
    );

    return;
  }

  setWeatherButtonLoading(true);
  setStatus("Die Wetterprognose wird geladen...");

  try {
    const url = createWeatherApiUrl(selectedDate);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(
        `HTTP-Fehler bei der Wetterabfrage: ${response.status}`
      );
    }

    const data = await response.json();

    if (
      !data.hourly ||
      !Array.isArray(data.hourly.time) ||
      data.hourly.time.length === 0
    ) {
      throw new Error(
        "Die Wetterantwort enthält keine stündlichen Daten."
      );
    }

    const requestedDateTime =
      `${selectedDate}T${selectedTime}`;

    const timeIndex = getNearestTimeIndex(
      data.hourly.time,
      requestedDateTime
    );

    const weather = createWeatherObject(
      data,
      timeIndex
    );

    validateWeatherObject(weather);

    state.weather = weather;

    renderWeather(weather);
    renderWindTable(weather);
    drawRoutes(weather);
    updateForecastMirror(weather);

    setStatus(
      "Wetterdaten erfolgreich geladen. Vergleiche jetzt die verschiedenen Windhöhen.",
      "success"
    );
  } catch (error) {
    console.error(
      "Fehler bei der Wetterabfrage:",
      error
    );

    setStatus(
      "Die Wetterdaten konnten nicht geladen werden. Das ausgewählte Datum liegt möglicherweise außerhalb des verfügbaren Vorhersagezeitraums.",
      "error"
    );
  } finally {
    setWeatherButtonLoading(false);
  }
}

function createWeatherApiUrl(selectedDate) {
  const url = new URL(
    "https://api.open-meteo.com/v1/forecast"
  );

  url.searchParams.set(
    "latitude",
    String(state.location.latitude)
  );

  url.searchParams.set(
    "longitude",
    String(state.location.longitude)
  );

  const hourlyParameters = [
    "temperature_2m",
    "precipitation",
    "cloud_cover",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_speed_80m",
    "wind_direction_80m",
    "wind_speed_120m",
    "wind_direction_120m",
    "wind_speed_180m",
    "wind_direction_180m"
  ];

  url.searchParams.set(
    "hourly",
    hourlyParameters.join(",")
  );

  url.searchParams.set("timezone", "auto");
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("start_date", selectedDate);
  url.searchParams.set("end_date", selectedDate);

  return url;
}

function setWeatherButtonLoading(isLoading) {
  if (!elements.loadWeatherButton) {
    return;
  }

  elements.loadWeatherButton.disabled = isLoading;

  elements.loadWeatherButton.innerHTML = isLoading
    ? "<span>⌛</span> Wetterdaten werden geladen"
    : "<span>☁</span> Wetterdaten laden";
}

/*
  ============================================================
  ZEITPUNKT FINDEN
  ============================================================
*/

function getNearestTimeIndex(times, requestedDateTime) {
  const requestedTimestamp = new Date(
    requestedDateTime
  ).getTime();

  let nearestIndex = 0;
  let smallestDifference = Infinity;

  times.forEach(function (time, index) {
    const timestamp = new Date(time).getTime();

    const difference = Math.abs(
      timestamp - requestedTimestamp
    );

    if (difference < smallestDifference) {
      smallestDifference = difference;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

/*
  ============================================================
  WETTEROBJEKT ERSTELLEN
  ============================================================
*/

function createWeatherObject(data, index) {
  const hourly = data.hourly;
  const winds = {};

  AVAILABLE_HEIGHTS.forEach(function (height) {
    const speedKey = `wind_speed_${height}m`;
    const directionKey =
      `wind_direction_${height}m`;

    winds[height] = {
      speed: Number(hourly[speedKey]?.[index]),
      directionFrom: Number(
        hourly[directionKey]?.[index]
      )
    };
  });

  return {
    forecastTime: hourly.time[index],
    temperature: Number(
      hourly.temperature_2m?.[index]
    ),
    precipitation: Number(
      hourly.precipitation?.[index]
    ),
    cloudCover: Number(
      hourly.cloud_cover?.[index]
    ),
    winds
  };
}

function validateWeatherObject(weather) {
  if (!weather.forecastTime) {
    throw new Error("Prognosezeit fehlt.");
  }

  AVAILABLE_HEIGHTS.forEach(function (height) {
    const wind = weather.winds[height];

    if (
      !wind ||
      !Number.isFinite(wind.speed) ||
      !Number.isFinite(wind.directionFrom)
    ) {
      throw new Error(
        `Winddaten für ${height} m fehlen.`
      );
    }
  });
}

/*
  ============================================================
  WETTERERGEBNIS ANZEIGEN
  ============================================================
*/

function renderWeather(weather) {
  const selectedHeight = Number(
    elements.heightSelect.value
  );

  const selectedWind =
    weather.winds[selectedHeight];

  const travelDirection =
    normalizeDegrees(
      selectedWind.directionFrom + 180
    );

  const duration = Number(
    elements.flightDuration.value
  );

  const distance =
    selectedWind.speed * duration;

  elements.weatherEmpty.classList.add("hidden");
  elements.weatherContent.classList.remove("hidden");

  elements.forecastTime.textContent =
    formatForecastTime(weather.forecastTime);

  elements.temperatureValue.textContent =
    `${formatNumber(weather.temperature, 1)} °C`;

  elements.precipitationValue.textContent =
    `${formatNumber(weather.precipitation, 1)} mm`;

  elements.cloudCoverValue.textContent =
    `${Math.round(weather.cloudCover)} %`;

  elements.selectedHeightValue.textContent =
    `${selectedHeight} m über Grund`;

  elements.windSpeedValue.textContent =
    `${formatNumber(selectedWind.speed, 1)} km/h`;

  elements.windFromValue.textContent =
    `${degreesToCompass(
      selectedWind.directionFrom
    )} (${Math.round(
      selectedWind.directionFrom
    )}°)`;

  elements.travelDirectionValue.textContent =
    `${degreesToCompass(
      travelDirection
    )} (${Math.round(travelDirection)}°)`;

  elements.distanceValue.textContent =
    `${formatNumber(distance, 1)} km`;
}

function updateForecastMirror(weather) {
  if (!elements.forecastTimeMirror) {
    return;
  }

  elements.forecastTimeMirror.textContent =
    formatForecastTime(weather.forecastTime);
}

function formatNumber(value, decimals = 1) {
  if (!Number.isFinite(Number(value))) {
    return "–";
  }

  return Number(value).toLocaleString("de-AT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function formatForecastTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("de-AT", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

/*
  ============================================================
  WINDRICHTUNGEN
  ============================================================
*/

function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}

function degreesToCompass(degrees) {
  const directions = [
    "N",
    "NNO",
    "NO",
    "ONO",
    "O",
    "OSO",
    "SO",
    "SSO",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW"
  ];

  const normalized = normalizeDegrees(degrees);

  const index =
    Math.round(normalized / 22.5) % 16;

  return directions[index];
}

/*
  ============================================================
  WINDTABELLE
  ============================================================
*/

function renderWindTable(weather) {
  elements.windTableBody.innerHTML = "";

  AVAILABLE_HEIGHTS.forEach(function (height) {
    const wind = weather.winds[height];

    const travelDirection =
      normalizeDegrees(
        wind.directionFrom + 180
      );

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>
        <strong style="color:${ROUTE_COLORS[height]}">
          ${height} m
        </strong>
      </td>

      <td>
        ${formatNumber(wind.speed, 1)} km/h
      </td>

      <td title="${Math.round(wind.directionFrom)} Grad">
        ${degreesToCompass(wind.directionFrom)}
      </td>

      <td title="${Math.round(travelDirection)} Grad">
        ${degreesToCompass(travelDirection)}
      </td>
    `;

    elements.windTableBody.appendChild(row);
  });
}

/*
  ============================================================
  ZIELKOORDINATEN BERECHNEN
  ============================================================
*/

function calculateDestination(
  startLatitude,
  startLongitude,
  bearingDegrees,
  distanceKilometers
) {
  const earthRadiusKilometers = 6371;

  const angularDistance =
    distanceKilometers / earthRadiusKilometers;

  const bearing = toRadians(bearingDegrees);
  const latitude1 = toRadians(startLatitude);
  const longitude1 = toRadians(startLongitude);

  const latitude2 = Math.asin(
    Math.sin(latitude1) *
      Math.cos(angularDistance) +
    Math.cos(latitude1) *
      Math.sin(angularDistance) *
      Math.cos(bearing)
  );

  const longitude2 =
    longitude1 +
    Math.atan2(
      Math.sin(bearing) *
        Math.sin(angularDistance) *
        Math.cos(latitude1),

      Math.cos(angularDistance) -
        Math.sin(latitude1) *
          Math.sin(latitude2)
    );

  return {
    latitude: toDegrees(latitude2),
    longitude: normalizeLongitude(
      toDegrees(longitude2)
    )
  };
}

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

function toDegrees(radians) {
  return radians * 180 / Math.PI;
}

function normalizeLongitude(longitude) {
  return ((longitude + 540) % 360) - 180;
}

/*
  ============================================================
  ROUTEN VON DER KARTE ENTFERNEN
  ============================================================
*/

function clearRoutes() {
  if (!map) {
    return;
  }

  state.routeLayers.forEach(function (layer) {
    map.removeLayer(layer);
  });

  state.destinationMarkers.forEach(
    function (marker) {
      map.removeLayer(marker);
    }
  );

  state.routeLayers = [];
  state.destinationMarkers = [];
}

/*
  ============================================================
  ROUTEN ZEICHNEN
  ============================================================
*/

function drawRoutes(weather) {
  if (!map) {
    return;
  }

  clearRoutes();

  const duration = Number(
    elements.flightDuration.value
  );

  const selectedHeight = Number(
    elements.heightSelect.value
  );

  const startCoordinates = [
    state.location.latitude,
    state.location.longitude
  ];

  const bounds = L.latLngBounds([
    startCoordinates
  ]);

  AVAILABLE_HEIGHTS.forEach(function (height) {
    const wind = weather.winds[height];

    const travelDirection =
      normalizeDegrees(
        wind.directionFrom + 180
      );

    const distance =
      wind.speed * duration;

    const destination = calculateDestination(
      state.location.latitude,
      state.location.longitude,
      travelDirection,
      distance
    );

    const destinationCoordinates = [
      destination.latitude,
      destination.longitude
    ];

    const isSelected =
      selectedHeight === height;

    const routeLine = L.polyline(
      [
        startCoordinates,
        destinationCoordinates
      ],
      {
        color: ROUTE_COLORS[height],
        weight: isSelected ? 6 : 4,
        opacity: isSelected ? 1 : 0.78,
        dashArray: isSelected ? null : "10 9",
        lineCap: "round",
        lineJoin: "round"
      }
    ).addTo(map);

    routeLine.bindPopup(`
      <div style="min-width:210px">
        <strong style="color:${ROUTE_COLORS[height]}">
          🎈 Route bei ${height} m Windhöhe
        </strong>

        <br><br>

        <strong>Wind:</strong>
        ${formatNumber(wind.speed, 1)} km/h

        <br>

        <strong>Wind kommt aus:</strong>
        ${degreesToCompass(wind.directionFrom)}
        (${Math.round(wind.directionFrom)}°)

        <br>

        <strong>Fahrt ungefähr nach:</strong>
        ${degreesToCompass(travelDirection)}
        (${Math.round(travelDirection)}°)

        <br>

        <strong>Vereinfachte Strecke:</strong>
        ${formatNumber(distance, 1)} km
      </div>
    `);

    const destinationMarker = L.circleMarker(
      destinationCoordinates,
      {
        radius: isSelected ? 10 : 7,
        color: "#ffffff",
        weight: isSelected ? 3 : 2,
        fillColor: ROUTE_COLORS[height],
        fillOpacity: 1
      }
    ).addTo(map);

    destinationMarker.bindPopup(`
      <div style="min-width:210px">
        <strong>
          Rechnerischer Endpunkt
        </strong>

        <br><br>

        <strong>Windhöhe:</strong>
        ${height} m

        <br>

        <strong>Strecke:</strong>
        ${formatNumber(distance, 1)} km

        <br>

        <strong>Koordinaten:</strong>
        <br>
        ${destination.latitude.toFixed(5)},
        ${destination.longitude.toFixed(5)}

        <br><br>

        <small>
          Dieser Punkt ist keine tatsächliche
          Landeprognose.
        </small>
      </div>
    `);

    state.routeLayers.push(routeLine);
    state.destinationMarkers.push(
      destinationMarker
    );

    bounds.extend(destinationCoordinates);
  });

  if (bounds.isValid()) {
    map.fitBounds(bounds, {
      paddingTopLeft: [55, 55],
      paddingBottomRight: [55, 55],
      maxZoom: 12
    });
  }
}

/*
  ============================================================
  SCHIEBEREGLER OPTISCH AKTUALISIEREN
  ============================================================
*/

function updateDurationSlider() {
  const slider = elements.flightDuration;

  if (!slider) {
    return;
  }

  const value = Number(slider.value);
  const minimum = Number(slider.min);
  const maximum = Number(slider.max);

  const percentage =
    ((value - minimum) / (maximum - minimum)) *
    100;

  slider.style.background = `
    linear-gradient(
      90deg,
      #169cff 0%,
      #169cff ${percentage}%,
      rgba(126, 163, 193, 0.25) ${percentage}%,
      rgba(126, 163, 193, 0.25) 100%
    )
  `;

  elements.durationValue.textContent =
    formatNumber(value, 2)
      .replace(",00", "")
      .replace(/0$/, "");
}

/*
  ============================================================
  EREIGNISSE
  ============================================================
*/

function registerEventListeners() {
  elements.searchButton.addEventListener(
    "click",
    searchLocation
  );

  elements.locationInput.addEventListener(
    "keydown",
    function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        searchLocation();
      }
    }
  );

  elements.locationInput.addEventListener(
    "input",
    function () {
      if (
        elements.locationInput.value.trim() === ""
      ) {
        elements.searchResults.innerHTML = "";
      }
    }
  );

  elements.loadWeatherButton.addEventListener(
    "click",
    loadWeather
  );

  elements.flightDuration.addEventListener(
    "input",
    function () {
      updateDurationSlider();

      if (state.weather) {
        renderWeather(state.weather);
        renderWindTable(state.weather);
        drawRoutes(state.weather);
      }
    }
  );

  elements.heightSelect.addEventListener(
    "change",
    function () {
      if (state.weather) {
        renderWeather(state.weather);
        renderWindTable(state.weather);
        drawRoutes(state.weather);
      }
    }
  );

  elements.flightDate.addEventListener(
    "change",
    function () {
      clearRoutes();
      resetWeatherDisplay();

      setStatus(
        "Datum geändert. Bitte Wetterdaten neu laden."
      );
    }
  );

  elements.flightTime.addEventListener(
    "change",
    function () {
      clearRoutes();
      resetWeatherDisplay();

      setStatus(
        "Startzeit geändert. Bitte Wetterdaten neu laden."
      );
    }
  );

  window.addEventListener("resize", function () {
    if (map) {
      map.invalidateSize();
    }
  });
}

/*
  ============================================================
  APP STARTEN
  ============================================================
*/

function initializeApplication() {
  setDefaultFlightDate();
  updateLocationDisplay();
  updateDurationSlider();
  initializeMap();
  registerEventListeners();

  setStatus(
    "Startort auswählen und anschließend Wetterdaten laden."
  );
}

document.addEventListener(
  "DOMContentLoaded",
  initializeApplication
);
