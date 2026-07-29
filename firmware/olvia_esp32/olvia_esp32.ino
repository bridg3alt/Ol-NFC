// Olvia smart bottle firmware - ESP32
// Implements BLE protocol v1 (see ../PROTOCOL.md)
//
// Hardware:
//   6x IR break-beam sensor  -> pill removal detection
//   6x micro servo           -> dispense gate
//   1x reed/hall lid switch  -> lid open interlock
//   2x LED (red/green), 1x piezo buzzer, 1x vibration motor
//   3x tactile button (M/A/E)

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <ESP32Servo.h>
#include <Preferences.h>
#include <time.h>

#define SERVICE_UUID   "6f1a0001-b5a3-f393-e0a9-e50e24dcca9e"
#define CHAR_COMMAND   "6f1a0002-b5a3-f393-e0a9-e50e24dcca9e"
#define CHAR_EVENT     "6f1a0003-b5a3-f393-e0a9-e50e24dcca9e"
#define CHAR_SCHEDULE  "6f1a0004-b5a3-f393-e0a9-e50e24dcca9e"
#define CHAR_STATUS    "6f1a0005-b5a3-f393-e0a9-e50e24dcca9e"

#define FRAME_LEN        20
#define NUM_COMPARTMENTS 6
#define MAX_SCHEDULE     32
#define MAX_QUEUED       64

#define FW_MAJOR 1
#define FW_MINOR 0

// Opcodes
enum : uint8_t {
  CMD_DISPENSE = 0x01, CMD_LED_ON = 0x02, CMD_LED_OFF = 0x03,
  CMD_BUZZER = 0x04, CMD_VIBRATE = 0x05, CMD_SET_TIME = 0x06,
  CMD_SYNC_REQUEST = 0x07, CMD_ACK_EVENT = 0x08,
  CMD_CLEAR_SCHEDULE = 0x09, CMD_ABORT = 0x0A,
};

enum : uint8_t {
  EVT_COMPARTMENT_OPENED = 0x81, EVT_PILL_REMOVED = 0x82,
  EVT_DISPENSE_COMPLETE = 0x83, EVT_DISPENSE_FAILED = 0x84,
  EVT_BATTERY = 0x85, EVT_COMPARTMENT_EMPTY = 0x86,
  EVT_BUTTON_PRESSED = 0x87, EVT_REMINDER_FIRED = 0x88,
};

enum : uint8_t {
  FAIL_JAM = 0x01, FAIL_EMPTY = 0x02, FAIL_ALREADY_DISPENSED = 0x03,
  FAIL_SERVO_TIMEOUT = 0x04, FAIL_LID_OPEN = 0x05,
};

// Pins
const uint8_t PIN_BEAM[NUM_COMPARTMENTS]  = {32, 33, 34, 35, 36, 39};
const uint8_t PIN_SERVO[NUM_COMPARTMENTS] = {13, 12, 14, 27, 26, 25};
const uint8_t PIN_LID     = 23;
const uint8_t PIN_LED_R   = 18;
const uint8_t PIN_LED_G   = 19;
const uint8_t PIN_BUZZER  = 21;
const uint8_t PIN_VIBRATE = 22;
const uint8_t PIN_BTN[3]  = {4, 15, 5};
const uint8_t PIN_BATTERY = 34;

const uint32_t SERVO_TIMEOUT_MS   = 2000;
const uint32_t DISPENSE_COOLDOWN  = 60000;
const uint16_t SERVO_CLOSED_DEG   = 0;
const uint16_t SERVO_OPEN_DEG     = 90;

struct ScheduleEntry {
  uint8_t compartment, hour, minute, days, flags, doseId;
  bool used;
};

struct QueuedEvent {
  uint8_t frame[FRAME_LEN];
  uint32_t seq;
  bool acked;
};

Servo servos[NUM_COMPARTMENTS];
Preferences prefs;

BLECharacteristic *eventChar = nullptr;
BLECharacteristic *statusChar = nullptr;
bool deviceConnected = false;

ScheduleEntry schedule[MAX_SCHEDULE];
QueuedEvent eventQueue[MAX_QUEUED];
uint8_t queueHead = 0, queueCount = 0;
uint32_t eventSeq = 0;

uint32_t lastDispenseMs[NUM_COMPARTMENTS] = {0};
uint8_t lastDoseId[NUM_COMPARTMENTS] = {0};
bool beamPrev[NUM_COMPARTMENTS];
bool abortRequested = false;

uint32_t ledOffAtMs = 0, buzzerOffAtMs = 0, vibrateOffAtMs = 0;
uint8_t ledBlinkSpeed = 1;
uint32_t lastBlinkMs = 0;
bool ledState = false;
int8_t firedThisMinute[MAX_SCHEDULE];
int lastMinuteChecked = -1;

