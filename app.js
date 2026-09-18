"use strict";

// ==========================================
// 1. DOM-ELEMENTE UND STARTWERTE
// ==========================================

const latInput = document.getElementById("lat");
const lonInput = document.getElementById("lon");
const displayLat = document.getElementById("display-lat");
const displayLon = document.getElementById("display-lon");
const currentLocationName = document.getElementById("current-location-name");

const durationRange = document.getElementById("duration");
const durationVal = document.getElementById("duration-val");
const dateInput = document.getElementById("date");

const statusMsg = document.getElementById("status");
const resultsDiv = document.getElementById("results");

const startLat = parseFloat(latInput.value) || 47.1696;
const startLon = parseFloat(lonInput.value) || 16.0093;

// ==========================================
// 2. KARTEN-INITIALISIERUNG
// ==========================================

const map = L.map("map", {
  zoomControl: true
}).setView([startLat, startLon], 12);

const tileLayer = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }
);

tileLayer.addTo(map);

const startMarker = L.marker(
  [startLat, startLon],
  {
    draggable: true
  }
).addTo(map);

startMarker
  .bindPopup(
    "<b>Startplatz</b><br>Marker verschieben oder auf die Karte klicken."
  )
  .openPopup();

// Enthält später alle erzeugten Linien und Endmarker.
let mapLayers = [];

// Nach dem Laden sicherstellen, dass Leaflet die Kartengröße richtig erkennt.
window.addEventListener("load", function () {
  window.setTimeout(function () {
    map.invalidateSize();
  }, 100);
});

// ==========================================
// 3. KOORDINATEN AKTUALISIEREN
// ==========================================

function updateCoordinates(lat, lon, locationName) {
  latInput.value = lat.toFixed(5);
  lonInput.value = lon.toFixed(5);

  displayLat.textContent = lat.toFixed(5);
  displayLon.textContent = lon.toFixed(5);

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
});

map.on("click", function (event) {
  startMarker.setLatLng(event.latlng);

  updateCoordinates(
    event.latlng.lat,
    event.latlng.lng,
    "Manuell gewählter Startpunkt"
  );
});

// ==========================================
// 4. DATUM UND FLUGDAUER
// ==========================================

function getLocalDateString() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;

  return new Date(now.getTime() - timezoneOffset)
    .toISOString()
    .split("T")[0];
}

dateInput.value = getLocalDateString();

durationRange.addEventListener("input", function (event) {
  const duration = parseFloat(event.target.value);
  durationVal.textContent = duration.toFixed(1) + " Stunden";
});

// ==========================================
// 5. HÖHENAUSWAHL
// ==========================================

const checkboxes = document.querySelectorAll(
  '#levels input[type="checkbox"]'
);

document
  .getElementById("btn-all-levels")
  .addEventListener("click", function () {
    checkboxes.forEach(function (checkbox) {
      checkbox.checked = true;
    });
  });

document
  .getElementById("btn-no-levels")
  .addEventListener("click", function () {
    checkboxes.forEach(function (checkbox) {
      checkbox.checked = false;
    });
  });

document
  .getElementById("btn-balloon-levels")
  .addEventListener("click", function () {
    const balloonAltitudes = ["80", "100", "150", "180"];

    checkboxes.forEach(function (checkbox) {
      checkbox.checked = balloonAltitudes.includes(checkbox.value);
    });
  });

// ==========================================
// 6. ORTSSUCHE
// ==========================================

const searchInput = document.getElementById("search-location");
const searchButton = document.getElementById("search-button");

async function searchLocation() {
  const query = searchInput.value.trim();

  if (!query) {
    alert("Bitte gib einen Ort oder eine Postleitzahl ein.");
    searchInput.focus();
    return;
  }

  const originalButtonText = searchButton.textContent;

  searchButton.disabled = true;
  searchButton.textContent = "Suche...";

  try {
    const url =
      "https://nominatim.openstreetmap.org/search" +
      "?format=jsonv2" +
      "&limit=1" +
      "&countrycodes=at" +
      "&q=" +
      encodeURIComponent(query);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("Die Ortssuche konnte nicht geladen werden.");
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      alert("Der eingegebene Ort wurde in Österreich nicht gefunden.");
      return;
    }

    const result = data[0];
    const latitude = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("Die gefundenen Koordinaten sind ungültig.");
    }

    startMarker.setLatLng([latitude, longitude]);
    map.setView([latitude, longitude], 13);

    updateCoordinates(
      latitude,
      longitude,
      result.display_name || query
    );

    startMarker
      .bindPopup(
        "<b>Startplatz</b><br>" +
        escapeHtml(result.display_name || query)
      )
      .openPopup();
  } catch (error) {
    console.error("Fehler bei der Ortssuche:", error);

    alert(
      "Die Ortssuche ist derzeit nicht verfügbar. " +
      "Du kannst den Startpunkt direkt auf der Karte auswählen."
    );
  } finally {
    searchButton.disabled = false;
    searchButton.textContent = originalButtonText;
  }
}

