/*
  River Flood Early-Warning — Sensing Node
  Platform: ESP32 (Wokwi simulation)
  Sensor: HC-SR04 ultrasonic (simulates a pressure/ultrasonic water-level sensor)
  Output: Serial (JSON, same field names as data.js/app.js) + local LED/buzzer alert

  Task 4 requirements covered:
  - Fixed-schedule reading using non-blocking timing (millis(), no delay())
  - Plausibility check that rejects impossible values
  - Smoothing (3-reading moving average) so one spike isn't mistaken for a real change
  - Local warning (LED + buzzer) the moment the danger threshold is crossed,
    with no dependency on network/WiFi
*/

#include <Arduino.h>

// ---- Pin setup (Wokwi diagram.json should match these) ----
const int TRIG_PIN = 5;
const int ECHO_PIN = 18;
const int LED_DANGER_PIN = 2;
const int BUZZER_PIN = 4;

// ---- Config ----
const unsigned long READ_INTERVAL_MS = 5000;   // fixed schedule, non-blocking
const float SENSOR_HEIGHT_M = 6.0;              // sensor mounted 6m above riverbed
const float MIN_PLAUSIBLE_M = 0.0;
const float MAX_PLAUSIBLE_M = 8.0;
const float WARNING_THRESHOLD_M = 3.0;
const float DANGER_THRESHOLD_M = 4.0;
const char* DEVICE_ID = "D1";
const char* LOCATION = "Pillar A - Upstream Bridge";

// ---- State ----
unsigned long lastReadTime = 0;
float smoothingWindow[3] = {0, 0, 0};
int windowCount = 0;
int readingCounter = 0;

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_DANGER_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(LED_DANGER_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  Serial.println("River flood sensing node started.");
}

// Reads raw ultrasonic distance in cm, converts to water level in metres
float readRawLevel() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout, avoids hanging
  if (duration == 0) return NAN; // no echo -> treat as implausible/faulty

  float distance_cm = duration * 0.0343 / 2.0;
  float distance_m = distance_cm / 100.0;
  float level = SENSOR_HEIGHT_M - distance_m; // water level = mount height - distance to surface
  return level;
}

// Plausibility check: rejects impossible values
bool isPlausible(float level) {
  if (isnan(level)) return false;
  if (level < MIN_PLAUSIBLE_M || level > MAX_PLAUSIBLE_M) return false;
  return true;
}

// Moving-average smoothing over the last 3 valid readings
float smooth(float newVal) {
  smoothingWindow[0] = smoothingWindow[1];
  smoothingWindow[1] = smoothingWindow[2];
  smoothingWindow[2] = newVal;
  if (windowCount < 3) windowCount++;

  float sum = 0;
  for (int i = 3 - windowCount; i < 3; i++) sum += smoothingWindow[i];
  return sum / windowCount;
}

String statusFor(float level, bool plausible) {
  if (!plausible) return "Faulty";
  if (level >= DANGER_THRESHOLD_M) return "Danger";
  if (level >= WARNING_THRESHOLD_M) return "Warning";
  return "Normal";
}

void triggerLocalAlert(bool danger) {
  // Local warning that works with zero network dependency
  digitalWrite(LED_DANGER_PIN, danger ? HIGH : LOW);
  digitalWrite(BUZZER_PIN, danger ? HIGH : LOW);
}

void loop() {
  unsigned long now = millis();

  // Non-blocking fixed-schedule read (no delay() used for scheduling)
  if (now - lastReadTime >= READ_INTERVAL_MS) {
    lastReadTime = now;

    float raw = readRawLevel();
    bool plausible = isPlausible(raw);
    float smoothed = plausible ? smooth(raw) : NAN;
    String status = statusFor(smoothed, plausible);

    readingCounter++;
    bool isDanger = (status == "Danger");
    triggerLocalAlert(isDanger);

    // Emit as JSON matching the same fields used in data.js / app.js
    Serial.print("{");
    Serial.print("\"reading_id\":\"R"); Serial.print(readingCounter); Serial.print("\",");
    Serial.print("\"location\":\""); Serial.print(LOCATION); Serial.print("\",");
    Serial.print("\"water_level_m\":");
    if (plausible) Serial.print(smoothed, 2); else Serial.print("null");
    Serial.print(",");
    Serial.print("\"status\":\""); Serial.print(status); Serial.print("\",");
    Serial.print("\"device_id\":\""); Serial.print(DEVICE_ID); Serial.print("\"");
    Serial.println("}");
  }

  // rest of loop stays free to run other non-blocking tasks (e.g. networking) here
}
