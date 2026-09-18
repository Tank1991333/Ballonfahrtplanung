"use strict";

// ==========================================
// 1. DOM-ELEMENTE
// ==========================================

const latInput = document.getElementById("lat");
const lonInput = document.getElementById("lon");

const displayLat = document.getElementById("display-lat");
const displayLon = document.getElementById("display-lon");

const currentLocationName = document.getElementById(
  "current-location-name"
);

const durationRange = document.getElementById("duration");
const durationValue = document.getElementById("duration-val");

const dateInput = document.getElementById("date");

const searchInput = document.getElementById("search-location");
const searchButton = document.getElementById("search-button");

const runButton = document.getElementById("run");
const statusMessage = document.getElementById("status");
const resultsContainer = document.getElementById("results");
const selectedCount = document.getElementById("selected-count");

// ==========================================
// 2. STARTKOORDINATEN
// ==========================================

const startLatitude =
  Number.parseFloat(latInput.value) || 47.1696;

const startLongitude =
  Number.parseFloat(lonInput.value) || 16.0093;

// ==========================================
// 3. KARTE INITIALISIEREN
// ==========================================

const map = L.map("map", {
  zoomControl: true
}).setView(
  [startLatitude, startLongitude],
  12
);

const tileLayer = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }
);

tileLayer.addTo(map);

const startMarker = L.marker(
  [startLatitude, startLongitude],
  {
    draggable: true
  }
).addTo(map);

startMarker
  .bindPopup(
    "<b>Startplatz</b><br>" +
    "Marker verschieben oder auf die Karte klicken."
  )
  .openPopup();

let simulationLayers = [];

// Leaflet nach dem vollständigen Seitenaufbau aktualisieren.
window.addEventListener("load", function () {
  window.setTimeout(function () {
    map.invalidateSize();
  }, 150);
});

// ==========================================
// 4. KOORDINATEN AKTUALISIEREN
// ==========================================

function updateCoordinates(
  latitude,
  longitude,
  locationName
) {
  latInput.value = latitude.toFixed(5);
  lonInput.value = longitude.toFixed(5);

  displayLat.textContent = latitude.toFixed(5);
  displayLon.textContent = longitude.toFixed(5);

  if (locationName) {
    currentLocationName.textContent = locationName;
  }
}

startMarker.on("dragend", function () {
  const position = startMarker.getLatLng();

  updateCoordinates(
    position.lat,
    position.lng,
    "Manuell gewählter Startpunkt"
  );

  startMarker
    .bindPopup(
      "<b>Startplatz</b><br>" +
      "Manuell gewählter Startpunkt"
    )
    .openPopup();
});

map.on("click", function (event) {
  startMarker.setLatLng(event.latlng);

  updateCoordinates(
    event.latlng.lat,
    event.latlng.lng,
    "Manuell gewählter Startpunkt"
  );

  startMarker
    .bindPopup(
      "<b>Startplatz</b><br>" +
      "Manuell gewählter Startpunkt"
    )
    .openPopup();
});

// ==========================================
// 5. HEUTIGES DATUM
// ==========================================

function getLocalDateString() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;

  return new Date(now.getTime() - timezoneOffset)
    .toISOString()
    .split("T")[0];
}

dateInput.value = getLocalDateString();

// ==========================================
// 6. FLUGDAUER
// ==========================================

durationRange.addEventListener(
  "input",
  function (event) {
    const duration = Number.parseFloat(
      event.target.value
    );

    durationValue.textContent =
      duration.toFixed(1).replace(".", ",") +
      " Stunden";
  }
);

// ==========================================
// 7. HÖHENAUSWAHL
// ==========================================

const altitudeCheckboxes = document.querySelectorAll(
  '#levels input[type="checkbox"]'
);

function updateSelectedCount() {
  const count = document.querySelectorAll(
    '#levels input[type="checkbox"\]:checked'
  ).length;

  selectedCount.textContent = String(count);
}

