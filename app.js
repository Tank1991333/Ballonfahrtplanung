"use strict";

/*
  Ballonfahrt-Planer

  Wichtiger Hinweis:
  Diese Anwendung ist nur eine vereinfachte Planungshilfe.
  Sie darf nicht für operative Flugentscheidungen verwendet werden.
*/

const DEFAULT_LOCATION = {
  name: "Bad Waltersdorf",
  latitude: 47.1696,
  longitude: 16.0093
};

const HEIGHTS = [10, 80, 120, 180];

const ROUTE_COLORS = {
  10: "#22c55e",
  80: "#f59e0b",
  120: "#ef4444",
  180: "#8b5cf6"
};

const state = {
  location: { ...DEFAULT_LOCATION },
  weather: null,
  routeLayers: [],
  endMarkers: []
};

const elements = {
  locationInput: document.getElementById("locationInput"),
  searchButton: document.getElementById("searchButton"),
  searchResults: document.getElementById("searchResults"),

  latitudeValue: document.getElementById("latitudeValue"),
  longitudeValue: document.getElementById("longitudeValue"),
  selectedLocationName: document.getElementById("selectedLocationName"),

  flightDate: document.getElementById("flightDate"),
  flightTime: document.getElementById("flightTime"),
  flightDuration: document.getElementById("flightDuration"),
  durationValue: document.getElementById("durationValue"),
  heightSelect: document.getElementById("heightSelect"),

  loadWeatherButton: document.getElementById("loadWeatherButton"),
  statusMessage: document.getElementById("statusMessage"),

  weatherEmpty: document.getElementById("weatherEmpty"),
  weatherContent: document.getElementById("weatherContent"),

  forecastTime: document.getElementById("forecastTime"),
  temperatureValue: document.getElementById("temperatureValue"),
  precipitationValue: document.getElementById("precipitationValue"),
  cloudCoverValue: document.getElementById("cloudCoverValue"),

  selectedHeightValue: document.getElementById("selectedHeightValue"),
  windSpeedValue: document.getElementById("windSpeedValue"),
  windFromValue: document.getElementById("windFromValue"),
  travelDirectionValue: document.getElementById(
    "travelDirectionValue"
  ),
  distanceValue: document.getElementById("distanceValue"),

  windTableBody: document.getElementById("windTableBody")
};

/*
  Karte initialisieren
*/

const map = L.map("map", {
  zoomControl: true
}).setView(
  [DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude],
  11
);

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution:
      '&copy; https://www.openstreetmap.org/copyright' +
      "OpenStreetMap-Mitwirkende</a>"
  }
).addTo(map);

const startMarker = L.marker(
  [DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude],
  {
    draggable: true,
    title: "Startpunkt"
  }
).addTo(map);

startMarker
  .bindPopup("<strong>Startpunkt</strong><br>Bad Waltersdorf")
  .openPopup();

/*
  Datum auf den kommenden Sonntag setzen.
*/

function setDefaultDateToNextSunday() {
  const today = new Date();
  const result = new Date(today);

  const daysUntilSunday = (7 - today.getDay()) % 7;
  result.setDate(
    today.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday)
  );

  elements.flightDate.value = formatDateForInput(result);
}

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/*
  Hilfsfunktionen
*/

function setStatus(message, type = "") {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = "status-message";

  if (type) {
    elements.statusMessage.classList.add(type);
  }
}

function updateLocationDisplay() {
  elements.latitudeValue.textContent =
    state.location.latitude.toFixed(5);

  elements.longitudeValue.textContent =
    state.location.longitude.toFixed(5);

  elements.selectedLocationName.textContent =
    state.location.name;
}

