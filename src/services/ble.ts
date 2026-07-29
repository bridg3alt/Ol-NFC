// Olvia - BLE service for the Ol smart bottle
// Implements BLE protocol v1 (see firmware/PROTOCOL.md).
// Frame layouts and UUIDs must stay in sync with firmware/olvia_esp32.

import { CompartmentState, DayOfWeek, MedicationSchedule } from '@/types';

const SERVICE_UUID = '6f1a0001-b5a3-f393-e0a9-e50e24dcca9e';
const CHAR_COMMAND = '6f1a0002-b5a3-f393-e0a9-e50e24dcca9e';
const CHAR_EVENT = '6f1a0003-b5a3-f393-e0a9-e50e24dcca9e';
const CHAR_SCHEDULE = '6f1a0004-b5a3-f393-e0a9-e50e24dcca9e';
const CHAR_STATUS = '6f1a0005-b5a3-f393-e0a9-e50e24dcca9e';

const DEVICE_NAME_PREFIX = 'Ol Bottle';
const FRAME_LEN = 20;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

export const Opcode = {
  DISPENSE: 0x01,
  LED_ON: 0x02,
  LED_OFF: 0x03,
  BUZZER: 0x04,
  VIBRATE: 0x05,
  SET_TIME: 0x06,
  SYNC_REQUEST: 0x07,
  ACK_EVENT: 0x08,
  CLEAR_SCHEDULE: 0x09,
  ABORT: 0x0a,
} as const;

export const EventCode = {
  COMPARTMENT_OPENED: 0x81,
  PILL_REMOVED: 0x82,
  DISPENSE_COMPLETE: 0x83,
  DISPENSE_FAILED: 0x84,
  BATTERY: 0x85,
  COMPARTMENT_EMPTY: 0x86,
  BUTTON_PRESSED: 0x87,
  REMINDER_FIRED: 0x88,
} as const;

export const DispenseFailure = {
  0x01: 'jam',
  0x02: 'empty',
  0x03: 'already_dispensed',
  0x04: 'servo_timeout',
  0x05: 'lid_open',
} as const;

export type DispenseFailureReason =
  (typeof DispenseFailure)[keyof typeof DispenseFailure];

export interface BottleEvent {
  type: number;
  typeName: string;
  compartment: number;
  seq: number;
  timestamp: Date;
  doseId?: number;
  batteryLevel?: number;
  buttonId?: number;
  failureReason?: DispenseFailureReason;
}

export interface BottleStatus {
  firmwareVersion: string;
  batteryLevel: number;
  loadedCompartments: number[];
  lidOpen: boolean;
  pendingEvents: number;
}

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

type EventHandler = (event: BottleEvent) => void | Promise<void>;
type StatusHandler = (status: BottleStatus) => void;
type StateHandler = (state: ConnectionState) => void;

const EVENT_NAMES: Record<number, string> = {
  [EventCode.COMPARTMENT_OPENED]: 'compartment_opened',
  [EventCode.PILL_REMOVED]: 'pill_removed',
  [EventCode.DISPENSE_COMPLETE]: 'dispense_complete',
  [EventCode.DISPENSE_FAILED]: 'dispense_failed',
  [EventCode.BATTERY]: 'battery',
  [EventCode.COMPARTMENT_EMPTY]: 'compartment_empty',
  [EventCode.BUTTON_PRESSED]: 'button_pressed',
  [EventCode.REMINDER_FIRED]: 'reminder_fired',
};

const DAY_BITS: Record<DayOfWeek, number> = {
  sunday: 1 << 0,
  monday: 1 << 1,
  tuesday: 1 << 2,
  wednesday: 1 << 3,
  thursday: 1 << 4,
  friday: 1 << 5,
  saturday: 1 << 6,
};

function parseEvent(view: DataView): BottleEvent {
  const type = view.getUint8(0);
  const event: BottleEvent = {
    type,
    typeName: EVENT_NAMES[type] ?? `unknown_${type.toString(16)}`,
    compartment: view.getUint8(1),
    seq: view.getUint32(2, true),
    timestamp: new Date(view.getUint32(6, true) * 1000),
  };

  switch (type) {
    case EventCode.PILL_REMOVED:
    case EventCode.DISPENSE_COMPLETE:
    case EventCode.REMINDER_FIRED:
      event.doseId = view.getUint8(10);
      break;
    case EventCode.DISPENSE_FAILED:
      event.doseId = view.getUint8(10);
      event.failureReason =
        DispenseFailure[view.getUint8(11) as keyof typeof DispenseFailure];
      break;
    case EventCode.BATTERY:
      event.batteryLevel = view.getUint8(10);
      break;
    case EventCode.BUTTON_PRESSED:
      event.buttonId = view.getUint8(10);
      break;
  }

  return event;
}

