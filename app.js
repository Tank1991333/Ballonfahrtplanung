:root {
  --background: #061321;
  --panel: rgba(7, 28, 46, 0.94);
  --panel-light: rgba(18, 48, 74, 0.74);
  --border: rgba(145, 194, 230, 0.2);
  --text: #f4f8fc;
  --muted: #a7b8c9;
  --blue: #169df5;
  --green: #43d17c;
  --orange: #ffad33;
  --red: #ff5252;
  --violet: #b25cff;
  --yellow: #ffd166;
  --shadow: 0 18px 55px rgba(0, 0, 0, 0.36);
}

* {
  box-sizing: border-box;
}

html {
  min-height: 100%;
}

body {
  min-height: 100vh;
  margin: 0;
  background:
    linear-gradient(
      180deg,
      rgba(4, 15, 27, 0.18),
      rgba(4, 15, 27, 0.86) 390px,
      #061321 900px
    ),
    url("./balloon-bg.jpg") center top / cover fixed no-repeat,
    #061321;
  color: var(--text);
  font-family: Inter, Arial, sans-serif;
}

button,
input {
  font: inherit;
}

button {
  cursor: pointer;
}

.hero {
  position: relative;
  min-height: 255px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  padding: 36px 25px 30px;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(2, 14, 25, 0.94),
    rgba(2, 14, 25, 0.43) 65%,
    rgba(2, 14, 25, 0.15)
  );
}

.hero-content {
  position: relative;
  width: min(1750px, 100%);
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 30px;
}

.brand {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.brand-icon {
  width: 70px;
  height: 70px;
  display: grid;
  flex: 0 0 70px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 2.3rem;
  backdrop-filter: blur(12px);
}

.eyebrow,
.section-title small,
.map-message small {
  display: block;
  margin-bottom: 5px;
  color: #60c4ff;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

h1 {
  margin: 0;
  font-size: clamp(2.2rem, 5vw, 4.5rem);
  line-height: 1;
}

.hero-text {
  max-width: 730px;
  margin: 14px 0 0;
  color: #e0ebf4;
  line-height: 1.6;
}

.technology-badge {
  border-radius: 999px;
  background: rgba(250, 252, 255, 0.93);
  color: #17456a;
  padding: 11px 17px;
  font-size: 0.8rem;
  font-weight: 800;
}

.app-layout {
  width: min(1750px, calc(100% - 28px));
  margin: 18px auto;
  display: grid;
  grid-template-columns: 380px 480px minmax(500px, 1fr);
  gap: 14px;
  align-items: start;
}

.sidebar,
.results-column {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card {
  border: 1px solid var(--border);
  border-radius: 18px;
  background: linear-gradient(
    145deg,
    rgba(15, 43, 67, 0.96),
    rgba(6, 24, 40, 0.94)
  );
  box-shadow: var(--shadow);
  padding: 19px;
  backdrop-filter: blur(18px);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 18px;
}

.section-title.compact {
  margin-bottom: 10px;
}

.section-title h2 {
  margin: 0;
  font-size: 1.08rem;
}

.step {
  width: 34px;
  height: 34px;
  display: grid;
  flex: 0 0 34px;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(145deg, #1ba3ff, #0675df);
  font-weight: 900;
}

label {
  display: block;
  color: #e0ebf5;
  font-size: 0.79rem;
  font-weight: 650;
}

input[type="search"],
input[type="date"],
input[type="time"] {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--border);
  border-radius: 10px;
  outline: none;
  background: rgba(4, 19, 33, 0.72);
  color: white;
  padding: 10px 12px;
}

input[type="date"] {
  color-scheme: dark;
}

input:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(22, 157, 245, 0.15);
}

.search-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  margin-top: 7px;
}

button {
  border: 1px solid var(--border);
  border-radius: 9px;
  background: rgba(21, 57, 85, 0.92);
  color: white;
  padding: 9px 12px;
}

button:hover {
  border-color: var(--blue);
  filter: brightness(1.12);
}

.search-row button,
.primary-button {
  border: 0;
  background: linear-gradient(145deg, #1aa5ff, #0675dc);
  font-weight: 800;
}

.search-results {
  display: grid;
  gap: 6px;
  margin-top: 8px;
}

.search-result {
  width: 100%;
  text-align: left;
}

.search-result strong,
.search-result span {
  display: block;
}

.search-result span {
  margin-top: 3px;
  color: var(--muted);
  font-size: 0.72rem;
}

.hint,
.status-message,
.level-explanation {
  color: var(--muted);
  font-size: 0.75rem;
  line-height: 1.5;
}

.location-box {
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 12px;
  background: rgba(3, 18, 31, 0.55);
  padding: 13px;
}

.pin {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--blue);
}

.coordinates {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 12px;
  margin-top: 5px;
  color: var(--muted);
  font-size: 0.68rem;
}

.coordinates b {
  color: #5ec5ff;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
  margin-bottom: 18px;
}

.field-grid label {
  margin-bottom: 7px;
}

.range-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.range-header strong {
  color: #62c8ff;
  font-size: 0.79rem;
}

input[type="range"] {
  width: 100%;
  margin-top: 10px;
  accent-color: var(--blue);
}

.range-labels {
  display: flex;
  justify-content: space-between;
  color: #8296aa;
  font-size: 0.64rem;
}

.level-actions {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
  margin-bottom: 15px;
}

.level-group {
  margin-top: 15px;
}

.level-group h3 {
  margin: 0 0 9px;
  font-size: 0.84rem;
}

.height-selector {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 7px;
}

.height-selector label {
  position: relative;
}

.height-selector input {
  position: absolute;
  pointer-events: none;
  opacity: 0;
}

.height-selector span {
  display: grid;
  min-height: 38px;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: rgba(3, 18, 31, 0.56);
  color: var(--muted);
  font-size: 0.72rem;
  transition: 150ms ease;
  cursor: pointer;
}

.height-selector input:checked + span {
  border-color: #28aaff;
  background: rgba(22, 157, 245, 0.2);
  color: white;
  box-shadow: 0 0 0 2px rgba(22, 157, 245, 0.1);
}

.pressure-selector input:checked + span {
  border-color: #b25cff;
  background: rgba(178, 92, 255, 0.18);
}

.primary-button {
  width: 100%;
  min-height: 48px;
  margin-top: 18px;
}

.status-message.success {
  color: #61e7a1;
}

.status-message.error {
  color: #ff929e;
}

.empty-state {
  display: flex;
  align-items: center;
  gap: 13px;
  border: 1px dashed var(--border);
  border-radius: 12px;
  padding: 17px;
  color: var(--muted);
}

.empty-state > span {
  font-size: 2rem;
}

.empty-state p {
  margin: 4px 0 0;
  font-size: 0.75rem;
}

.hidden {
  display: none !important;
}

.weather-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.weather-grid div {
  border-radius: 10px;
  background: rgba(3, 18, 31, 0.52);
  padding: 11px;
}

.weather-grid span,
.weather-grid strong {
  display: block;
}

.weather-grid span {
  color: var(--muted);
  font-size: 0.68rem;
}

.weather-grid strong {
  margin-top: 4px;
  font-size: 0.82rem;
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.72rem;
}

th,
td {
  border-bottom: 1px solid var(--border);
  padding: 10px 5px;
  text-align: left;
  white-space: nowrap;
}

th {
  color: var(--muted);
}

.no-data {
  padding: 25px 5px;
  color: var(--muted);
  text-align: center;
}

.map-panel {
  position: sticky;
  top: 14px;
  height: calc(100vh - 28px);
  min-height: 760px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: var(--shadow);
}

#map {
  width: 100%;
  height: 100%;
  min-height: 760px;
}

