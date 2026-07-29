// Olvia - virtual Ol bottle
//
// Stands in for the hardware by implementing the Web Bluetooth surface that
// BLEService talks to: a device, a GATT server, and the four characteristics
// from PROTOCOL.md. Because it speaks the same 20-byte frames, connecting to
// it exercises the real encoding, parsing, ack, and reconnect paths — the only
// untested layer left is the firmware itself.
//
// Drives the same schedule the app pushed, so reminders and auto-dispense fire
// on their own without anyone clicking anything.

import { Opcode, EventCode } from './ble';

const SERVICE_UUID = '6f1a0001-b5a3-f393-e0a9-e50e24dcca9e';
const CHAR_COMMAND = '6f1a0002-b5a3-f393-e0a9-e50e24dcca9e';
const CHAR_EVENT = '6f1a0003-b5a3-f393-e0a9-e50e24dcca9e';
const CHAR_SCHEDULE = '6f1a0004-b5a3-f393-e0a9-e50e24dcca9e';
const CHAR_STATUS = '6f1a0005-b5a3-f393-e0a9-e50e24dcca9e';

const FRAME_LEN = 20;
const COMPARTMENT_COUNT = 6;

export const FAILURE_CODES = {
  jam: 0x01,
  empty: 0x02,
  already_dispensed: 0x03,
  servo_timeout: 0x04,
  lid_open: 0x05,
} as const;

export type FailureKind = keyof typeof FAILURE_CODES;

interface SimSlot {
  index: number;
  compartment: number;
  hour: number;
  minute: number;
  days: number;
  flags: number;
  doseId: number;
  /** Guards against firing the same slot twice within one minute tick. */
  lastFiredKey?: string;
}

export interface SimulatorState {
  connected: boolean;
  batteryLevel: number;
  lidOpen: boolean;
  loaded: boolean[];
  pillCounts: number[];
  slots: SimSlot[];
  queuedEvents: number;
  log: string[];
}

type Listener = (state: SimulatorState) => void;

/** Minimal EventTarget stand-in matching what BLEService subscribes to. */
class FakeCharacteristic {
  value: DataView | null = null;
  private listeners = new Set<(e: Event) => void>();
  notifying = false;

  constructor(
    readonly uuid: string,
    private readonly onWrite?: (data: DataView) => void | Promise<void>,
    private readonly onRead?: () => DataView
  ) {}

  async writeValue(data: BufferSource): Promise<void> {
    const view =
      data instanceof DataView
        ? data
        : new DataView(
            data instanceof ArrayBuffer ? data : (data as Uint8Array).buffer
          );
    await this.onWrite?.(view);
  }

  async writeValueWithoutResponse(data: BufferSource): Promise<void> {
    return this.writeValue(data);
  }

  async readValue(): Promise<DataView> {
    this.value = this.onRead?.() ?? new DataView(new ArrayBuffer(FRAME_LEN));
    return this.value;
  }

  async startNotifications(): Promise<FakeCharacteristic> {
    this.notifying = true;
    return this;
  }

  async stopNotifications(): Promise<FakeCharacteristic> {
    this.notifying = false;
    return this;
  }

  addEventListener(_type: string, listener: (e: Event) => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: string, listener: (e: Event) => void): void {
    this.listeners.delete(listener);
  }

  /** Pushes a notification frame to whoever is subscribed. */
  notify(bytes: Uint8Array): void {
    if (!this.notifying) return;
    this.value = new DataView(bytes.buffer.slice(0));
    const event = { target: this } as unknown as Event;
    this.listeners.forEach((l) => l(event));
  }
}

class VirtualBottle {
  readonly firmwareVersion = { major: 1, minor: 0 };

  batteryLevel = 82;
  lidOpen = false;
  loaded = Array(COMPARTMENT_COUNT).fill(true);
  pillCounts = [30, 25, 15, 0, 0, 0];
  slots: SimSlot[] = [];

  private seq = 1;
  /** Events awaiting ack, replayed on sync — mirrors the firmware's queue. */
  private unacked = new Map<number, Uint8Array>();
  private pendingSlots: SimSlot[] = [];
  private log: string[] = [];
  private listeners = new Set<Listener>();
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private offsetSeconds = 0;

