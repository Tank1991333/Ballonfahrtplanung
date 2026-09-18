const WINDY_API_URL =
    "https://api.windy.com/api/point-forecast/v2";

const ALLOWED_MODELS = new Set([
    "gfs",
    "icon",
    "iconEu",
    "iconD2"
]);

const ALLOWED_LEVELS = new Set([
    "surface",
    "1000h",
    "950h",
    "925h",
    "900h",
    "850h",
    "800h",
    "700h",
    "600h",
    "500h",
    "400h",
    "300h",
    "200h",
    "150h"
]);

const ALLOWED_STEPS = new Set([
    10,
    15,
    20,
    30
]);

const forecastCache = new Map();

function degreesToRadians(degrees) {
    return degrees * Math.PI / 180;
}

function radiansToDegrees(radians) {
    return radians * 180 / Math.PI;
}

function clamp(value, minimum, maximum) {
    return Math.max(
        minimum,
        Math.min(maximum, value)
    );
}

/*
 * Neue Position aus u- und v-Windkomponente berechnen.
 *
 * u > 0: Bewegung nach Osten
 * u < 0: Bewegung nach Westen
 * v > 0: Bewegung nach Norden
 * v < 0: Bewegung nach Süden
 */
function movePosition(
 *  latitude,
    longitude,
    win*U,
    windV,
    seconds
) {
    *onst earthRadius = 6371000;

    c*nst northwardDistance =
        wi*dV * seconds;

    const eastwardD*stance =
        windU * seconds;
*    const latitudeRadians =
      * degreesToRadians(latitude);

    *onst newLatitude =
        latitud* +
        radiansToDegrees(
     *      northwardDistance / earthRad*us
        );

    const cosineLat*tude =
        Math.max(
         *  0.01,
            Math.cos(latit*deRadians)
        );

    const n*wLongitude =
        longitude +
 *      radiansToDegrees(
          * eastwardDistance /
            (
*               earthRadius *
     *          cosineLatitude
         *  )
        );

    return {
     *  lat: clamp(
            newLatit*de,
            -89.8,
           *89.8
        ),

        lon:
    *       (
                (
       *            newLongitude + 540
                ) % 360
            ) - 180
    };
}

/*
 * Windwert zwischen zwei Vorhersagezeitpunkten interpolieren.
 */
function interpolateForecastValue(
    timestamps,
    values,
    targetTimestamp
) {
    if (
        !Array.isArray(timestamps) ||
        timestamps.length === 0 ||
        !Array.isArray(values)
    ) {
        throw new Error(
            "Die Windy-Antwort enthält keine vollständigen Winddaten."
        );
    }

    if (
        targetTimestamp < timestamps[0] ||
        targetTimestamp >
            timestamps[timestamps.length - 1]
    ) {
        throw new Error(
            "Startzeit oder Flugdauer liegt außerhalb des verfügbaren Vorhersagezeitraums."
        );
    }

    const exactIndex =
        timestamps.findIndex(
            (timestamp) =>
                timestamp === targetTimestamp
        );

    if (exactIndex >= 0) {
        const exactValue =
            values[exactIndex];

        if (exactValue === null) {
            throw new Error(
                "Für den gewählten Zeitpunkt sind keine Winddaten vorhanden."
            );
        }

        return exactValue;
    }

    const upperIndex =
        timestamps.findIndex(
            (timestamp) =>
                timestamp > targetTimestamp
        );

    if (upperIndex <= 0) {
        throw new Error(
            "Der Vorhersagezeitpunkt konnte nicht interpoliert werden."
        );
    }

    const lowerIndex =
        upperIndex - 1;

    const lowerTimestamp =
        timestamps[lowerIndex];

    const upperTimestamp =
        timestamps[upperIndex];

    const lowerValue =
        values[lowerIndex];

    const upperValue =
        values[upperIndex];

    if (
        lowerValue === null ||
        upperValue === null ||
        lowerValue === undefined ||
        upperValue === undefined
    ) {
        throw new Error(
            "Für den gewählten Zeitpunkt fehlen Winddaten."
        );
    }

    const interpolationFactor =
        (
            targetTimestamp -
            lowerTimestamp
        ) /
        (
            upperTimestamp -
            lowerTimestamp
        );

    return (
        lowerValue +
        (
            upperValue -
            lowerValue
        ) *
        interpolationFactor
    );
}

