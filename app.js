"use strict";

/*
 * Windy Ballonfahrtplanung
 * Browser-Anwendung mit Leaflet-Karte
 */

const DEFAULT_POSITION = {
    lat: 47.281,
    lon: 15.97
};

const LEVELS = [
    {
        value: "surface",
        name: "Bodennah",
        description: "Modelloberfläche"
    },
    {
        value: "1000h",
        name: "1000 hPa",
        description: "ungefähr 0 bis 150 m"
    },
    {
        value: "950h",
        name: "950 hPa",
        description: "ungefähr 500 m"
    },
    {
        value: "925h",
        name: "925 hPa",
        description: "ungefähr 750 m"
    },
    {
        value: "900h",
        name: "900 hPa",
        description: "ungefähr 1.000 m"
    },
    {
        value: "850h",
        name: "850 hPa",
        description: "ungefähr 1.500 m"
    },
    {
        value: "800h",
        name: "800 hPa",
        description: "ungefähr 2.000 m"
    },
    {
        value: "700h",
        name: "700 hPa",
        description: "ungefähr 3.000 m"
    },
    {
        value: "600h",
        name: "600 hPa",
        description: "ungefähr 4.200 m"
    },
    {
        value: "500h",
        name: "500 hPa",
        description: "ungefähr 5.500 m"
    }
];

const DEFAULT_SELECTED_LEVELS = [
    "900h",
    "850h",
    "800h"
];

const COLORS = [
    "#e53935",
    "#1565c0",
    "#2e7d32",
    "#8e24aa",
    "#ef6c00",
    "#00838f"
];

const latInput = document.getElementById("lat");
const lonInput = document.getElementById("lon");
const startInput = document.getElementById("start");
const durationInput = document.getElementById("duration");
const modelInput = document.getElementById("model");
const stepInput = document.getElementById("step");

const levelsContainer = document.getElementById("levels");
const runButton = document.getElementById("run");
const updatePositionButton =
    document.getElementById("update-position");

const statusElement = document.getElementById("status");
const resultsElement = document.getElementById("results");

/*
 * Leaflet-Karte erstellen
 */
const map = L.map("map", {
    zoomControl: true
}).setView(
    [DEFAULT_POSITION.lat, DEFAULT_POSITION.lon],
    9
);

/*
 * OpenStreetMap-Hintergrundkarte
 */
L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution:
            "&copy; OpenStreetMap-Mitwirkende"
    }
).addTo(map);

/*
 * Eigenes Startsymbol
 */
