# Olvia setup

## 1. App

```bash
npm install
cp .env.example .env        # fill in your Firebase web config
npm run dev
```

Open http://localhost:3000. Register an account, then add a medication before
creating a schedule — a schedule needs a medication to point at.

## 2. Firebase console

Enable these in your project, or the app will error on first use:

- **Authentication** → sign-in methods: Email/Password, Google, Phone
- **Firestore Database** → create database

Firebase Storage is deliberately not used: it requires the paid Blaze plan.
Voice recordings are stored inline in their Firestore document as a data URL,
which keeps the whole app on the free Spark tier. That caps recordings at
20 seconds (see `MAX_RECORDING_SECONDS` in `src/services/storage.ts`) to stay
under Firestore's 1 MiB per-document limit.

Add `localhost` to Authentication → Settings → Authorized domains for local
Google and phone sign-in.

## 3. Deploy rules and indexes

The app will not read or write correctly until these are live:

```bash
npm install -g firebase-tools
firebase login
firebase use --add                    # pick your project
firebase deploy --only firestore:rules,firestore:indexes
```

Rules restrict every document to its owner or that owner's linked caregiver.
Indexes back the dashboard, reports, and notification queries — without them
those screens fail with a "requires an index" error.

## 4. Firmware

`firmware/olvia_esp32/olvia_esp32.ino` targets an ESP32 (not the Arduino Nano
in the original prototype — the Nano has no radio).

Arduino IDE libraries required:

- ESP32 board package (Boards Manager: "esp32" by Espressif)
- `ESP32Servo`

Wiring is declared at the top of the sketch — IR break-beam sensors on 32-39,
servos on 13/12/14/27/26/25, lid switch on 23, LED on 18/19, buzzer 21,
vibration 22, buttons 4/15/5. Adjust the pin arrays to match your build.

`PIN_BATTERY` shares GPIO 34 with a beam sensor in the defaults; move one before
wiring the real board.

Calibrate `readBatteryPercent()` against your actual voltage divider — the
`map(raw, 1800, 2400, ...)` range is a placeholder.

## 5. Pairing

Web Bluetooth requires Chrome, Edge, or Opera on desktop or Android. It does not
work in Safari or on iOS, and it requires HTTPS (or localhost).

Flash the firmware, power the bottle, then in the app go to **Bottle → Connect**
and pick "Ol Bottle". The app pushes the schedule on connect; push again from
that page after changing schedules.

## 6. Before testing with a real person

Auto-dispensing releases medication unattended. Bench-test with dummy pills
first and confirm each failure path behaves: jam, empty compartment, lid open,
and the 60-second repeat-dispense cooldown. Get the regulatory question answered
for your market before any unsupervised use.

## What is not built yet

- Push notifications (FCM) — in-app notifications only, so alerts need the app open
- Server-side missed-dose watcher — doses flip to "missed" in the UI after an
  hour, but nothing notifies a caregiver while the app is closed
- Caregiver linking UI — the rules and data model support it, the screen does not exist
