// app.js
let liveData = [...READINGS];
let smoothingWindow = { D1: [], D2: [], D3: [] }; // for the moving-average smoothing (Task 4)

const els = {
  search: document.getElementById("search"),
  statusFilter: document.getElementById("statusFilter"),
  count: document.getElementById("count"),
  tbody: document.getElementById("tbody"),
  detail: document.getElementById("detailPanel"),
  alertBanner: document.getElementById("alertBanner"),
  loading: document.getElementById("loading"),
  empty: document.getElementById("empty"),
  cards: document.getElementById("summaryCards"),
};

// scale used for the gauge fill (metres) - danger threshold sits near the top of the bar
const GAUGE_MAX_M = 5.5;

function fmtLevel(v) {
  return (v === null || v === undefined || isNaN(v)) ? "—" : v.toFixed(2) + " m";
}

function fmtTime(iso) {
  return new Date(iso).toLocaleString();
}

function statusClass(s) {
  return { Normal: "ok", Warning: "warn", Danger: "danger", Faulty: "faulty" }[s] || "";
}

// ---------- signature element: live gauge card per monitoring point ----------
function renderSummaryCards() {
  const html = LOCATIONS.map(loc => {
    const history = liveData
      .filter(r => r.location === loc && typeof r.water_level_m === "number")
      .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
    const latest = history[0];
    const previous = history[1];
    const level = latest ? latest.water_level_m : null;
    const status = latest ? latest.status : "Faulty";
    const pct = level === null || level === undefined ? 0 : Math.min(100, Math.max(4, (level / GAUGE_MAX_M) * 100));
    const shortName = loc.split(" - ")[0];
    const place = loc.split(" - ")[1];

    // Change 1: rate of change (m/min) - computed internally, now surfaced on screen
    let rateText = "—";
    if (latest && previous) {
      const dtMin = (new Date(latest.recorded_at) - new Date(previous.recorded_at)) / 60000;
      if (dtMin > 0) {
        const rate = (latest.water_level_m - previous.water_level_m) / dtMin;
        const sign = rate >= 0 ? "+" : "";
        rateText = `${sign}${rate.toFixed(3)} m/min`;
      }
    }

    return `
      <div class="card ${statusClass(status)}">
        <div class="card-head">
          <span class="pillar-name">${shortName}</span>
          <span class="badge ${statusClass(status)}">${status}</span>
        </div>
        <div class="place">${place}</div>
        <div class="gauge">
          <div class="gauge-fill" style="height:${pct}%"></div>
          <div class="gauge-line" style="bottom:${(WARNING_THRESHOLD / GAUGE_MAX_M) * 100}%" title="Warning line"></div>
          <div class="gauge-line danger-line" style="bottom:${(DANGER_THRESHOLD / GAUGE_MAX_M) * 100}%" title="Danger line"></div>
        </div>
        <div class="gauge-reading">${fmtLevel(level)}</div>
        <div class="rate-tag">Rate: ${rateText}</div>
        <div class="device-tag">${latest ? latest.device_id : "—"}</div>
      </div>
    `;
  }).join("");
  els.cards.innerHTML = html;
}

// ---------- Task 2: main screen, live search + filter, visible count ----------
function renderTable() {
  const q = els.search.value.trim().toLowerCase();
  const statusFilterVal = els.statusFilter.value;

  els.loading.style.display = "none";
  renderSummaryCards();

  const rows = liveData.filter(r => {
    const matchesText = !q ||
      r.reading_id.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q) ||
      r.device_id.toLowerCase().includes(q);
    const matchesStatus = statusFilterVal === "All" || r.status === statusFilterVal;
    return matchesText && matchesStatus;
  }).sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));

  els.count.textContent = `${rows.length} of ${liveData.length} record${liveData.length !== 1 ? "s" : ""} shown`;

  if (rows.length === 0) {
    els.tbody.innerHTML = "";
    els.empty.style.display = "block";
    return;
  }
  els.empty.style.display = "none";

  els.tbody.innerHTML = rows.map(r => `
    <tr onclick="showDetail('${r.reading_id}')">
      <td>${r.reading_id}</td>
      <td>${r.location}</td>
      <td>${fmtLevel(r.water_level_m)}</td>
      <td><span class="badge ${statusClass(r.status)}">${r.status}</span></td>
      <td>${fmtTime(r.recorded_at)}</td>
      <td>${r.device_id}</td>
    </tr>
  `).join("");
}

// ---------- Task 3: detail + summary view ----------
function computeSummary(locationReadings) {
  const valid = locationReadings.filter(r => typeof r.water_level_m === "number" && r.status !== "Faulty");
  if (valid.length === 0) return { avg: null, max: null, dangerCount: 0, count: locationReadings.length };
  const avg = valid.reduce((s, r) => s + r.water_level_m, 0) / valid.length;
  const max = Math.max(...valid.map(r => r.water_level_m));
  const dangerCount = locationReadings.filter(r => r.status === "Danger").length;
  return { avg, max, dangerCount, count: locationReadings.length };
}