searchButton.addEventListener("click", searchLocation);

searchInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    searchLocation();
  }
});

// ==========================================
// 7. TRAJEKTORIEN-SIMULATION
// ==========================================

document.getElementById("run").addEventListener("click", function () {
  statusMsg.textContent = "Berechne Trajektorien...";
  statusMsg.className = "status-message loading";

  const currentLat = parseFloat(latInput.value);
  const currentLon = parseFloat(lonInput.value);
  const duration = parseFloat(durationRange.value);

  const selectedHeights = Array.from(
    document.querySelectorAll(
      '#levels input[type="checkbox"]:checked'
    )
  ).map(function (checkbox) {
    return checkbox.value;
  });

  if (!Number.isFinite(currentLat) || !Number.isFinite(currentLon)) {
    setStatus(
      "Die Koordinaten sind ungültig.",
      "error"
    );
    return;
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    setStatus(
      "Die Flugdauer ist ungültig.",
      "error"
    );
    return;
  }

  if (selectedHeights.length === 0) {
    setStatus(
      "Bitte mindestens eine Höhe auswählen.",
      "error"
    );

    alert("Bitte wählen Sie mindestens eine Höhe aus.");
    return;
  }

  clearSimulationLayers();

  window.setTimeout(function () {
    let tableRowsHtml = "";

    const colors = [
      "#169df5",
      "#43d17c",
      "#ffad33",
      "#ffd166",
      "#b25cff",
      "#ff5252",
      "#00d4c7",
      "#ff7eb6"
    ];

    selectedHeights.forEach(function (height, index) {
      const points = [[currentLat, currentLon]];

      // Zwei Wegpunkte pro Stunde, mindestens ein Schritt.
      const steps = Math.max(1, Math.round(duration * 2));

      // Unterschiedliche Modellbewegung je ausgewählter Höhe.
      const windDriftLat = 0.012 + index * 0.003;
      const windDriftLon = 0.022 - index * 0.002;

      let calculatedLat = currentLat;
      let calculatedLon = currentLon;

      for (let step = 1; step <= steps; step += 1) {
        calculatedLat +=
          windDriftLat +
          (Math.random() * 0.002 - 0.001);

        calculatedLon +=
          windDriftLon +
          (Math.random() * 0.002 - 0.001);

        points.push([calculatedLat, calculatedLon]);
      }

      const lineColor = colors[index % colors.length];

      const polyline = L.polyline(points, {
        color: lineColor,
        weight: 4,
        opacity: 0.82
      }).addTo(map);

      mapLayers.push(polyline);

      const endPoint = points[points.length - 1];

      const endMarker = L.circleMarker(endPoint, {
        radius: 6,
        fillColor: lineColor,
        color: "#ffffff",
        weight: 2,
        fillOpacity: 1
      })
        .addTo(map)
        .bindPopup(
          "<b>Simulierter Endpunkt</b><br>" +
          escapeHtml(height) +
          " m über Grund"
        );

      mapLayers.push(endMarker);

      tableRowsHtml += `
        <tr>
          <td>
            <span
              class="result-color"
              style="background:${lineColor};"
            ></span>
            ${escapeHtml(height)} m
          </td>
          <td>${endPoint[0].toFixed(4)}</td>
          <td>${endPoint[1].toFixed(4)}</td>
        </tr>
      `;
    });

    if (mapLayers.length > 0) {
      const featureGroup = L.featureGroup(mapLayers);
      const bounds = featureGroup.getBounds();

      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.1));
      }
    }

    resultsDiv.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Höhe</th>
              <th>Lat. Ende</th>
              <th>Lon. Ende</th>
            </tr>
          </thead>

          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </div>
    `;

    setStatus(
      "Simulation abgeschlossen.",
      "success"
    );
  }, 600);
});

// ==========================================
// 8. HILFSFUNKTIONEN
// ==========================================

function clearSimulationLayers() {
  mapLayers.forEach(function (layer) {
    map.removeLayer(layer);
  });

  mapLayers = [];
}

function setStatus(message, type) {
  statusMsg.textContent = message;
  statusMsg.className = "status-message " + type;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