altitudeCheckboxes.forEach(function (checkbox) {
  checkbox.addEventListener(
    "change",
    updateSelectedCount
  );
});

document
  .getElementById("btn-all-levels")
  .addEventListener("click", function () {
    altitudeCheckboxes.forEach(function (checkbox) {
      checkbox.checked = true;
    });

    updateSelectedCount();

    setStatus(
      "Alle Höhen wurden ausgewählt.",
      "success"
    );
  });

document
  .getElementById("btn-no-levels")
  .addEventListener("click", function () {
    altitudeCheckboxes.forEach(function (checkbox) {
      checkbox.checked = false;
    });

    updateSelectedCount();

    setStatus(
      "Die Höhenauswahl wurde geleert.",
      "success"
    );
  });

document
  .getElementById("btn-balloon-levels")
  .addEventListener("click", function () {
    const balloonAltitudes = [
      "80",
      "100",
      "150",
      "180",
      "200",
      "250",
      "300",
      "400",
      "500",
      "600",
      "750",
      "1000",
      "1250",
      "1500",
      "1750",
      "2000",
      "2250",
      "2500",
      "2750",
      "3000"
    ];

    altitudeCheckboxes.forEach(function (checkbox) {
      checkbox.checked = balloonAltitudes.includes(
        checkbox.value
      );
    });

    updateSelectedCount();

    setStatus(
      "Ballonhöhen von 80 bis 3.000 m wurden ausgewählt.",
      "success"
    );
  });

pdateSelectedCount();

// ==========================================
// 8. ORTSSUCHE
// ==========================================

async function searchLocation() {
  const query = searchInput.value.trim();

  if (!query) {
    setStatus(
      "Bitte einen Ort oder eine Postleitzahl eingeben.",
      "error"
    );

    searchInput.focus();
    return;
  }

  const originalButtonText = searchButton.textContent;

  searchButton.disabled = true;
  searchButton.textContent = "Suche...";

  try {
    const searchUrl =
      "https://nominatim.openstreetmap.org/search" +
      "?format=jsonv2" +
      "&limit=1" +
      "&countrycodes=at" +
      "&q=" +
      encodeURIComponent(query);

    const response = await fetch(searchUrl, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(
        "Die Ortssuche konnte nicht geladen werden."
      );
    }

    const searchResults = await response.json();

    if (
      !Array.isArray(searchResults) ||
      searchResults.length === 0
    ) {
      setStatus(
        "Der eingegebene Ort wurde in Österreich nicht gefunden.",
        "error"
      );

      return;
    }

    const result = searchResults[0];

    const latitude = Number.parseFloat(result.lat);
    const longitude = Number.parseFloat(result.lon);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      throw new Error(
        "Die erhaltenen Koordinaten sind ungültig."
      );
    }

    const locationLabel =
      result.display_name || query;

    startMarker.setLatLng([
      latitude,
      longitude
    ]);

    map.setView(
      [latitude, longitude],
      13
    );

    updateCoordinates(
      latitude,
      longitude,
      locationLabel
    );

    startMarker
      .bindPopup(
        "<b>Startplatz</b><br>" +
        escapeHtml(locationLabel)
      )
      .openPopup();

    setStatus(
      "Startort wurde erfolgreich aktualisiert.",
      "success"
    );
  } catch (error) {
    console.error(
      "Fehler bei der Ortssuche:",
      error
    );

    setStatus(
      "Ortssuche nicht verfügbar. Bitte den Startpunkt auf der Karte wählen.",
      "error"
    );
  } finally {
    searchButton.disabled = false;
    searchButton.textContent = originalButtonText;
  }
}

searchButton.addEventListener(
  "click",
  searchLocation
);

searchInput.addEventListener(
  "keydown",
  function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      searchLocation();
    }
  }
);

// ==========================================
// 9. SIMULATION STARTEN
// ==========================================