.map-message,
.map-legend {
  position: absolute;
  z-index: 500;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: rgba(5, 23, 39, 0.93);
  color: white;
  padding: 11px 13px;
  backdrop-filter: blur(12px);
}

.map-message {
  top: 14px;
  left: 58px;
  display: flex;
  align-items: center;
  gap: 9px;
}

.map-message span {
  font-size: 1.4rem;
}

.map-message strong {
  display: block;
  font-size: 0.76rem;
}

.map-legend {
  top: 14px;
  right: 14px;
  min-width: 160px;
}

.map-legend h3 {
  margin: 0 0 8px;
  font-size: 0.78rem;
}

.map-legend p {
  margin: 5px 0;
  color: var(--muted);
  font-size: 0.7rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 7px 0;
  font-size: 0.7rem;
}

.legend-line {
  width: 27px;
  border-top: 4px solid;
}

.warning {
  width: min(1750px, calc(100% - 28px));
  margin: 0 auto 20px;
  display: flex;
  gap: 15px;
  border: 1px solid rgba(255, 209, 102, 0.32);
  border-radius: 16px;
  background: rgba(61, 42, 17, 0.72);
  padding: 19px;
}

.warning-icon {
  width: 40px;
  height: 40px;
  display: grid;
  flex: 0 0 40px;
  place-items: center;
  border: 2px solid var(--yellow);
  border-radius: 50%;
  color: var(--yellow);
  font-weight: 900;
}

.warning h2 {
  margin: 0 0 6px;
  color: var(--yellow);
  font-size: 1rem;
}

.warning p {
  margin: 0;
  color: #e8dfc3;
  font-size: 0.78rem;
  line-height: 1.6;
}

footer {
  color: var(--muted);
  padding: 14px 20px 30px;
  text-align: center;
  font-size: 0.72rem;
}

.leaflet-popup-content-wrapper,
.leaflet-popup-tip {
  background: #0b243a;
  color: white;
}

@media (max-width: 1350px) {
  .app-layout {
    grid-template-columns: 390px 1fr;
  }

  .map-panel {
    grid-column: 2;
    grid-row: 1 / span 2;
  }
}

@media (max-width: 900px) {
  .hero-content {
    display: block;
  }

  .technology-badge {
    display: inline-block;
    margin-top: 18px;
  }

  .app-layout {
    grid-template-columns: 1fr;
  }

  .map-panel {
    position: relative;
    top: auto;
    grid-column: auto;
    grid-row: auto;
    height: 70vh;
    min-height: 580px;
  }

  #map {
    min-height: 580px;
  }
}

@media (max-width: 540px) {
  .brand {
    display: block;
  }

  .brand-icon {
    margin-bottom: 14px;
  }

  .field-grid,
  .weather-grid {
    grid-template-columns: 1fr;
  }

  .height-selector {
    grid-template-columns: repeat(3, 1fr);
  }

  .search-row {
    grid-template-columns: 1fr;
  }

  .map-message {
    top: 62px;
    left: 10px;
    right: 10px;
  }
}