const startIcon = L.divIcon({
    className: "",
    html: `
        <div class="custom-start-marker">
            <span>🎈</span>
        </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30]
});

let startMarker = L.marker(
    [DEFAULT_POSITION.lat, DEFAULT_POSITION.lon],
    {
        draggable: true,
        icon: startIcon
    }
).addTo(map);

startMarker
    .bindPopup("<strong>Startplatz</strong>")
    .openPopup();

let trajectoryLayers = [];

/*
 * Höhenoptionen erzeugen
 */
function createHeightOptions() {
    levelsContainer.innerHTML = "";

    LEVELS.forEach((level) => {
        const wrapper = document.createElement("div");
        wrapper.className = "height-option";

        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.id = `level-${level.value}`;
        checkbox.value = level.value;
        checkbox.checked =
            DEFAULT_SELECTED_LEVELS.includes(level.value);

        const label = document.createElement("label");
        label.htmlFor = checkbox.id;

        label.innerHTML = `
            <span class="height-name">${level.name}</span>
            <span class="height-description">
                ${level.description}
            </span>
        `;

        checkbox.addEventListener("change", () => {
            const selected = getSelectedLevels();

            if (selected.length > 6) {
                checkbox.checked = false;

                setStatus(
                    "Du kannst maximal sechs Höhen gleichzeitig auswählen.",
                    "error"
                );
            }
        });

        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        levelsContainer.appendChild(wrapper);
    });
}

/*
 * Standardstartzeit auf die nächste volle Stunde setzen
 */
function setDefaultStartTime() {
    const startDate = new Date();

    startDate.setHours(startDate.getHours() + 1);
    startDate.setMinutes(0);
    startDate.setSeconds(0);
    startDate.setMilliseconds(0);

    const localDate = new Date(
        startDate.getTime() -
        startDate.getTimezoneOffset() * 60000
    );

    startInput.value =
        localDate.toISOString().slice(0, 16);
}

/*
 * Ausgewählte Höhen auslesen
 */
function getSelectedLevels() {
    return Array.from(
        document.querySelectorAll(
            "#levels input[type='checkbox'\]:checked"
        )
    ).map((checkbox) => checkbox.value);
}

/*
 * Bezeichnung einer Druckhöhe
 */
function getLevelLabel(levelValue) {
    const level = LEVELS.find(
        (entry) => entry.value === levelValue
    );

    if (!level) {
        return levelValue;
    }

    return `${level.name}, ${level.description}`;
}

/*
 * Statusmeldung setzen
 */
function setStatus(message, type = "") {
    statusElement.textContent = message;
    statusElement.className = "status-box";

    if (type) {
        statusElement.classList.add(type);
    }
}

/*
 * Startkoordinaten aktualisieren
 */
function updateStartPosition(lat, lon, centerMap = false) {
    const latitude = Number(lat);
    const longitude = Number(lon);

    if (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90
    ) {
        throw new Error("Der Breitengrad ist ungültig.");
    }

    if (
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
    ) {
        throw new Error("Der Längengrad ist ungültig.");
    }

    latInput.value = latitude.toFixed(5);
    lonInput.value = longitude.toFixed(5);

    startMarker.setLatLng([latitude, longitude]);

    if (centerMap) {
        map.setView(
            [latitude, longitude],
            Math.max(map.getZoom(), 10)
        );
    }
}

/*
 * Kartenklick als neuer Startplatz
 */
map.on("click", (event) => {
    updateStartPosition(
        event.latlng.lat,
        event.latlng.lng,
        false
    );

    startMarker
        .bindPopup(
            `
                <strong>Startplatz</strong><br>
                ${event.latlng.lat.toFixed(5)},
                ${event.latlng.lng.toFixed(5)}
            `
        )
        .openPopup();
});

/*
 * Verschieben des Startmarkers
 */
startMarker.on("dragend", (event) => {
    const position =
        event.target.getLatLng();

    updateStartPosition(
        position.lat,
        position.lng,
        false
    );
});

/*
 * Karte auf Koordinaten zentrieren
 */
updatePositionButton.addEventListener("click", () => {
    try {
        updateStartPosition(
            latInput.value,
            lonInput.value,
            true
        );

        setStatus(
            "Startplatz wurde aktualisiert.",
            "success"
        );
    } catch (error) {
        setStatus(error.message, "error");
    }
});

/*
 * Frühere Trajektorien entfernen
 */
function clearTrajectoryLayers() {
    trajectoryLayers.forEach((layer) => {
        map.removeLayer(layer);
    });

    trajectoryLayers = [];
}

/*
 * Distanz zwischen zwei Koordinaten berechnen
 */
function calculateDistanceKm(pointA, pointB) {
    const toRadians = (degrees) =>
        degrees * Math.PI / 180;

    const earthRadiusKm = 6371;

    const latitudeDifference = toRadians(
        pointB.lat - pointA.lat
    );

    const longitudeDifference = toRadians(
        pointB.lon - pointA.lon
    );

    const latitudeA = toRadians(pointA.lat);
    const latitudeB = toRadians(pointB.lat);

    const haversine =
        Math.sin(latitudeDifference / 2) ** 2 +
        Math.cos(latitudeA) *
        Math.cos(latitudeB) *
        Math.sin(longitudeDifference / 2) ** 2;

    return (
        2 *
        earthRadiusKm *
        Math.asin(Math.sqrt(haversine))
    );
}

/*
 * Ergebnisse auf Karte darstellen
 */
function showTrajectories(data) {
    clearTrajectoryLayers();

    resultsElement.innerHTML = "";

    const allCoordinates = [];

    data.trajectories.forEach(
        (trajectory, index) => {
            const color =
                COLORS[index % COLORS.length];

            const coordinates =
                trajectory.points.map((point) => [
                    point.lat,
                    point.lon
                ]);

            allCoordinates.push(...coordinates);

            const routeLine = L.polyline(
                coordinates,
                {
                    color,
                    weight: 4,
                    opacity: 0.9,
                    lineJoin: "round"
                }
            ).addTo(map);

            routeLine.bindTooltip(
                getLevelLabel(trajectory.level),
                {
                    sticky: true
                }
            );

            const landing = trajectory.landing;

            const landingMarker = L.circleMarker(
                [landing.lat, landing.lon],
                {
                    radius: 9,
                    color: "#ffffff",
                    weight: 3,
                    fillColor: color,
                    fillOpacity: 1
                }
            ).addTo(map);

            const startPoint =
                trajectory.points[0];

            const distance = calculateDistanceKm(
                startPoint,
                landing
            );

            const mapsLink =
                `https://www.openstreetmap.org/` +
                `?mlat=${landing.lat}` +
                `&mlon=${landing.lon}` +
                `#map=14/${landing.lat}/${landing.lon}`;

            landingMarker.bindPopup(`
                <strong>Möglicher Endpunkt</strong><br>
                ${getLevelLabel(trajectory.level)}<br><br>

                Koordinaten:<br>
                ${landing.lat.toFixed(5)},
                ${landing.lon.toFixed(5)}<br><br>

                Entfernung vom Start:
                ${distance.toFixed(1)} km<br><br>

                <a
                    href="${mapsLink}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Position in OpenStreetMap öffnen
                </a>
            `);

            trajectoryLayers.push(
                routeLine,
                landingMarker
            );

            const card =
                document.createElement("div");

            card.className = "result-card";

            card.innerHTML = `
                <div class="result-title">
                    <span
                        class="result-color"
                        style="background:${color}"
                    ></span>

                    ${getLevelLabel(trajectory.level)}
                </div>

                <div class="result-coordinate">
                    Endpunkt:
                    ${landing.lat.toFixed(5)},
                    ${landing.lon.toFixed(5)}
                </div>

                <div>
                    Entfernung vom Start:
                    ${distance.toFixed(1)} km
                </div>
            `;

            resultsElement.appendChild(card);
        }
    );

    if (allCoordinates.length > 1) {
        map.fitBounds(
            L.latLngBounds(allCoordinates),
            {
                padding: [45, 45]
            }
        );
    }
}