runButton.addEventListener("click", function () {
  const currentLatitude =
    Number.parseFloat(latInput.value);

  const currentLongitude =
    Number.parseFloat(lonInput.value);

  const duration =
    Number.parseFloat(durationRange.value);

  const selectedAltitudes = Array.from(
    document.querySelectorAll(
      '#levels input[type="checkbox"]:checked'
    )
  )
    .map(function (checkbox) {
      return Number.parseInt(
        checkbox.value,
        10
      );
    })
    .sort(function (firstAltitude, secondAltitude) {
      return firstAltitude - secondAltitude;
    });

  if (
    !Number.isFinite(currentLatitude) ||
    !Number.isFinite(currentLongitude)
  ) {
    setStatus(
      "Die Startkoordinaten sind ungültig.",
      "error"
    );

    return;
  }

  if (
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    setStatus(
      "Die Flugdauer ist ungültig.",
      "error"
    );

    return;
  }

  if (selectedAltitudes.length === 0) {
    setStatus(
      "Bitte mindestens eine Höhe auswählen.",
      "error"
    );

    return;
  }

  runButton.disabled = true;
  runButton.textContent = "Simulation läuft...";

  setStatus(
    "Trajektorien werden berechnet...",
    "loading"
  );

  clearSimulationLayers();

  window.setTimeout(function () {
    calculateSimulation(
      currentLatitude,
      currentLongitude,
      duration,
      selectedAltitudes
    );

    runButton.disabled = false;
    runButton.textContent = "Simulation ausführen";

    setStatus(
      selectedAltitudes.length +
      " Trajektorien wurden berechnet.",
      "success"
    );
  }, 500);
});

// ==========================================
// 10. TRAJEKTORIEN BERECHNEN
// ==========================================

function calculateSimulation(
  currentLatitude,
  currentLongitude,
  duration,
  selectedAltitudes
) {
  const routeColors = [
    "#1570a6",
    "#0b8b57",
    "#ea7d24",
    "#8b5cf6",
    "#dc2626",
    "#0891b2",
    "#ca8a04",
    "#db2777",
    "#4f46e5",
    "#059669",
    "#d97706",
    "#7c3aed"
  ];

  let tableRows = "";

  selectedAltitudes.forEach(
    function (altitude, index) {
      const points = [
        [currentLatitude, currentLongitude]
      ];

      const steps = Math.max(
        2,
        Math.round(duration * 4)
      );

      /*
       * Diese Berechnung erzeugt nur eine optische Simulation.
       * Sie verwendet keine realen Wetter- oder Winddaten.
       */
      const altitudeFactor =
        Math.min(altitude, 3000) / 3000;

      const directionAngle =
        45 +
        altitudeFactor * 55 +
        index * 2.5;

      const directionRadians =
        directionAngle * Math.PI / 180;

      const baseDistance =
        0.0035 +
        altitudeFactor * 0.0065;

      const driftLatitude =
        Math.cos(directionRadians) *
        baseDistance;

      const driftLongitude =
        Math.sin(directionRadians) *
        baseDistance;

      let calculatedLatitude =
        currentLatitude;

      let calculatedLongitude =
        currentLongitude;

      for (
        let step = 1;
        step <= steps;
        step += 1
      ) {
        const curveFactor =
          Math.sin(step / steps * Math.PI) *
          0.00035 *
          (index + 1);

        const randomLatitude =
          Math.random() * 0.0005 - 0.00025;

        const randomLongitude =
          Math.random() * 0.0005 - 0.00025;

        calculatedLatitude +=
          driftLatitude +
          curveFactor +
          randomLatitude;

        calculatedLongitude +=
          driftLongitude -
          curveFactor * 0.5 +
          randomLongitude;

        points.push([
          calculatedLatitude,
          calculatedLongitude
        ]);
      }

      const routeColor =
        routeColors[index % routeColors.length];

      const polyline = L.polyline(
        points,
        {
          color: routeColor,
          weight: 4,
          opacity: 0.82
        }
      ).addTo(map);

      simulationLayers.push(polyline);

      polyline.bindPopup(
        "<b>Simulierte Route</b><br>" +
        formatAltitude(altitude) +
        " über Grund"
      );

      const endPoint =
        points[points.length - 1];

      const endMarker = L.circleMarker(
        endPoint,
        {
          radius: 7,
          fillColor: routeColor,
          color: "#ffffff",
          weight: 2,
          fillOpacity: 1
        }
      )
        .addTo(map)
        .bindPopup(
          "<b>Simulierter Endpunkt</b><br>" +
          "Höhe: " +
          formatAltitude(altitude) +
          "<br>" +
          "Breitengrad: " +
          endPoint[0].toFixed(5) +
          "<br>" +
          "Längengrad: " +
          endPoint[1].toFixed(5)
        );

      simulationLayers.push(endMarker);

      const approximateDistance =
        calculateApproximateDistance(
          currentLatitude,
          currentLongitude,
          endPoint[0],
          endPoint[1]
        );

      tableRows += `
        <tr>
          <td>
            <span
              class="result-color"
              style="background-color: ${routeColor};"
            ></span>
            ${formatAltitude(altitude)}
          </td>

          <td>
            ${endPoint[0].toFixed(5)}
          </td>

          <td>
            ${endPoint[1].toFixed(5)}
          </td>

          <td>
            ${approximateDistance.toFixed(1)} km
          </td>
        </tr>
      `;
    }
  );

  displayResults(tableRows);
  fitMapToSimulation();
}

