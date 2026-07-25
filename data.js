// data.js
// Field meanings:
// reading_id   - unique ID for the reading, format R001, R002...
// location     - name of the monitoring point along the river
// water_level_m - water level in metres above the river bed, measured at the pillar/sensor
// status       - "Normal" (< 3.0m), "Warning" (3.0m - 4.0m), "Danger" (> 4.0m), or "Faulty" (sensor error/stuck/out of range)
// recorded_at  - ISO timestamp of when the reading was taken
// device_id    - ID of the sensor node that produced the reading (D1, D2, D3)

const LOCATIONS = ["Pillar A - Upstream Bridge", "Pillar B - Village Ghat", "Pillar C - Downstream Barrage"];
const DEVICES = { "Pillar A - Upstream Bridge": "D1", "Pillar B - Village Ghat": "D2", "Pillar C - Downstream Barrage": "D3" };
const DANGER_THRESHOLD = 4.0;
const WARNING_THRESHOLD = 3.0;

function statusFor(level) {
  if (level === null || level === undefined || isNaN(level)) return "Faulty";
  if (level > 8 || level < 0) return "Faulty"; // implausible range
  if (level >= DANGER_THRESHOLD) return "Danger";
  if (level >= WARNING_THRESHOLD) return "Warning";
  return "Normal";
}

// Base 40-reading dataset (readings roughly every 30 min across 3 locations)
const READINGS = [];
let idCounter = 1;
let baseTime = new Date("2026-07-20T06:00:00");

// Generate a realistic rising-then-falling flood curve per location
const curve = [1.8,1.9,2.1,2.3,2.6,2.9,3.2,3.6,4.1,4.4,4.2,3.9,3.5,3.1];

for (let i = 0; i < 14; i++) {
  LOCATIONS.forEach((loc, li) => {
    const t = new Date(baseTime.getTime() + i * 30 * 60000);
    let level = curve[i] + (li * 0.15); // slight offset per location
    level = Math.round(level * 100) / 100;
    READINGS.push({
      reading_id: "R" + String(idCounter++).padStart(3, "0"),
      location: loc,
      water_level_m: level,
      status: statusFor(level),
      recorded_at: t.toISOString(),
      device_id: DEVICES[loc]
    });
  });
}

// Trim/pad to ~40 and inject the required awkward cases
while (READINGS.length > 37) READINGS.pop();

// 1. Missing value
READINGS.push({
  reading_id: "R" + String(idCounter++).padStart(3, "0"),
  location: "Pillar A - Upstream Bridge",
  water_level_m: null,
  status: statusFor(null),
  recorded_at: new Date(baseTime.getTime() + 14 * 30 * 60000).toISOString(),
  device_id: "D1"
});

// 2. Implausible out-of-range value
READINGS.push({
  reading_id: "R" + String(idCounter++).padStart(3, "0"),
  location: "Pillar B - Village Ghat",
  water_level_m: 27.4,
  status: statusFor(27.4),
  recorded_at: new Date(baseTime.getTime() + 14 * 30 * 60000).toISOString(),
  device_id: "D2"
});

// 3. Stuck reading (identical repeated value - classic faulty sensor sign)
READINGS.push({
  reading_id: "R" + String(idCounter++).padStart(3, "0"),
  location: "Pillar C - Downstream Barrage",
  water_level_m: 3.50,
  status: "Faulty",
  recorded_at: new Date(baseTime.getTime() + 14 * 30 * 60000).toISOString(),
  device_id: "D3"
});
READINGS.push({
  reading_id: "R" + String(idCounter++).padStart(3, "0"),
  location: "Pillar C - Downstream Barrage",
  water_level_m: 3.50,
  status: "Faulty",
  recorded_at: new Date(baseTime.getTime() + 15 * 30 * 60000).toISOString(),
  device_id: "D3"
});
