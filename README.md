# River Flood Early-Warning System — Control Room Dashboard

**Problem in two lines:** A riverside block floods every monsoon but water level is read by eye and phoned in, so warnings arrive late and there is no record to learn from. This project measures the level continuously, warns locally the moment a danger threshold is crossed, and shows the control room live levels and trends.

## How to run it
### Web dashboard
1. Download/clone this repository.
2. Open `index.html` directly in any browser (no server or install needed).
3. The table loads the sample dataset from `data.js`. Every 8 seconds, `app.js` simulates a new sensor reading for each of the 3 monitoring points, using the same field names as the static dataset so both fit together.
4. Type in the search box or change the status dropdown to filter the list live.
5. Click any row to open its detail and summary view.
6. If a simulated reading crosses the Danger threshold (4.0 m), a red banner appears immediately at the top — this happens entirely in the browser with no network/server call, demonstrating the "local warning without network coverage" requirement.

### Wokwi sensor node
1. Go to wokwi.com → New Project → ESP32.
2. Paste the contents of `sensor_node.ino` into the sketch.
3. Add an HC-SR04 ultrasonic sensor (TRIG → GPIO5, ECHO → GPIO18), an LED (GPIO2), and a buzzer (GPIO4) to the Wokwi diagram.
4. Start the simulation and open the Serial Monitor to see each reading printed as JSON.
5. Drag the HC-SR04's simulated distance to trigger Warning/Danger status and watch the LED + buzzer activate locally.

## Field meanings (data.js)
| Field | Meaning | Values |
|---|---|---|
| reading_id | Unique ID per reading | R001, R002, ... |
| location | Name of the monitoring pillar | Pillar A/B/C |
| water_level_m | Water level in metres above the river bed | 0–8 plausible; `null` if missing/rejected |
| status | Derived from water_level_m | Normal (<3.0m), Warning (3.0–4.0m), Danger (>4.0m), Faulty (missing/out-of-range/stuck) |
| recorded_at | ISO timestamp of the reading | e.g. 2026-07-20T06:00:00Z |
| device_id | ID of the sensor node | D1, D2, D3 (one per location) |

Awkward cases included on purpose: one missing value, one implausible out-of-range value (27.4 m), and one stuck/repeated reading (3.50 m twice in a row) — these test the plausibility check and the Faulty status path.

## How the derived figure is calculated
On the detail view, the big number at the top is the **average water level at that location**, calculated only from valid (non-Faulty) readings for that pillar:
`avg = sum(water_level_m for valid readings at this location) / count(valid readings)`
Also shown: the max level recorded and how many times that point crossed Danger. This was checked by hand against the sample data in `data.js` for Pillar A.

## Sensing node logic (Task 4)
Two versions are included, both using the same field names so device output and dashboard match:

**1. `sensor_node.ino`** — an ESP32 sketch to run in Wokwi. It reads an HC-SR04 ultrasonic sensor on a fixed, non-blocking schedule (`millis()`, no `delay()` used for scheduling), rejects implausible readings, smooths with a 3-reading moving average, and drives an LED + buzzer the moment the danger threshold is crossed — entirely locally, with no dependency on network/WiFi. It also prints each reading as JSON matching `data.js`'s field names.

**2. In-browser simulation (`app.js`)** — generates readings the same way (plausibility check, moving average, local alert banner) every 8 seconds directly in the dashboard, so the web app is fully demonstrable without opening Wokwi separately.

## What is not finished
- `sensor_node.ino` is written for Wokwi simulation (per the brief's "SIMULATION ONLY" allowance) — it has not been run on physical hardware.
- The dashboard currently reads its browser-side simulated feed rather than a live serial/WiFi connection to the ESP32 — wiring the two together (e.g. ESP32 posting to a small local server) is a possible next step, not required at Easy level.
- Data is held in-memory for the browser session, so simulated readings reset on page reload.
- No authentication/multi-user control room login — out of scope for an Easy-level assessment.

## Screenshots & demo
_Add 3–4 screenshots (main list, filtered list, detail view, danger alert banner) and a short screen-recording link here before submitting._
