const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const ALLOWED_HEIGHTS = new Set([10, 80, 120, 180]);
const ALLOWED_STEPS = new Set([10, 15, 20, 30]);

function radians(value) { return value * Math.PI / 180; }
function movePosition(lat, lon, speedKmh, direction, seconds) {
  const distance = speedKmh / 3.6 * seconds;
  const movementDirection = radians(direction + 180);
  return {
    lat: lat + distance * Math.cos(movementDirection) / 111320,
    lon: lon + distance * Math.sin(movementDirection) / (111320 * Math.max(0.01, Math.cos(radians(lat))))
  };
}
function valueAt(data, name, timestamp) {
  const index = data.hourly.time.findIndex((time) => Date.parse(`${time}Z`) >= timestamp);
  const safeIndex = index < 0 ? data.hourly.time.length - 1 : index;
  return Number(data.hourly[name][safeIndex]);
}
function validate(body) {
  const lat = Number(body.lat), lon = Number(body.lon), durationHours = Number(body.durationHours);
  const stepMinutes = Number(body.stepMinutes || 15);
  const startTimestamp = Date.parse(body.startTime);
  const levels = Array.isArray(body.levels) ? body.levels.map(Number) : [];
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error("Ungültiger Breitengrad.");
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error("Ungültiger Längengrad.");
  if (!Number.isFinite(startTimestamp)) throw new Error("Ungültige Startzeit.");
  if (!Number.isFinite(durationHours) || durationHours < 0.5 || durationHours > 12) throw new Error("Die Flugdauer muss zwischen 0,5 und 12 Stunden liegen.");
  if (!ALLOWED_STEPS.has(stepMinutes)) throw new Error("Ungültiger Berechnungsschritt.");
  if (!levels.length || levels.length > 4 || levels.some((level) => !ALLOWED_HEIGHTS.has(level))) throw new Error("Es müssen gültige ICON-D2-Höhen ausgewählt werden.");
  return { lat, lon, durationHours, stepMinutes, startTimestamp, levels };
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "POST") return response.status(405).json({ error: "Nur POST-Anfragen sind erlaubt." });
  try {
    const input = validate(request.body || {});
    const variables = input.levels.flatMap((height) => [`wind_speed_${height}m`, `wind_direction_${height}m`]).join(",");
    const url = `${OPEN_METEO_URL}?latitude=${input.lat}&longitude=${input.lon}&hourly=${variables}&models=icon_d2&forecast_days=2&timezone=UTC`;
    const apiResponse = await fetch(url);
    if (!apiResponse.ok) throw new Error(`ICON-D2-API-Fehler (${apiResponse.status}).`);
    const forecast = await apiResponse.json();
    const trajectories = input.levels.map((level) => {
      let position = { lat: input.lat, lon: input.lon };
      const points = [{ ...position, timestamp: input.startTimestamp }];
      const steps = Math.ceil(input.durationHours * 60 / input.stepMinutes);
      for (let step = 0; step < steps; step += 1) {
        const timestamp = input.startTimestamp + step * input.stepMinutes * 60000;
        position = movePosition(position.lat, position.lon, valueAt(forecast, `wind_speed_${level}m`, timestamp), valueAt(forecast, `wind_direction_${level}m`, timestamp), input.stepMinutes * 60);
        points.push({ ...position, timestamp });
      }
      return { level, points, landing: points[points.length - 1] };
    });
    return response.status(200).json({ model: "icon_d2", startTimestamp: input.startTimestamp, durationHours: input.durationHours, trajectories, notice: "Unverbindliche ICON-D2-Modellrechnung; keine geprüfte Flug- oder Landeprognose." });
  } catch (error) {
    console.error("Trajektorienfehler:", error);
    return response.status(400).json({ error: error.message || "Unbekannter Serverfehler." });
  }
}