function parseStatus(view: DataView): BottleStatus {
  const mask = view.getUint8(3);
  const loaded: number[] = [];
  for (let i = 0; i < 6; i++) if (mask & (1 << i)) loaded.push(i + 1);

  return {
    firmwareVersion: `${view.getUint8(0)}.${view.getUint8(1)}`,
    batteryLevel: view.getUint8(2),
    loadedCompartments: loaded,
    lidOpen: view.getUint8(4) === 1,
    pendingEvents: view.getUint8(5),
  };
}

class BLEService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private commandChar: BluetoothRemoteGATTCharacteristic | null = null;
  private scheduleChar: BluetoothRemoteGATTCharacteristic | null = null;
  private statusChar: BluetoothRemoteGATTCharacteristic | null = null;

  private eventHandlers = new Set<EventHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private stateHandlers = new Set<StateHandler>();

  private state: ConnectionState = 'disconnected';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private lastStatus: BottleStatus | null = null;

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  getState(): ConnectionState {
    return this.state;
  }

  getLastStatus(): BottleStatus | null {
    return this.lastStatus;
  }

  isConnected(): boolean {
    return this.server?.connected === true;
  }

  onEvent(handler: EventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  onStateChange(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.stateHandlers.forEach((h) => h(state));
  }

  /** Prompts the user to pick a bottle, then connects. Requires a user gesture. */
  async connect(): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error('Web Bluetooth is not supported in this browser');
    }

    this.setState('connecting');

    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: DEVICE_NAME_PREFIX }],
        optionalServices: [SERVICE_UUID],
      });

      this.device.addEventListener('gattserverdisconnected', () =>
        this.handleDisconnect()
      );

      await this.establishSession();
      return true;
    } catch (error) {
      this.setState('disconnected');
      throw error;
    }
  }

  /**
   * Connects to the in-browser virtual bottle instead of real hardware.
   * Takes the same establishSession path as connect(), so the protocol,
   * event, ack, and reconnect code under test is identical.
   */
  async connectSimulated(): Promise<boolean> {
    this.setState('connecting');

    try {
      const { simulatedBottle } = await import('./bleSimulator');
      this.device = simulatedBottle.asDevice();
      this.device.addEventListener('gattserverdisconnected', () =>
        this.handleDisconnect()
      );

      await this.establishSession();
      return true;
    } catch (error) {
      this.setState('disconnected');
      throw error;
    }
  }

  private async establishSession(): Promise<void> {
    if (!this.device?.gatt) throw new Error('No device selected');

    this.server = await this.device.gatt.connect();
    const service = await this.server.getPrimaryService(SERVICE_UUID);

    this.commandChar = await service.getCharacteristic(CHAR_COMMAND);
    this.scheduleChar = await service.getCharacteristic(CHAR_SCHEDULE);
    this.statusChar = await service.getCharacteristic(CHAR_STATUS);

    const eventChar = await service.getCharacteristic(CHAR_EVENT);
    await eventChar.startNotifications();
    eventChar.addEventListener('characteristicvaluechanged', (e) => {
      const value = (e.target as BluetoothRemoteGATTCharacteristic).value;
      if (value) void this.handleEvent(parseEvent(value));
    });

    await this.statusChar.startNotifications();
    this.statusChar.addEventListener('characteristicvaluechanged', (e) => {
      const value = (e.target as BluetoothRemoteGATTCharacteristic).value;
      if (value) {
        this.lastStatus = parseStatus(value);
        this.statusHandlers.forEach((h) => h(this.lastStatus!));
      }
    });

    this.reconnectAttempts = 0;
    this.setState('connected');

    await this.syncTime();
    await this.requestSync();
  }

  private async handleEvent(event: BottleEvent): Promise<void> {
    // Handlers persist the event (e.g. to Firestore) before we ack it.
    // A throw here means the event stays queued on the bottle and is replayed.
    try {
      await Promise.all(
        Array.from(this.eventHandlers).map((h) => h(event))
      );
      await this.ackEvent(event.seq);
    } catch (error) {
      console.error('Event handling failed, leaving unacked:', error);
    }
  }

  private handleDisconnect(): void {
    this.server = null;
    this.commandChar = null;
    this.scheduleChar = null;
    this.statusChar = null;

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.setState('disconnected');
      return;
    }

    this.setState('reconnecting');
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectAttempts++;
      try {
        await this.establishSession();
      } catch {
        this.handleDisconnect();
      }
    }, RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts));
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = MAX_RECONNECT_ATTEMPTS;

    if (this.server?.connected) this.server.disconnect();

    this.device = null;
    this.server = null;
    this.commandChar = null;
    this.scheduleChar = null;
    this.statusChar = null;
    this.setState('disconnected');
  }

  private async writeCommand(
    opcode: number,
    compartment = 0,
    payload: number[] = []
  ): Promise<void> {
    if (!this.commandChar) throw new Error('Bottle not connected');

    const frame = new Uint8Array(FRAME_LEN);
    frame[0] = opcode;
    frame[1] = compartment;
    payload.forEach((byte, i) => {
      if (i + 2 < FRAME_LEN) frame[i + 2] = byte;
    });

    await this.commandChar.writeValue(frame);
  }

  async dispense(compartment: number, doseId: number): Promise<void> {
    await this.writeCommand(Opcode.DISPENSE, compartment, [doseId]);
  }

  async abortDispense(): Promise<void> {
    await this.writeCommand(Opcode.ABORT);
  }

  async setLED(
    compartment: number,
    intensity: 'low' | 'medium' | 'high',
    speed: 'slow' | 'medium' | 'fast'
  ): Promise<void> {
    const levels = { low: 0, medium: 1, high: 2 };
    const speeds = { slow: 0, medium: 1, fast: 2 };
    await this.writeCommand(Opcode.LED_ON, compartment, [
      levels[intensity],
      speeds[speed],
    ]);
  }

  async clearLED(compartment: number): Promise<void> {
    await this.writeCommand(Opcode.LED_OFF, compartment);
  }

  async buzz(durationMs = 1000): Promise<void> {
    await this.writeCommand(Opcode.BUZZER, 0, [
      durationMs & 0xff,
      (durationMs >> 8) & 0xff,
    ]);
  }

  async vibrate(durationMs = 1000): Promise<void> {
    await this.writeCommand(Opcode.VIBRATE, 0, [
      durationMs & 0xff,
      (durationMs >> 8) & 0xff,
    ]);
  }

  /** Bottle has no reliable RTC across power loss, so push wall-clock on connect. */
  async syncTime(): Promise<void> {
    const epoch = Math.floor(Date.now() / 1000);
    await this.writeCommand(Opcode.SET_TIME, 0, [
      epoch & 0xff,
      (epoch >> 8) & 0xff,
      (epoch >> 16) & 0xff,
      (epoch >> 24) & 0xff,
    ]);
  }

  /** Asks the bottle to replay every intake event recorded while out of range. */
  async requestSync(): Promise<void> {
    await this.writeCommand(Opcode.SYNC_REQUEST);
  }

  private async ackEvent(seq: number): Promise<void> {
    await this.writeCommand(Opcode.ACK_EVENT, 0, [
      seq & 0xff,
      (seq >> 8) & 0xff,
      (seq >> 16) & 0xff,
      (seq >> 24) & 0xff,
    ]);
  }

  /** Pushes the full schedule so reminders fire with the phone absent. */
  async pushSchedule(schedules: MedicationSchedule[]): Promise<void> {
    if (!this.scheduleChar) throw new Error('Bottle not connected');

    await this.writeCommand(Opcode.CLEAR_SCHEDULE);

    let index = 0;
    for (const schedule of schedules) {
      if (!schedule.isActive) continue;

      const days = schedule.daysOfWeek.reduce(
        (mask, day) => mask | DAY_BITS[day],
        0
      );

      for (const time of schedule.times) {
        if (index >= 32) break;

        const [hour, minute] = time.split(':').map(Number);
        const modes = schedule.reminderSettings.modes;

        let flags = 0x01;
        if (schedule.reminderSettings.autoDispense) flags |= 0x02;
        if (modes.includes('led')) flags |= 0x04;
        if (modes.includes('buzzer')) flags |= 0x08;
        if (modes.includes('vibration')) flags |= 0x10;

        const frame = new Uint8Array(FRAME_LEN);
        frame[0] = index;
        frame[1] = schedule.compartment;
        frame[2] = hour;
        frame[3] = minute;
        frame[4] = days;
        frame[5] = flags;
        frame[6] = index + 1; // dose id, unique per schedule slot

        await this.scheduleChar.writeValue(frame);
        index++;
      }
    }

    const endFrame = new Uint8Array(FRAME_LEN);
    endFrame[0] = 0xff;
    await this.scheduleChar.writeValue(endFrame);
  }

  async readStatus(): Promise<BottleStatus | null> {
    if (!this.statusChar) return null;
    const value = await this.statusChar.readValue();
    this.lastStatus = parseStatus(value);
    return this.lastStatus;
  }

  async getCompartmentStates(): Promise<CompartmentState[]> {
    const status = await this.readStatus();
    if (!status) return [];

    return Array.from({ length: 6 }, (_, i) => ({
      number: i + 1,
      isOpen: status.lidOpen,
      hasPills: status.loadedCompartments.includes(i + 1),
    }));
  }
}

export const bleService = new BLEService();

export default BLEService;