// ---------- persistence ----------

void loadPersisted() {
  prefs.begin("olvia", false);
  eventSeq = prefs.getUInt("seq", 0);
  size_t len = prefs.getBytesLength("sched");
  if (len == sizeof(schedule)) prefs.getBytes("sched", schedule, sizeof(schedule));
  len = prefs.getBytesLength("queue");
  if (len == sizeof(eventQueue)) {
    prefs.getBytes("queue", eventQueue, sizeof(eventQueue));
    queueHead = prefs.getUChar("qhead", 0);
    queueCount = prefs.getUChar("qcount", 0);
  }
}

void persistQueue() {
  prefs.putBytes("queue", eventQueue, sizeof(eventQueue));
  prefs.putUChar("qhead", queueHead);
  prefs.putUChar("qcount", queueCount);
  prefs.putUInt("seq", eventSeq);
}

void persistSchedule() { prefs.putBytes("sched", schedule, sizeof(schedule)); }

// ---------- events ----------

void emitEvent(uint8_t type, uint8_t compartment, const uint8_t *payload, uint8_t payloadLen) {
  uint8_t frame[FRAME_LEN] = {0};
  uint32_t ts = (uint32_t)time(nullptr);
  eventSeq++;

  frame[0] = type;
  frame[1] = compartment;
  memcpy(&frame[2], &eventSeq, 4);
  memcpy(&frame[6], &ts, 4);
  if (payload && payloadLen) memcpy(&frame[10], payload, min((int)payloadLen, 10));

  if (queueCount < MAX_QUEUED) {
    uint8_t slot = (queueHead + queueCount) % MAX_QUEUED;
    memcpy(eventQueue[slot].frame, frame, FRAME_LEN);
    eventQueue[slot].seq = eventSeq;
    eventQueue[slot].acked = false;
    queueCount++;
  } else {
    // Queue full: drop oldest so newest intake data always survives.
    memcpy(eventQueue[queueHead].frame, frame, FRAME_LEN);
    eventQueue[queueHead].seq = eventSeq;
    eventQueue[queueHead].acked = false;
    queueHead = (queueHead + 1) % MAX_QUEUED;
  }
  persistQueue();

  if (deviceConnected && eventChar) {
    eventChar->setValue(frame, FRAME_LEN);
    eventChar->notify();
  }
}

void ackEvent(uint32_t seq) {
  for (uint8_t i = 0; i < queueCount; i++) {
    uint8_t slot = (queueHead + i) % MAX_QUEUED;
    if (eventQueue[slot].seq == seq) { eventQueue[slot].acked = true; break; }
  }
  while (queueCount > 0 && eventQueue[queueHead].acked) {
    queueHead = (queueHead + 1) % MAX_QUEUED;
    queueCount--;
  }
  persistQueue();
}

void replayUnacked() {
  if (!deviceConnected || !eventChar) return;
  for (uint8_t i = 0; i < queueCount; i++) {
    uint8_t slot = (queueHead + i) % MAX_QUEUED;
    if (eventQueue[slot].acked) continue;
    eventChar->setValue(eventQueue[slot].frame, FRAME_LEN);
    eventChar->notify();
    delay(30);  // pace notifies so the client stack keeps up
  }
}

// ---------- actuators ----------

bool lidIsOpen() { return digitalRead(PIN_LID) == HIGH; }

void setLed(bool on) {
  digitalWrite(PIN_LED_G, on ? HIGH : LOW);
  ledState = on;
}

void dispense(uint8_t compartment, uint8_t doseId) {
  uint8_t idx = compartment - 1;
  if (compartment < 1 || compartment > NUM_COMPARTMENTS) return;

  uint8_t reason = 0;
  if (lidIsOpen())                                          reason = FAIL_LID_OPEN;
  else if (lastDoseId[idx] == doseId && doseId != 0)        reason = FAIL_ALREADY_DISPENSED;
  else if (millis() - lastDispenseMs[idx] < DISPENSE_COOLDOWN &&
           lastDispenseMs[idx] != 0)                        reason = FAIL_ALREADY_DISPENSED;

  if (reason) {
    uint8_t p[2] = {doseId, reason};
    emitEvent(EVT_DISPENSE_FAILED, compartment, p, 2);
    return;
  }

  abortRequested = false;
  servos[idx].write(SERVO_OPEN_DEG);

  uint32_t start = millis();
  bool pillSeen = false;
  while (millis() - start < SERVO_TIMEOUT_MS) {
    if (abortRequested) break;
    if (digitalRead(PIN_BEAM[idx]) == LOW) { pillSeen = true; break; }
    delay(10);
  }

  servos[idx].write(SERVO_CLOSED_DEG);
  delay(300);

  if (abortRequested) {
    uint8_t p[2] = {doseId, FAIL_SERVO_TIMEOUT};
    emitEvent(EVT_DISPENSE_FAILED, compartment, p, 2);
    return;
  }

  if (!pillSeen) {
    // Beam never broke: compartment empty or gate jammed. Never retry unattended.
    uint8_t p[2] = {doseId, FAIL_JAM};
    emitEvent(EVT_DISPENSE_FAILED, compartment, p, 2);
    emitEvent(EVT_COMPARTMENT_EMPTY, compartment, nullptr, 0);
    return;
  }

  lastDispenseMs[idx] = millis();
  lastDoseId[idx] = doseId;
  uint8_t p[1] = {doseId};
  emitEvent(EVT_DISPENSE_COMPLETE, compartment, p, 1);
}

