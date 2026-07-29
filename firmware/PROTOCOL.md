# Olvia BLE Protocol v1

Single source of truth for firmware (ESP32) and web app (`src/services/ble.ts`).
Both sides must be updated together when this changes.

## Service

| | UUID |
|---|---|
| Olvia Service | `6f1a0001-b5a3-f393-e0a9-e50e24dcca9e` |

Advertised name prefix: `Ol Bottle`

## Characteristics

| Name | UUID | Props | Payload |
|---|---|---|---|
| Command | `6f1a0002-…` | Write | 20-byte command frame (below) |
| Event | `6f1a0003-…` | Notify | 20-byte event frame (below) |
| Schedule | `6f1a0004-…` | Write, Read | 20-byte schedule-entry frame |
| Status | `6f1a0005-…` | Read, Notify | 8-byte status frame |

Full UUIDs replace `0001` with the listed suffix, e.g. Command =
`6f1a0002-b5a3-f393-e0a9-e50e24dcca9e`.

Fixed 20-byte frames — fits one BLE ATT packet at default MTU, no fragmentation.

## Command frame (app → bottle)

```
byte 0     opcode
byte 1     compartment (1-6, or 0 = not applicable)
byte 2-19  payload (opcode-specific, zero-padded)
```

| Opcode | Name | Payload |
|---|---|---|
| `0x01` | DISPENSE | byte 2 = dose id (for the ack) |
| `0x02` | LED_ON | byte 2 = intensity 0-2, byte 3 = speed 0-2 |
| `0x03` | LED_OFF | — |
| `0x04` | BUZZER | bytes 2-3 = duration ms, uint16 LE |
| `0x05` | VIBRATE | bytes 2-3 = duration ms, uint16 LE |
| `0x06` | SET_TIME | bytes 2-5 = unix seconds, uint32 LE |
| `0x07` | SYNC_REQUEST | — (bottle replays queued events) |
| `0x08` | ACK_EVENT | bytes 2-5 = event seq being acked, uint32 LE |
| `0x09` | CLEAR_SCHEDULE | — |
| `0x0A` | ABORT | stop any in-progress dispense |

## Event frame (bottle → app, notify)

```
byte 0     event type
byte 1     compartment (1-6, or 0)
byte 2-5   seq number, uint32 LE   (monotonic, survives reboot)
byte 6-9   unix timestamp, uint32 LE
byte 10-19 event-specific payload
```

| Type | Name | Payload |
|---|---|---|
| `0x81` | COMPARTMENT_OPENED | — |
| `0x82` | PILL_REMOVED | byte 10 = dose id |
| `0x83` | DISPENSE_COMPLETE | byte 10 = dose id |
| `0x84` | DISPENSE_FAILED | byte 10 = dose id, byte 11 = reason |
| `0x85` | BATTERY | byte 10 = percent 0-100 |
| `0x86` | COMPARTMENT_EMPTY | — |
| `0x87` | BUTTON_PRESSED | byte 10 = button id (0=M,1=A,2=E) |
| `0x88` | REMINDER_FIRED | byte 10 = dose id (fired from onboard schedule) |

Dispense-failed reasons: `0x01` jam, `0x02` empty, `0x03` already dispensed,
`0x04` servo timeout, `0x05` lid open.

**Every event is queued in flash until the app sends ACK_EVENT for its seq.**
This is what makes offline tracking work — bottle out of BLE range still records
intake, replays on reconnect.

## Schedule frame (app → bottle)

Bottle stores its own schedule so reminders fire with the phone absent.

```
byte 0     entry index (0-31)
byte 1     compartment (1-6)
byte 2     hour (0-23)
byte 3     minute (0-59)
byte 4     days bitmask (bit0=Sun … bit6=Sat)
byte 5     flags: bit0 enabled, bit1 auto-dispense, bit2 led, bit3 buzzer, bit4 vibrate
byte 6     dose id
byte 7-19  reserved
```

Write index `0xFF` to mark end-of-schedule.

## Status frame (bottle → app, read/notify)

```
byte 0     firmware major
byte 1     firmware minor
byte 2     battery percent
byte 3     compartment-loaded bitmask (bit0 = compartment 1)
byte 4     lid open (0/1)
byte 5     pending unacked event count
byte 6-7   reserved
```

## Connection flow

1. App scans, filters name prefix `Ol Bottle`, connects.
2. App subscribes to Event + Status notify.
3. App writes SET_TIME (bottle has no RTC battery guarantee).
4. App writes full schedule (CLEAR_SCHEDULE, then each entry).
5. App writes SYNC_REQUEST — bottle replays every unacked event.
6. App ACK_EVENTs each one after persisting to Firestore.

## Safety rules (firmware-enforced, not app-enforced)

- Never dispense a dose id already marked dispensed — dedupe in flash.
- Never dispense with lid open.
- Minimum 60s between any two dispenses of the same compartment.
- On servo stall > 2s, abort, emit DISPENSE_FAILED jam, do not retry unattended.
- If BLE disconnects mid-dispense, complete it and queue the event.