/*
 * Winddaten an einem Punkt von Windy abrufen.
 */
async function fetchWindyForecast(
    latitude,
    longitude,
    model,
    level
) {
    const windyApiKey =
        process.env.WINDY_POINT_FORECAST_KEY;

    if (!windyApiKey) {
        throw new Error(
            "Die Umgebungsvariable WINDY_POINT_FORECAST_KEY ist in Vercel nicht eingerichtet."
        );
    }

    /*
     * Windy rundet Punktvorhersagen etwa auf
     * zwei Dezimalstellen. Der Cache verwendet
     * deshalb dieselbe räumliche Genauigkeit.
     */
    const roundedLatitude =
        Math.round(latitude * 100) / 100;

    const roundedLongitude =
        Math.round(longitude * 100) / 100;

    const cacheKey = [
        model,
        level,
        roundedLatitude,
        roundedLongitude
    ].join("|");

    const cachedEntry =
        forecastCache.get(cacheKey);

    const cacheLifetime =
        15 * 60 * 1000;

    if (
        cachedEntry &&
        Date.now() - cachedEntry.createdAt <
            cacheLifetime
    ) {
        return cachedEntry.data;
    }

    const response = await fetch(
        WINDY_API_URL,
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({
                lat: roundedLatitude,
                lon: roundedLongitude,
                model,
                parameters: [
                    "wind"
                ],
                levels: [
                    level
                ],
                key: windyApiKey
            })
        }
    );

    if (!response.ok) {
        const responseText =
            await response.text();

        throw new Error(
            `Windy API Fehler ${response.status}: ${responseText}`
        );
    }

    const data =
        await response.json();

    forecastCache.set(
        cacheKey,
        {
            createdAt: Date.now(),
            data
        }
    );

    return data;
}

/*
 * Eine Trajektorie auf einer konstanten
 * Druckfläche berechnen.
 */
async function calculateSingleTrajectory({
    lat,
    lon,
    startTimestamp,
    durationHours,
    model,
    level,
    stepMinutes
}) {
    let currentPosition = {
        lat,
        lon
    };

    const points = [
        {
            lat,
            lon,
            timestamp:
                startTimestamp
        }
    ];

    const totalSeconds =
        durationHours * 3600;

    const normalStepSeconds =
        stepMinutes * 60;

    const numberOfSteps =
        Math.ceil(
            totalSeconds /
            normalStepSeconds
        );

    for (
        let stepIndex = 0;
        stepIndex < numberOfSteps;
        stepIndex += 1
    ) {
        const alreadyCalculatedSeconds =
            stepIndex *
            normalStepSeconds;

        const remainingSeconds =
            totalSeconds -
            alreadyCalculatedSeconds;

        const currentStepSeconds =
            Math.min(
                normalStepSeconds,
                remainingSeconds
            );

        const currentTimestamp =
            startTimestamp +
            alreadyCalculatedSeconds * 1000;

        const forecast =
            await fetchWindyForecast(
                currentPosition.lat,
                currentPosition.lon,
                model,
                level
            );

        const windUKey =
            `wind_u-${level}`;

        const windVKey =
            `wind_v-${level}`;

        if (
            !forecast[windUKey] ||
            !forecast[windVKey]
        ) {
            throw new Error(
                `Das Modell ${model} liefert für ${level} keine Windkomponenten.`
            );
        }

        const windU =
            interpolateForecastValue(
                forecast.ts,
                forecast[windUKey],
                currentTimestamp
            );

        const windV =
            interpolateForecastValue(
                forecast.ts,
                forecast[windVKey],
                currentTimestamp
            );

        const nextPosition =
            movePosition(
                currentPosition.lat,
                currentPosition.lon,
                windU,
                windV,
                currentStepSeconds
            );

        const nextTimestamp =
            currentTimestamp +
            currentStepSeconds * 1000;

        points.push({
            lat: nextPosition.lat,
            lon: nextPosition.lon,
            timestamp: nextTimestamp,
            windU,
            windV,
            windSpeed:
                Math.hypot(
                    windU,
                    windV
                )
        });

        currentPosition =
            nextPosition;
    }

    return {
        level,
        points,
        landing:
            points[points.length - 1]
    };
}