void fireReminder(const ScheduleEntry &e) {
  uint8_t p[1] = {e.doseId};
  emitEvent(EVT_REMINDER_FIRED, e.compartment, p, 1);

  if (e.flags & 0x04) { setLed(true); ledOffAtMs = millis() + 60000; }
  if (e.flags & 0x08) { digitalWrite(PIN_BUZZER, HIGH); buzzerOffAtMs = millis() + 1000; }
  if (e.flags & 0x10) { digitalWrite(PIN_VIBRATE, HIGH); vibrateOffAtMs = millis() + 1000; }
  if (e.flags & 0x02) dispense(e.compartment, e.doseId);
}

// ---------- BLE callbacks ----------

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *s) override { deviceConnected = true; }
  void onDisconnect(BLEServer *s) override {
    deviceConnected = false;
    s->startAdvertising();
  }
};

class CommandCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) override {
    std::string v = c->getValue();
    if (v.length() < 2) return;
    const uint8_t *f = (const uint8_t *)v.data();
    uint8_t op = f[0], comp = f[1];

    switch (op) {
      case CMD_DISPENSE: dispense(comp, f[2]); break;
      case CMD_LED_ON:   setLed(true); ledBlinkSpeed = f[3]; ledOffAtMs = millis() + 60000; break;
      case CMD_LED_OFF:  setLed(false); ledOffAtMs = 0; break;
      case CMD_BUZZER: {
        uint16_t d; memcpy(&d, &f[2], 2);
        digitalWrite(PIN_BUZZER, HIGH); buzzerOffAtMs = millis() + d;
        break;
      }
      case CMD_VIBRATE: {
        uint16_t d; memcpy(&d, &f[2], 2);
        digitalWrite(PIN_VIBRATE, HIGH); vibrateOffAtMs = millis() + d;
        break;
      }
      case CMD_SET_TIME: {
        uint32_t epoch; memcpy(&epoch, &f[2], 4);
        struct timeval tv = { .tv_sec = (time_t)epoch, .tv_usec = 0 };
        settimeofday(&tv, nullptr);
        break;
      }
      case CMD_SYNC_REQUEST: replayUnacked(); break;
      case CMD_ACK_EVENT: {
        uint32_t seq; memcpy(&seq, &f[2], 4);
        ackEvent(seq);
        break;
      }
      case CMD_CLEAR_SCHEDULE:
        memset(schedule, 0, sizeof(schedule));
        persistSchedule();
        break;
      case CMD_ABORT: abortRequested = true; break;
    }
  }
};

class ScheduleCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) override {
    std::string v = c->getValue();
    if (v.length() < 7) return;
    const uint8_t *f = (const uint8_t *)v.data();
    uint8_t idx = f[0];
    if (idx == 0xFF) { persistSchedule(); return; }
    if (idx >= MAX_SCHEDULE) return;

    schedule[idx] = { f[1], f[2], f[3], f[4], f[5], f[6], true };
  }
};

// ---------- sensors ----------

void pollBeams() {
  for (uint8_t i = 0; i < NUM_COMPARTMENTS; i++) {
    bool broken = digitalRead(PIN_BEAM[i]) == LOW;
    if (broken && !beamPrev[i]) {
      uint8_t p[1] = {lastDoseId[i]};
      emitEvent(EVT_PILL_REMOVED, i + 1, p, 1);
    }
    beamPrev[i] = broken;
  }
}

void pollButtons() {
  static bool prev[3] = {false, false, false};
  for (uint8_t i = 0; i < 3; i++) {
    bool pressed = digitalRead(PIN_BTN[i]) == LOW;
    if (pressed && !prev[i]) {
      uint8_t p[1] = {i};
      emitEvent(EVT_BUTTON_PRESSED, 0, p, 1);
    }
    prev[i] = pressed;
  }
}