// ==========================================
// 11. ERGEBNISSE ANZEIGEN
// ==========================================

function displayResults(tableRows) {
  resultsContainer.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Höhe</th>
            <th>Lat. Ende</th>
            <th>Lon. Ende</th>
            <th>Entfernung</th>
          </tr>
        </thead>

        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;
}

// ==========================================
// 12. KARTE AN ROUTEN ANPASSEN
// ==========================================

function fitMapToSimulation() {
  if (simulationLayers.length === 0) {
    return;
  }

  const featureGroup = L.featureGroup(
    simulationLayers
  );

  const bounds = featureGroup.getBounds();

  if (bounds.isValid()) {
    map.fitBounds(
      bounds.pad(0.12),
      {
        maxZoom: 13
      }
    );
  }
}

// ==========================================
// 13. ALTE ROUTEN ENTFERNEN
// ==========================================

function clearSimulationLayers() {
  simulationLayers.forEach(function (layer) {
    map.removeLayer(layer);
  });

  simulationLayers = [];
}

// ==========================================
// 14. ENTFERNUNG BERECHNEN
// ==========================================

function calculateApproximateDistance(
  startLat,
  startLon,
  endLat,
  endLon
) {
  const earthRadius = 6371;

  const latitudeDifference =
    toRadians(endLat - startLat);

  const longitudeDifference =
    toRadians(endLon - startLon);

  const startLatitudeRadians =
    toRadians(startLat);

  const endLatitudeRadians =
    toRadians(endLat);

  const haversineValue =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(startLatitudeRadians) *
    Math.cos(endLatitudeRadians) *
    Math.sin(longitudeDifference / 2) ** 2;

  const angularDistance =
    2 *
    Math.atan2(
      Math.sqrt(haversineValue),
      Math.sqrt(1 - haversineValue)
    );

  return earthRadius * angularDistance;
}

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

// ==========================================
// 15. HÖHE FORMATIEREN
// ==========================================

function formatAltitude(altitude) {
  return new Intl.NumberFormat(
    "de-AT"
  ).format(altitude) + " m";
}

// ==========================================
// 16. STATUSMELDUNG
// ==========================================

function setStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className =
    "status-message " + type;
}

// ==========================================
// 17. HTML SICHER AUSGEBEN
// ==========================================

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