function setLocation(location, zoom = 12) {
  state.location = {
    name: location.name,
    latitude: Number(location.latitude),
    longitude: Number(location.longitude)
  };

  const coordinates = [
    state.location.latitude,
    state.location.longitude
  ];

  startMarker.setLatLng(coordinates);

  startMarker.bindPopup(
    `<strong>Startpunkt</strong><br>${escapeHtml(
      state.location.name
    )}`
  );

  map.setView(coordinates, zoom);
  updateLocationDisplay();

  clearRoutes();

  elements.weatherContent.classList.add("hidden");
  elements.weatherEmpty.classList.remove("hidden");
  elements.windTableBody.innerHTML = `
    <tr>
      <td colspan="4">Noch keine Daten</td>
    </tr>
  `;

  setStatus(
    "Neuer Startort gewählt. Jetzt Wetterdaten laden."
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;

  return directions[index];
}

function calculateDestination(
  latitude,
  longitude,
  bearingDegrees,
  distanceKilometers
) {
  const earthRadiusKilometers = 6371;

  const angularDistance =
    distanceKilometers / earthRadiusKilometers;

  const bearing = toRadians(bearingDegrees);
  const startLatitude = toRadians(latitude);
  const startLongitude = toRadians(longitude);

  const destinationLatitude = Math.asin(
    Math.sin(startLatitude) * Math.cos(angularDistance) +
      Math.cos(startLatitude) *
        Math.sin(angularDistance) *
        Math.cos(bearing)
  );

  const destinationLongitude =
    startLongitude +
    Math.atan2(
      Math.sin(bearing) *
        Math.sin(angularDistance) *
        Math.cos(startLatitude),
      Math.cos(angularDistance) -
        Math.sin(startLatitude) *
          Math.sin(destinationLatitude)
    );

  return {
    latitude: toDegrees(destinationLatitude),
    longitude: normalizeLongitude(
      toDegrees(destinationLongitude)
    )
  };
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}

function normalizeLongitude(longitude) {
  return ((longitude + 540) % 360) - 180;
}

function getNearestTimeIndex(times, requestedDateTime) {
  const requestedTimestamp = new Date(
    requestedDateTime
  ).getTime();

  let nearestIndex = 0;
  let nearestDifference = Infinity;

  times.forEach((time, index) => {
    const difference = Math.abs(
      new Date(time).getTime() - requestedTimestamp
    );

    if (difference < nearestDifference) {
      nearestDifference = difference;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

function formatForecastTime(value) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("de-AT", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

/*
  Ortssuche über Open-Meteo Geocoding
*/

async function searchLocation() {
  const query = elements.locationInput.value.trim();

  if (query.length < 2) {
    setStatus(
      "Bitte mindestens zwei Zeichen für die Ortssuche eingeben.",
      "error"
    );
    return;
  }

  elements.searchButton.disabled = true;
  elements.searchButton.textContent = "Suche...";
  elements.searchResults.innerHTML = "";

  setStatus("Ort wird gesucht...");

  try {
    const url = new URL(
      "https://geocoding-api.open-meteo.com/v1/search"
    );

    url.searchParams.set("name", query);
    url.searchParams.set("count", "8");
    url.searchParams.set("language", "de");
    url.searchParams.set("format", "json");

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Ortssuche fehlgeschlagen: HTTP ${response.status}`
      );
    }

    const data = await response.json();
    const results = data.results || [];

    if (results.length === 0) {
      elements.searchResults.innerHTML = `
        <p class="help-text">
          Kein passender Ort gefunden.
        </p>
      `;

      setStatus(
        "Kein passender Ort gefunden.",
        "error"
      );

      return;
    }

    renderSearchResults(results);

    setStatus(
      `${results.length} mögliche Orte gefunden.`,
      "success"
    );
  } catch (error) {
    console.error(error);

    setStatus(
      "Die Ortssuche konnte nicht geladen werden. Bitte später erneut versuchen.",
      "error"
    );
  } finally {
    elements.searchButton.disabled = false;
    elements.searchButton.textContent = "Suchen";
  }
}

function renderSearchResults(results) {
  elements.searchResults.innerHTML = "";

  results.forEach((result) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result-button";

    const locationParts = [
      result.admin1,
      result.country
    ].filter(Boolean);

    button.innerHTML = `
      <strong>${escapeHtml(result.name)}</strong>
      <span>${escapeHtml(locationParts.join(", "))}</span>
    `;

    button.addEventListener("click", () => {
      const locationName = [
        result.name,
        result.admin1,
        result.country
      ]
        .filter(Boolean)
        .join(", ");

      elements.locationInput.value = result.name;
      elements.searchResults.innerHTML = "";

      setLocation({
        name: locationName,
        latitude: result.latitude,
        longitude: result.longitude
      });
    });

    elements.searchResults.appendChild(button);
  });
}

/*
  Wetterdaten über Open-Meteo laden
*/

async function loadWeather() {
  const date = elements.flightDate.value;
  const time = elements.flightTime.value;

  if (!date || !time) {
    setStatus(
      "Bitte Datum und Startzeit auswählen.",
      "error"
    );
    return;
  }

  const requestedDateTime = `${date}T${time}`;

  elements.loadWeatherButton.disabled = true;
  elements.loadWeatherButton.textContent =
    "Wetterdaten werden geladen...";

  setStatus("Wetterprognose wird geladen...");

  try {
    const url = new URL(
      "https://api.open-meteo.com/v1/forecast"
    );

    url.searchParams.set(
      "latitude",
      state.location.latitude
    );

    url.searchParams.set(
      "longitude",
      state.location.longitude
    );

    url.searchParams.set(
      "hourly",
      [
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
      ].join(",")
    );

    url.searchParams.set("timezone", "auto");
    url.searchParams.set("wind_speed_unit", "kmh");
    url.searchParams.set("start_date", date);
    url.searchParams.set("end_date", date);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Wetterabfrage fehlgeschlagen: HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.hourly || !data.hourly.time) {
      throw new Error(
        "Die Wetterantwort enthält keine stündlichen Daten."
      );
    }

    const index = getNearestTimeIndex(
      data.hourly.time,
      requestedDateTime
    );

    const weather = createWeatherObject(
      data,
      index
    );

    state.weather = weather;

    renderWeather(weather);
    drawRoutes(weather);

    setStatus(
      "Wetterdaten erfolgreich geladen.",
      "success"
    );
  } catch (error) {
    console.error(error);

    setStatus(
      "Die Wetterdaten konnten nicht geladen werden. Das Datum liegt möglicherweise außerhalb des verfügbaren Vorhersagezeitraums.",
      "error"
    );
  } finally {
    elements.loadWeatherButton.disabled = false;
    elements.loadWeatherButton.textContent =
      "Wetterdaten laden";
  }
}

function createWeatherObject(data, index) {
  const hourly = data.hourly;

  const winds = {};

  HEIGHTS.forEach((height) => {
    winds[height] = {
      speed: Number(
        hourly[`wind_speed_${height}m`][index]
      ),
      directionFrom: Number(
        hourly[`wind_direction_${height}m`][index]
      )
    };
  });

  return {
    forecastTime: hourly.time[index],
    temperature: hourly.temperature_2m[index],
    precipitation: hourly.precipitation[index],
    cloudCover: hourly.cloud_cover[index],
    winds
  };
}

/*
  Ergebnisse anzeigen
*/

function renderWeather(weather) {
  const selectedHeight = Number(
    elements.heightSelect.value
  );

  const selectedWind =
    weather.winds[selectedHeight];

  const travelDirection =
    (selectedWind.directionFrom + 180) % 360;

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
    `${Number(weather.temperature).toFixed(1)} °C`;

  elements.precipitationValue.textContent =
    `${Number(weather.precipitation).toFixed(1)} mm`;

  elements.cloudCoverValue.textContent =
    `${Math.round(Number(weather.cloudCover))} %`;

  elements.selectedHeightValue.textContent =
    `${selectedHeight} m`;

  elements.windSpeedValue.textContent =
    `${selectedWind.speed.toFixed(1)} km/h`;

  elements.windFromValue.textContent =
    `${degreesToCompass(
      selectedWind.directionFrom
    )} (${Math.round(selectedWind.directionFrom)}°)`;

  elements.travelDirectionValue.textContent =
    `${degreesToCompass(
      travelDirection
    )} (${Math.round(travelDirection)}°)`;

  elements.distanceValue.textContent =
    `${distance.toFixed(1)} km`;

  renderWindTable(weather);
}

function renderWindTable(weather) {
  elements.windTableBody.innerHTML = "";

  HEIGHTS.forEach((height) => {
    const wind = weather.winds[height];

    const travelDirection =
      (wind.directionFrom + 180) % 360;

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>
        <strong style="color:${ROUTE_COLORS[height]}">
          ${height} m
        </strong>
      </td>

      <td>
        ${wind.speed.toFixed(1)} km/h
      </td>

      <td>
        ${degreesToCompass(wind.directionFrom)}
      </td>

      <td>
        ${degreesToCompass(travelDirection)}
      </td>
    `;

    elements.windTableBody.appendChild(row);
  });
}

/*
  Routen zeichnen
*/

function clearRoutes() {
  state.routeLayers.forEach((layer) => {
    map.removeLayer(layer);
  });

  state.endMarkers.forEach((marker) => {
    map.removeLayer(marker);
  });

  state.routeLayers = [];
  state.endMarkers = [];
}

function drawRoutes(weather) {
  clearRoutes();

  const duration = Number(
    elements.flightDuration.value
  );

  const bounds = L.latLngBounds([
    [
      state.location.latitude,
      state.location.longitude
    ]
  ]);

  HEIGHTS.forEach((height) => {
    const wind = weather.winds[height];

    const travelDirection =
      (wind.directionFrom + 180) % 360;

    const distance =
      wind.speed * duration;

    const destination = calculateDestination(
      state.location.latitude,
      state.location.longitude,
      travelDirection,
      distance
    );

    const line = L.polyline(
      [
        [
          state.location.latitude,
          state.location.longitude
        ],
        [
          destination.latitude,
          destination.longitude
        ]
      ],
      {
        color: ROUTE_COLORS[height],
        weight: 5,
        opacity: 0.9,
        dashArray:
          Number(elements.heightSelect.value) === height
            ? null
            : "9 8"
      }
    ).addTo(map);

    line.bindPopup(`
      <strong>${height} m Windhöhe</strong><br>
      Wind: ${wind.speed.toFixed(1)} km/h<br>
      Wind aus: ${degreesToCompass(
        wind.directionFrom
      )} (${Math.round(wind.directionFrom)}°)<br>
      Fahrt nach: ${degreesToCompass(
        travelDirection
      )} (${Math.round(travelDirection)}°)<br>
      Vereinfachte Strecke: ${distance.toFixed(1)} km
    `);

    const endMarker = L.circleMarker(
      [
        destination.latitude,
        destination.longitude
      ],
      {
        radius:
          Number(elements.heightSelect.value) === height
            ? 9
            : 7,
        color: "#ffffff",
        weight: 2,
        fillColor: ROUTE_COLORS[height],
        fillOpacity: 1
      }
    ).addTo(map);

    endMarker.bindPopup(`
      <strong>Rechnerischer Endpunkt</strong><br>
      Windhöhe: ${height} m<br>
      Strecke: ${distance.toFixed(1)} km<br>
      Koordinaten:<br>
      ${destination.latitude.toFixed(5)},
      ${destination.longitude.toFixed(5)}
    `);

    state.routeLayers.push(line);
    state.endMarkers.push(endMarker);

    bounds.extend([
      destination.latitude,
      destination.longitude
    ]);
  });

  if (bounds.isValid()) {
    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 12
    });
  }
}

/*
  Ereignisse
*/

elements.searchButton.addEventListener(
  "click",
  searchLocation
);

elements.locationInput.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Enter") {
      searchLocation();
    }
  }
);

elements.flightDuration.addEventListener(
  "input",
  () => {
    elements.durationValue.textContent =
      elements.flightDuration.value;

    if (state.weather) {
      renderWeather(state.weather);
      drawRoutes(state.weather);
    }
  }
);

elements.heightSelect.addEventListener(
  "change",
  () => {
    if (state.weather) {
      renderWeather(state.weather);
      drawRoutes(state.weather);
    }
  }
);

elements.loadWeatherButton.addEventListener(
  "click",
  loadWeather
);

map.on("click", (event) => {
  elements.locationInput.value = "";

  setLocation(
    {
      name: "Ausgewählter Kartenpunkt",
      latitude: event.latlng.lat,
      longitude: event.latlng.lng
    },
    map.getZoom()
  );
});

startMarker.on("dragend", () => {
  const coordinates = startMarker.getLatLng();

  elements.locationInput.value = "";

  setLocation(
    {
      name: "Verschobener Startpunkt",
      latitude: coordinates.lat,
      longitude: coordinates.lng
    },
    map.getZoom()
  );
});

/*
  App starten
*/

setDefaultDateToNextSunday();
updateLocationDisplay();

setTimeout(() => {
  map.invalidateSize();
}, 250);