void pollLid() {
  static bool prev = false;
  bool open = lidIsOpen();
  if (open && !prev) emitEvent(EVT_COMPARTMENT_OPENED, 0, nullptr, 0);
  prev = open;
}

uint8_t readBatteryPercent() {
  int raw = analogRead(PIN_BATTERY);
  int pct = map(raw, 1800, 2400, 0, 100);  // calibrate against actual divider
  return constrain(pct, 0, 100);
}

void checkSchedule() {
  time_t now = time(nullptr);
  if (now < 1600000000) return;  // clock not set yet

  struct tm t;
  localtime_r(&now, &t);
  if (t.tm_min == lastMinuteChecked) return;
  lastMinuteChecked = t.tm_min;

  for (uint8_t i = 0; i < MAX_SCHEDULE; i++) {
    ScheduleEntry &e = schedule[i];
    if (!e.used || !(e.flags & 0x01)) continue;
    if (!(e.days & (1 << t.tm_wday))) continue;
    if (e.hour != t.tm_hour || e.minute != t.tm_min) continue;
    fireReminder(e);
  }
}

void updateStatus() {
  uint8_t s[8] = {0};
  s[0] = FW_MAJOR;
  s[1] = FW_MINOR;
  s[2] = readBatteryPercent();
  for (uint8_t i = 0; i < NUM_COMPARTMENTS; i++)
    if (digitalRead(PIN_BEAM[i]) == HIGH) s[3] |= (1 << i);
  s[4] = lidIsOpen() ? 1 : 0;
  s[5] = queueCount;

  if (statusChar) {
    statusChar->setValue(s, 8);
    if (deviceConnected) statusChar->notify();
  }
}

// ---------- setup / loop ----------

void setup() {
  Serial.begin(115200);

  for (uint8_t i = 0; i < NUM_COMPARTMENTS; i++) {
    pinMode(PIN_BEAM[i], INPUT_PULLUP);
    servos[i].attach(PIN_SERVO[i]);
    servos[i].write(SERVO_CLOSED_DEG);
    beamPrev[i] = false;
  }
  pinMode(PIN_LID, INPUT_PULLUP);
  pinMode(PIN_LED_R, OUTPUT);
  pinMode(PIN_LED_G, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_VIBRATE, OUTPUT);
  for (uint8_t i = 0; i < 3; i++) pinMode(PIN_BTN[i], INPUT_PULLUP);

  loadPersisted();

  BLEDevice::init("Ol Bottle");
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  BLEService *svc = server->createService(SERVICE_UUID);

  BLECharacteristic *cmdChar = svc->createCharacteristic(
      CHAR_COMMAND, BLECharacteristic::PROPERTY_WRITE);
  cmdChar->setCallbacks(new CommandCallbacks());

  eventChar = svc->createCharacteristic(
      CHAR_EVENT, BLECharacteristic::PROPERTY_NOTIFY);
  eventChar->addDescriptor(new BLE2902());

  BLECharacteristic *schedChar = svc->createCharacteristic(
      CHAR_SCHEDULE, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_READ);
  schedChar->setCallbacks(new ScheduleCallbacks());

  statusChar = svc->createCharacteristic(
      CHAR_STATUS, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  statusChar->addDescriptor(new BLE2902());

  svc->start();
  BLEAdvertising *adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();
}

void loop() {
  uint32_t now = millis();

  pollBeams();
  pollButtons();
  pollLid();
  checkSchedule();

  if (ledOffAtMs && now > ledOffAtMs) { setLed(false); ledOffAtMs = 0; }
  if (buzzerOffAtMs && now > buzzerOffAtMs) { digitalWrite(PIN_BUZZER, LOW); buzzerOffAtMs = 0; }
  if (vibrateOffAtMs && now > vibrateOffAtMs) { digitalWrite(PIN_VIBRATE, LOW); vibrateOffAtMs = 0; }

  if (ledOffAtMs) {
    uint16_t interval = ledBlinkSpeed == 0 ? 1000 : ledBlinkSpeed == 2 ? 200 : 500;
    if (now - lastBlinkMs > interval) { setLed(!ledState); lastBlinkMs = now; }
  }

  static uint32_t lastStatus = 0;
  static uint32_t lastBattery = 0;
  if (now - lastStatus > 5000) { updateStatus(); lastStatus = now; }
  if (now - lastBattery > 300000) {
    uint8_t p[1] = {readBatteryPercent()};
    emitEvent(EVT_BATTERY, 0, p, 1);
    lastBattery = now;
  }

  delay(20);
}