  commandChar!: FakeCharacteristic;
  eventChar!: FakeCharacteristic;
  scheduleChar!: FakeCharacteristic;
  statusChar!: FakeCharacteristic;
  connected = false;

  private onDisconnect: (() => void) | null = null;

  constructor() {
    this.buildCharacteristics();
  }

  // ------------------------------------------------------------- observation

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot(): SimulatorState {
    return {
      connected: this.connected,
      batteryLevel: this.batteryLevel,
      lidOpen: this.lidOpen,
      loaded: [...this.loaded],
      pillCounts: [...this.pillCounts],
      slots: [...this.slots],
      queuedEvents: this.unacked.size,
      log: [...this.log],
    };
  }

  private emit(): void {
    const snap = this.snapshot();
    this.listeners.forEach((l) => l(snap));
  }

  private note(message: string): void {
    const stamp = this.now().toLocaleTimeString();
    this.log = [`${stamp}  ${message}`, ...this.log].slice(0, 60);
  }

  /** Simulated wall clock, shiftable so schedules can be reached quickly. */
  private now(): Date {
    return new Date(Date.now() + this.offsetSeconds * 1000);
  }

  // ------------------------------------------------------------ gatt surface

  private buildCharacteristics(): void {
    this.commandChar = new FakeCharacteristic(CHAR_COMMAND, (data) =>
      this.handleCommand(data)
    );
    this.eventChar = new FakeCharacteristic(CHAR_EVENT);
    this.scheduleChar = new FakeCharacteristic(CHAR_SCHEDULE, (data) =>
      this.handleScheduleFrame(data)
    );
    this.statusChar = new FakeCharacteristic(
      CHAR_STATUS,
      undefined,
      () => this.statusFrame()
    );
  }

  /** The object BLEService treats as a BluetoothDevice. */
  asDevice(): BluetoothDevice {
    const service = {
      uuid: SERVICE_UUID,
      getCharacteristic: async (uuid: string) => {
        switch (uuid) {
          case CHAR_COMMAND:
            return this.commandChar;
          case CHAR_EVENT:
            return this.eventChar;
          case CHAR_SCHEDULE:
            return this.scheduleChar;
          case CHAR_STATUS:
            return this.statusChar;
          default:
            throw new Error(`Unknown characteristic ${uuid}`);
        }
      },
    };

    const server = {
      get connected() {
        return simulatedBottle.connected;
      },
      connect: async () => {
        this.connected = true;
        this.startClock();
        this.note('Connected');
        this.emit();
        return server;
      },
      disconnect: () => {
        this.connected = false;
        this.stopClock();
        this.note('Disconnected');
        this.emit();
        this.onDisconnect?.();
      },
      getPrimaryService: async (uuid: string) => {
        if (uuid !== SERVICE_UUID) throw new Error(`Unknown service ${uuid}`);
        return service;
      },
    };

    return {
      id: 'sim-ol-bottle',
      name: 'Ol Bottle (simulated)',
      gatt: server,
      addEventListener: (type: string, listener: () => void) => {
        if (type === 'gattserverdisconnected') this.onDisconnect = listener;
      },
      removeEventListener: () => {
        this.onDisconnect = null;
      },
    } as unknown as BluetoothDevice;
  }

  // -------------------------------------------------------------- frame work

  private statusFrame(): DataView {
    const bytes = new Uint8Array(FRAME_LEN);
    bytes[0] = this.firmwareVersion.major;
    bytes[1] = this.firmwareVersion.minor;
    bytes[2] = this.batteryLevel;
    bytes[3] = this.loaded.reduce(
      (mask, isLoaded, i) => (isLoaded ? mask | (1 << i) : mask),
      0
    );
    bytes[4] = this.lidOpen ? 1 : 0;
    bytes[5] = this.unacked.size;
    return new DataView(bytes.buffer);
  }

  private pushStatus(): void {
    this.statusChar.notify(new Uint8Array(this.statusFrame().buffer.slice(0)));
  }

