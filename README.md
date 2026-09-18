# Ballonfahrtplanung

Eine freie und einfach nutzbare Ballon-Simulationsseite für Österreich mit interaktiver Karte, Startort-Auswahl und Winddaten aus dem kostenlosen ICON-D2-Modell von Open-Meteo.

## Übersicht

Dieses Projekt zeigt eine Ballon-Trajektorien-Simulation mit:

- Auswahl eines Startortes per Suche oder Karte
- Auswahl mehrerer Höhenstufen
- Angabe von Datum, Startzeit und Flugdauer
- Berechnung von Flugpfaden mit realen Winddaten aus ICON-D2
- Darstellung auf einer OpenStreetMap-Karte

## Funktionen

- Interaktive Karte via Leaflet
- Suche nach Orten in Österreich über Nominatim
- Auswahl zwischen Höhenstufen
- Berechnung von Trajektorien basierend auf Winddaten
- Ergebnis-Tabelle mit Endpunkten und Entfernungen
- Keine API-Key erforderlich

## Technologie

- HTML / CSS / JavaScript
- Leaflet für Karten
- Open-Meteo API für freie ICON-D2-Winddaten

## Projektstruktur

- `index.html` – Hauptseite
- `styles.css` – Styling
- `app.js` – Frontend-Logik und Simulation
- `api/trajectory.js` – kostenlose ICON-D2-Trajektorien-API

## Nutzung

1. Repository klonen
2. Die Seite lokal mit einem statischen Webserver starten, z. B.:

```bash
python -m http.server 8000
```

3. Im Browser die Datei `index.html` oder `http://localhost:8000` öffnen
4. Startort wählen und Simulation ausführen

## Hinweis zur API

Die Simulation nutzt die kostenlose Open-Meteo-API mit dem Modell `icon_d2`.
Es ist kein eigener API-Key erforderlich.

## Wichtiger Hinweis

Die dargestellten Routen sind nur Modellrechnungen und keine geprüfte Flug- oder Landeprognose. Sie dienen ausschließlich der Demonstration und Visualisierung.

## Lizenz

Dieses Projekt ist frei nutzbar und kann für Bildungs- oder Demo-Zwecke erweitert werden.