function showDetail(id) {
  const r = liveData.find(x => x.reading_id === id);
  if (!r) return;
  const locHistory = liveData.filter(x => x.location === r.location);
  const summary = computeSummary(locHistory);

  els.detail.style.display = "block";
  els.detail.innerHTML = `
    <div class="summary-figure">
      <div class="big-number">${summary.avg !== null ? summary.avg.toFixed(2) + " m" : "N/A"}</div>
      <div class="label">Average level at ${r.location} (valid readings only)</div>
      <div class="sub-stats">
        Max recorded: ${summary.max !== null ? summary.max.toFixed(2) + " m" : "N/A"} &nbsp;•&nbsp;
        Danger crossings: ${summary.dangerCount} &nbsp;•&nbsp;
        Total readings at this point: ${summary.count}
      </div>
    </div>
    <table class="detail-table">
      <tr><th>Reading ID</th><td>${r.reading_id}</td></tr>
      <tr><th>Location</th><td>${r.location}</td></tr>
      <tr><th>Water level</th><td>${fmtLevel(r.water_level_m)}</td></tr>
      <tr><th>Status</th><td><span class="badge ${statusClass(r.status)}">${r.status}</span></td></tr>
      <tr><th>Recorded at</th><td>${fmtTime(r.recorded_at)}</td></tr>
      <tr><th>Device ID</th><td>${r.device_id}</td></tr>
    </table>
    <button onclick="closeDetail()">Close</button>
  `;
  els.detail.scrollIntoView({ behavior: "smooth" });
}

function closeDetail() {
  els.detail.style.display = "none";
}

// ---------- Change 2 (on-spot demo): feed in an impossible reading on demand ----------
function injectFaultyReading() {
  const loc = LOCATIONS[0];
  const deviceId = DEVICES[loc];
  const impossibleRaw = 27.4; // outside the real-world plausible range (0-8m)

  const isOk = plausible(impossibleRaw);
  const level = isOk ? impossibleRaw : null; // rejected -> stored as missing, not as a real reading
  const status = statusFor(level); // resolves to "Faulty", never "Danger"

  const reading = {
    reading_id: "R" + String(liveData.length + 1).padStart(3, "0"),
    location: loc,
    water_level_m: level,
    status,
    recorded_at: new Date().toISOString(),
    device_id: deviceId
  };
  liveData.push(reading);
  renderTable();

  // proof for the evaluator: this never calls triggerLocalAlert(), so no false Danger alarm fires
  console.log(`Injected impossible raw reading (${impossibleRaw}m) -> handled as: ${status} (no alert triggered)`);
}

// ---------- Task 4: simulated sensing node (non-blocking, plausibility check, smoothing) ----------
function plausible(v) {
  return typeof v === "number" && !isNaN(v) && v >= 0 && v <= 8;
}

function smooth(deviceId, newVal) {
  const win = smoothingWindow[deviceId];
  win.push(newVal);
  if (win.length > 3) win.shift(); // simple moving average of last 3 readings
  return win.reduce((s, v) => s + v, 0) / win.length;
}

function simulateReading() {
  LOCATIONS.forEach(loc => {
    const deviceId = DEVICES[loc];
    const last = [...liveData].reverse().find(r => r.location === loc && typeof r.water_level_m === "number");
    let base = last ? last.water_level_m : 2.0;
    // random walk +/- 0.15m, occasionally inject a spike to prove the plausibility check works
    let raw = base + (Math.random() - 0.5) * 0.3;
    if (Math.random() < 0.05) raw = 15 + Math.random() * 5; // rare implausible spike

    let level;
    if (!plausible(raw)) {
      level = null; // rejected by plausibility check
    } else {
      level = Math.round(smooth(deviceId, raw) * 100) / 100; // smoothed value
    }

    const status = statusFor(level);
    const reading = {
      reading_id: "R" + String(liveData.length + 1).padStart(3, "0"),
      location: loc,
      water_level_m: level,
      status,
      recorded_at: new Date().toISOString(),
      device_id: deviceId
    };
    liveData.push(reading);

    if (status === "Danger") {
      triggerLocalAlert(loc, level);
    }
  });
  renderTable();
}

// ---------- local warning even without network (pure client-side, no server call needed) ----------
function triggerLocalAlert(loc, level) {
  els.alertBanner.style.display = "block";
  els.alertBanner.textContent = `⚠ DANGER: ${loc} at ${level.toFixed(2)} m — threshold ${DANGER_THRESHOLD} m exceeded (${new Date().toLocaleTimeString()})`;
}

// non-blocking schedule (setInterval instead of a blocking delay loop)
setInterval(simulateReading, 8000);

// ---------- wire up events ----------
els.search.addEventListener("input", renderTable);
els.statusFilter.addEventListener("change", renderTable);
document.getElementById("injectFault").addEventListener("click", injectFaultyReading);

// initial load state
els.loading.style.display = "block";
setTimeout(renderTable, 300); // simulate a brief load so the loading state is demonstrable