  private sendEvent(
    type: number,
    compartment: number,
    extra: { doseId?: number; batteryLevel?: number; buttonId?: number; failure?: FailureKind } = {}
  ): void {
    const bytes = new Uint8Array(FRAME_LEN);
    const seq = this.seq++;
    const epoch = Math.floor(this.now().getTime() / 1000);

    bytes[0] = type;
    bytes[1] = compartment;
    new DataView(bytes.buffer).setUint32(2, seq, true);
    new DataView(bytes.buffer).setUint32(6, epoch, true);

    if (extra.doseId !== undefined) bytes[10] = extra.doseId;
    if (extra.batteryLevel !== undefined) bytes[10] = extra.batteryLevel;
    if (extra.buttonId !== undefined) bytes[10] = extra.buttonId;
    if (extra.failure) {
      bytes[10] = extra.doseId ?? 0;
      bytes[11] = FAILURE_CODES[extra.failure];
    }

    // Held until acked, so an app-side failure replays it just like firmware.
    this.unacked.set(seq, bytes);

    if (this.connected) {
      this.eventChar.notify(bytes);
    } else {
      this.note('Event queued while disconnected');
    }
    this.emit();
  }

  private handleCommand(data: DataView): void {
    const opcode = data.getUint8(0);
    const compartment = data.getUint8(1);

    switch (opcode) {
      case Opcode.DISPENSE:
        this.dispense(compartment, data.getUint8(2));
        break;

      case Opcode.LED_ON:
        this.note(`LED on — compartment ${compartment}`);
        break;

      case Opcode.LED_OFF:
        this.note(`LED off — compartment ${compartment}`);
        break;

      case Opcode.BUZZER:
        this.note(`Buzzer ${data.getUint8(2) | (data.getUint8(3) << 8)}ms`);
        break;

      case Opcode.VIBRATE:
        this.note(`Vibrate ${data.getUint8(2) | (data.getUint8(3) << 8)}ms`);
        break;

      case Opcode.SET_TIME:
        this.note('Time synced');
        break;

      case Opcode.SYNC_REQUEST:
        this.replayUnacked();
        break;

      case Opcode.ACK_EVENT: {
        const seq = data.getUint32(2, true);
        this.unacked.delete(seq);
        this.emit();
        break;
      }

      case Opcode.CLEAR_SCHEDULE:
        this.pendingSlots = [];
        this.note('Schedule cleared');
        break;

      case Opcode.ABORT:
        this.note('Dispense aborted');
        break;
    }
  }

  private handleScheduleFrame(data: DataView): void {
    const index = data.getUint8(0);

    if (index === 0xff) {
      this.slots = this.pendingSlots;
      this.pendingSlots = [];
      this.note(`Schedule loaded — ${this.slots.length} slots`);
      this.emit();
      return;
    }

    this.pendingSlots.push({
      index,
      compartment: data.getUint8(1),
      hour: data.getUint8(2),
      minute: data.getUint8(3),
      days: data.getUint8(4),
      flags: data.getUint8(5),
      doseId: data.getUint8(6),
    });
  }

  private replayUnacked(): void {
    if (this.unacked.size === 0) return;
    this.note(`Replaying ${this.unacked.size} queued events`);
    this.unacked.forEach((bytes) => this.eventChar.notify(bytes));
  }

  // ------------------------------------------------------------- bottle acts

  dispense(compartment: number, doseId: number): void {
    const i = compartment - 1;

    if (this.lidOpen) {
      this.note(`Dispense refused — lid open`);
      this.sendEvent(EventCode.DISPENSE_FAILED, compartment, {
        doseId,
        failure: 'lid_open',
      });
      return;
    }

    if (i < 0 || i >= COMPARTMENT_COUNT || this.pillCounts[i] <= 0) {
      this.note(`Dispense failed — compartment ${compartment} empty`);
      this.sendEvent(EventCode.DISPENSE_FAILED, compartment, {
        doseId,
        failure: 'empty',
      });
      this.sendEvent(EventCode.COMPARTMENT_EMPTY, compartment);
      return;
    }

    this.pillCounts[i]--;
    if (this.pillCounts[i] === 0) this.loaded[i] = false;

    this.note(`Dispensed from compartment ${compartment}`);
    this.sendEvent(EventCode.DISPENSE_COMPLETE, compartment, { doseId });
    this.pushStatus();
  }