/*
 * Eingaben des Browsers prüfen.
 */
function validateRequest(body) {
    const lat =
        Number(body.lat);

    const lon =
        Number(body.lon);

    const durationHours =
        Number(body.durationHours);

    const stepMinutes =
        Number(body.stepMinutes);

    const startTimestamp =
        Date.parse(body.startTime);

    const model =
        String(body.model || "");

    const levels =
        body.levels;

    if (
        !Number.isFinite(lat) ||
        lat < -90 ||
        lat > 90
    ) {
        throw new Error(
            "Ungültiger Breitengrad."
        );
    }

    if (
        !Number.isFinite(lon) ||
        lon < -180 ||
        lon > 180
    ) {
        throw new Error(
            "Ungültiger Längengrad."
        );
    }

    if (
        !Number.isFinite(startTimestamp)
    ) {
        throw new Error(
            "Ungültige Startzeit."
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
        !ALLOWED_MODELS.has(model)
    ) {
        throw new Error(
            "Das ausgewählte Wettermodell ist nicht erlaubt."
        );
    }

    if (
        !Array.isArray(levels) ||
        levels.length < 1 ||
        levels.length > 6
    ) {
        throw new Error(
            "Es müssen eine bis sechs Höhen ausgewählt werden."
        );
    }

    if (
        levels.some(
            (level) =>
                !ALLOWED_LEVELS.has(level)
        )
    ) {
        throw new Error(
            "Mindestens eine ausgewählte Höhe ist ungültig."
        );
    }

    if (
        !ALLOWED_STEPS.has(stepMinutes)
    ) {
        throw new Error(
            "Der ausgewählte Berechnungsschritt ist ungültig."
        );
    }

    return {
        lat,
        lon,
        durationHours,
        stepMinutes,
        startTimestamp,
        model,
        levels
    };
}

/*
 * Vercel-API-Endpunkt
 */
export default async function handler(
    request,
    response
) {
    response.setHeader(
        "Cache-Control",
        "no-store"
    );

    if (request.method !== "POST") {
        response.setHeader(
            "Allow",
            "POST"
        );

        return response.status(405).json({
            error:
                "Nur POST-Anfragen sind erlaubt."
        });
    }

    try {
        const input =
            validateRequest(
                request.body || {}
            );

        /*
         * Die Höhen werden parallel berechnet.
         * Dadurch ist die Vercel-Funktion schneller.
         */
        const trajectoryPromises =
            input.levels.map((level) => {
                return calculateSingleTrajectory({
                    lat: input.lat,
                    lon: input.lon,
                    startTimestamp:
                        input.startTimestamp,
                    durationHours:
                        input.durationHours,
                    model:
                        input.model,
                    level,
                    stepMinutes:
                        input.stepMinutes
                });
            });

        const trajectories =
            await Promise.all(
                trajectoryPromises
            );

        return response.status(200).json({
            model:
                input.model,

            startTimestamp:
                input.startTimestamp,

            durationHours:
                input.durationHours,

            trajectories,

            notice:
                "Unverbindliche Modellrechnung. Die Endpunkte sind keine geprüften Landeplätze."
        });
    } catch (error) {
        console.error(
            "Trajektorienfehler:",
            error
        );

        return response.status(400).json({
            error:
                error.message ||
                "Unbekannter Serverfehler."
        });
    }
}