/*
 * Eingaben prüfen
 */
function validateInputs() {
    const lat = Number(latInput.value);
    const lon = Number(lonInput.value);
    const durationHours =
        Number(durationInput.value);

    const stepMinutes =
        Number(stepInput.value);

    const selectedLevels =
        getSelectedLevels();

    if (
        !Number.isFinite(lat) ||
        lat < -90 ||
        lat > 90
    ) {
        throw new Error(
            "Bitte einen gültigen Breitengrad eingeben."
        );
    }

    if (
        !Number.isFinite(lon) ||
        lon < -180 ||
        lon > 180
    ) {
        throw new Error(
            "Bitte einen gültigen Längengrad eingeben."
        );
    }

    if (!startInput.value) {
        throw new Error(
            "Bitte eine Startzeit auswählen."
        );
    }

    const startDate =
        new Date(startInput.value);

    if (
        Number.isNaN(startDate.getTime())
    ) {
        throw new Error(
            "Die eingegebene Startzeit ist ungültig."
        );
    }

    if (
        !Number.isFinite(durationHours) ||
        durationHours < 0.5 ||
        durationHours > 12
    ) {
        throw new Error(
            "Die Flugdauer muss zwischen 0,5 und 12 Stunden liegen."
        );
    }

    if (
        selectedLevels.length < 1 ||
        selectedLevels.length > 6
    ) {
        throw new Error(
            "Bitte eine bis sechs Höhen auswählen."
        );
    }

    return {
        lat,
        lon,
        startTime: startDate.toISOString(),
        durationHours,
        model: modelInput.value,
        levels: selectedLevels,
        stepMinutes
    };
}

/*
 * Trajektorien vom Vercel-Backend abrufen
 */
async function calculateTrajectories() {
    try {
        const requestData =
            validateInputs();

        runButton.disabled = true;
        runButton.textContent =
            "Trajektorien werden berechnet …";

        setStatus(
            "Winddaten werden von der Windy Point Forecast API abgerufen. Das kann einige Sekunden dauern.",
            "loading"
        );

        clearTrajectoryLayers();

        const response = await fetch(
            "/api/trajectory",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify(
                    requestData
                )
            }
        );

        let responseData;

        try {
            responseData =
                await response.json();
        } catch {
            throw new Error(
                "Der Server hat keine gültige JSON-Antwort geliefert."
            );
        }

        if (!response.ok) {
            throw new Error(
                responseData.error ||
                `Serverfehler ${response.status}`
            );
        }

        if (
            !Array.isArray(
                responseData.trajectories
            ) ||
            responseData.trajectories.length === 0
        ) {
            throw new Error(
                "Es wurden keine Trajektorien zurückgegeben."
            );
        }

        showTrajectories(responseData);

        setStatus(
            responseData.notice ||
            "Berechnung erfolgreich abgeschlossen.",
            "success"
        );
    } catch (error) {
        console.error(error);

        setStatus(
            `Fehler: ${error.message}`,
            "error"
        );
    } finally {
        runButton.disabled = false;
        runButton.textContent =
            "Trajektorien berechnen";
    }
}

runButton.addEventListener(
    "click",
    calculateTrajectories
);

/*
 * Anwendung initialisieren
 */
createHeightOptions();
setDefaultStartTime();

/*
 * Leaflet muss nach dem Layoutaufbau
 * die Kartengröße neu prüfen.
 */
window.setTimeout(() => {
    map.invalidateSize();
}, 200);