  /** Someone physically takes the pill — the sensor reading that confirms intake. */
  takePill(compartment: number, doseId = 0): void {
    this.note(`Pill removed from compartment ${compartment}`);
    this.sendEvent(EventCode.COMPARTMENT_OPENED, compartment);
    this.sendEvent(EventCode.PILL_REMOVED, compartment, { doseId });
  }

  failDispense(compartment: number, kind: FailureKind): void {
    this.note(`Forced failure "${kind}" on compartment ${compartment}`);
    this.sendEvent(EventCode.DISPENSE_FAILED, compartment, { failure: kind });
  }

  pressButton(buttonId: number): void {
    this.note(`Button ${buttonId} pressed`);
    this.sendEvent(EventCode.BUTTON_PRESSED, 0, { buttonId });
  }

  setBattery(level: number): void {
    this.batteryLevel = Math.max(0, Math.min(100, level));
    this.note(`Battery ${this.batteryLevel}%`);
    this.sendEvent(EventCode.BATTERY, 0, { batteryLevel: this.batteryLevel });
    this.pushStatus();
  }

  setLid(open: boolean): void {
    this.lidOpen = open;
    this.note(open ? 'Lid opened' : 'Lid closed');
    this.pushStatus();
    this.emit();
  }

  refill(compartment: number, count = 30): void {
    const i = compartment - 1;
    this.pillCounts[i] = count;
    this.loaded[i] = count > 0;
    this.note(`Compartment ${compartment} refilled`);
    this.pushStatus();
    this.emit();
  }

  /** Simulates walking out of range: events keep recording, delivery stops. */
  dropConnection(): void {
    if (!this.connected) return;
    this.connected = false;
    this.stopClock();
    this.note('Connection dropped');
    this.emit();
    this.onDisconnect?.();
  }

  /** Shifts the bottle's clock so a schedule slot can be reached immediately. */
  shiftClock(seconds: number): void {
    this.offsetSeconds += seconds;
    this.note(`Clock shifted to ${this.now().toLocaleTimeString()}`);
    this.emit();
  }

  reset(): void {
    this.batteryLevel = 82;
    this.lidOpen = false;
    this.loaded = Array(COMPARTMENT_COUNT).fill(true);
    this.pillCounts = [30, 25, 15, 0, 0, 0];
    this.unacked.clear();
    this.offsetSeconds = 0;
    this.log = [];
    this.note('Simulator reset');
    this.emit();
  }

  // ------------------------------------------------------------------- clock

  private startClock(): void {
    if (this.tickTimer) return;
    this.tickTimer = setInterval(() => this.tick(), 5000);
  }

  private stopClock(): void {
    if (!this.tickTimer) return;
    clearInterval(this.tickTimer);
    this.tickTimer = null;
  }

  /** Fires any schedule slot whose minute has arrived, exactly as firmware would. */
  private tick(): void {
    const now = this.now();
    const dayBit = 1 << now.getDay();
    const key = `${now.toDateString()}:${now.getHours()}:${now.getMinutes()}`;

    for (const slot of this.slots) {
      if (!(slot.days & dayBit)) continue;
      if (slot.hour !== now.getHours() || slot.minute !== now.getMinutes()) continue;
      if (slot.lastFiredKey === key) continue;

      slot.lastFiredKey = key;
      this.note(`Reminder fired — compartment ${slot.compartment}`);
      this.sendEvent(EventCode.REMINDER_FIRED, slot.compartment, {
        doseId: slot.doseId,
      });

      // flags bit 1 marks auto-dispense on this slot
      if (slot.flags & 0x02) {
        this.dispense(slot.compartment, slot.doseId);
      }
    }
  }
}

export const simulatedBottle = new VirtualBottle();
