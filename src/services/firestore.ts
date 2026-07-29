// Olvia - Firestore data layer
// All app data lives here. Nothing is held only in component state.

import {
  Firestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fsLimit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  DocumentData,
} from 'firebase/firestore';
import { initializeFirebase } from './firebase';
import {
  Medication,
  MedicationSchedule,
  MedicationIntake,
  VoicePrompt,
  Notification,
  BottleDevice,
  IntakeStatus,
} from '@/types';

function getDb(): Firestore {
  const firebase = initializeFirebase();
  if (!firebase?.db) throw new Error('Firestore is not available');
  return firebase.db;
}

/** Firestore returns Timestamps; the app works in Dates. */
function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return new Date();
}

function toOptionalDate(value: unknown): Date | undefined {
  if (value === null || value === undefined) return undefined;
  return toDate(value);
}

/** Firestore rejects undefined values, so strip them before every write. */
function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

function mapMedication(id: string, d: DocumentData): Medication {
  return {
    id,
    name: d.name,
    dosage: d.dosage,
    unit: d.unit,
    instructions: d.instructions,
    sideEffects: d.sideEffects,
    color: d.color,
    icon: d.icon,
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  };
}

function mapSchedule(id: string, d: DocumentData): MedicationSchedule {
  return {
    id,
    medicationId: d.medicationId,
    userId: d.userId,
    times: d.times ?? [],
    daysOfWeek: d.daysOfWeek ?? [],
    label: d.label,
    customLabel: d.customLabel,
    compartment: d.compartment,
    reminderSettings: d.reminderSettings,
    voicePromptId: d.voicePromptId,
    ledSettings: d.ledSettings,
    isActive: d.isActive ?? true,
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  };
}

function mapIntake(id: string, d: DocumentData): MedicationIntake {
  return {
    id,
    scheduleId: d.scheduleId,
    medicationId: d.medicationId,
    userId: d.userId,
    scheduledTime: toDate(d.scheduledTime),
    actualTime: toOptionalDate(d.actualTime),
    status: d.status,
    compartment: d.compartment,
    sensorData: d.sensorData
      ? { ...d.sensorData, timestamp: toDate(d.sensorData.timestamp) }
      : undefined,
    confirmedBy: d.confirmedBy,
    notes: d.notes,
    createdAt: toDate(d.createdAt),
  };
}

// ---------------------------------------------------------------- medications

export function subscribeMedications(
  userId: string,
  onChange: (items: Medication[]) => void,
  onError?: (e: Error) => void
): () => void {
  const q = query(
    collection(getDb(), 'medications'),
    where('userId', '==', userId),
    orderBy('name')
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => mapMedication(d.id, d.data()))),
    onError
  );
}

export async function createMedication(
  userId: string,
  data: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = await addDoc(collection(getDb(), 'medications'), {
    ...stripUndefined(data),
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateMedication(
  id: string,
  data: Partial<Medication>
): Promise<void> {
  const { id: _omit, createdAt, ...rest } = data;
  await updateDoc(doc(getDb(), 'medications', id), {
    ...stripUndefined(rest),
    updatedAt: serverTimestamp(),
  });
}

/** Deletes the medication and every schedule that referenced it, atomically. */
export async function deleteMedication(
  userId: string,
  id: string
): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);

  batch.delete(doc(db, 'medications', id));

  const schedules = await getDocs(
    query(
      collection(db, 'schedules'),
      where('userId', '==', userId),
      where('medicationId', '==', id)
    )
  );
  schedules.forEach((s) => batch.delete(s.ref));

  await batch.commit();
}

// ------------------------------------------------------------------ schedules

export function subscribeSchedules(
  userId: string,
  onChange: (items: MedicationSchedule[]) => void,
  onError?: (e: Error) => void
): () => void {
  const q = query(
    collection(getDb(), 'schedules'),
    where('userId', '==', userId)
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => mapSchedule(d.id, d.data()))),
    onError
  );
}

export async function createSchedule(
  userId: string,
  data: Omit<MedicationSchedule, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = await addDoc(collection(getDb(), 'schedules'), {
    ...stripUndefined(data),
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSchedule(
  id: string,
  data: Partial<MedicationSchedule>
): Promise<void> {
  const { id: _omit, createdAt, ...rest } = data;
  await updateDoc(doc(getDb(), 'schedules', id), {
    ...stripUndefined(rest),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSchedule(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'schedules', id));
}

// -------------------------------------------------------------------- intakes

export function subscribeIntakes(
  userId: string,
  since: Date,
  onChange: (items: MedicationIntake[]) => void,
  onError?: (e: Error) => void
): () => void {
  const q = query(
    collection(getDb(), 'intakes'),
    where('userId', '==', userId),
    where('scheduledTime', '>=', Timestamp.fromDate(since)),
    orderBy('scheduledTime', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => mapIntake(d.id, d.data()))),
    onError
  );
}

export async function getIntakesBetween(
  userId: string,
  start: Date,
  end: Date
): Promise<MedicationIntake[]> {
  const snap = await getDocs(
    query(
      collection(getDb(), 'intakes'),
      where('userId', '==', userId),
      where('scheduledTime', '>=', Timestamp.fromDate(start)),
      where('scheduledTime', '<=', Timestamp.fromDate(end)),
      orderBy('scheduledTime', 'desc')
    )
  );
  return snap.docs.map((d) => mapIntake(d.id, d.data()));
}

/**
 * Records an intake under a deterministic id (schedule + slot time), so the
 * same dose reported twice — a replayed bottle event, a double tap — updates
 * one document instead of inflating adherence with duplicates.
 */
export async function recordIntake(
  userId: string,
  intake: Omit<MedicationIntake, 'id' | 'createdAt'>
): Promise<string> {
  const slot = intake.scheduledTime.toISOString();
  const id = `${userId}_${intake.scheduleId}_${slot}`;

  await setDoc(
    doc(getDb(), 'intakes', id),
    {
      ...stripUndefined(intake),
      userId,
      scheduledTime: Timestamp.fromDate(intake.scheduledTime),
      actualTime: intake.actualTime
        ? Timestamp.fromDate(intake.actualTime)
        : null,
      sensorData: intake.sensorData
        ? {
            ...intake.sensorData,
            timestamp: Timestamp.fromDate(intake.sensorData.timestamp),
          }
        : null,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  return id;
}

export async function updateIntakeStatus(
  id: string,
  status: IntakeStatus,
  confirmedBy?: MedicationIntake['confirmedBy']
): Promise<void> {
  await updateDoc(doc(getDb(), 'intakes', id), {
    status,
    actualTime: Timestamp.fromDate(new Date()),
    ...(confirmedBy ? { confirmedBy } : {}),
  });
}

// --------------------------------------------------------------- voice prompts

export function subscribeVoicePrompts(
  userId: string,
  onChange: (items: VoicePrompt[]) => void,
  onError?: (e: Error) => void
): () => void {
  const q = query(
    collection(getDb(), 'voicePrompts'),
    where('userId', '==', userId)
  );
  return onSnapshot(
    q,
    (snap) =>
      onChange(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: data.userId,
            name: data.name,
            audioUrl: data.audioUrl,
            storagePath: data.storagePath,
            duration: data.duration,
            isDefault: data.isDefault,
            createdAt: toDate(data.createdAt),
          };
        })
      ),
    onError
  );
}

export async function createVoicePrompt(
  userId: string,
  data: Omit<VoicePrompt, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(getDb(), 'voicePrompts'), {
    ...stripUndefined(data),
    userId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteVoicePrompt(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'voicePrompts', id));
}

// ------------------------------------------------------------------- devices

export async function saveDevice(
  userId: string,
  device: BottleDevice
): Promise<void> {
  await setDoc(
    doc(getDb(), 'devices', `${userId}_${device.id}`),
    {
      ...stripUndefined(device),
      userId,
      lastSeen: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getSavedDevice(
  userId: string
): Promise<BottleDevice | null> {
  const snap = await getDocs(
    query(
      collection(getDb(), 'devices'),
      where('userId', '==', userId),
      fsLimit(1)
    )
  );
  if (snap.empty) return null;

  const d = snap.docs[0].data();
  return {
    id: d.id,
    name: d.name,
    macAddress: d.macAddress ?? '',
    batteryLevel: d.batteryLevel ?? 0,
    firmwareVersion: d.firmwareVersion ?? '',
    isConnected: false,
    lastSeen: toDate(d.lastSeen),
    rssi: d.rssi ?? 0,
  };
}

// -------------------------------------------------------------- notifications

export function subscribeNotifications(
  userId: string,
  onChange: (items: Notification[]) => void,
  onError?: (e: Error) => void
): () => void {
  const q = query(
    collection(getDb(), 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    fsLimit(50)
  );
  return onSnapshot(
    q,
    (snap) =>
      onChange(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: data.userId,
            type: data.type,
            title: data.title,
            message: data.message,
            data: data.data,
            isRead: data.isRead ?? false,
            createdAt: toDate(data.createdAt),
          };
        })
      ),
    onError
  );
}

export async function createNotification(
  userId: string,
  data: Omit<Notification, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(getDb(), 'notifications'), {
    ...stripUndefined(data),
    userId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(getDb(), 'notifications', id), { isRead: true });
}

export async function markAllNotificationsRead(
  userId: string
): Promise<void> {
  const db = getDb();
  const snap = await getDocs(
    query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('isRead', '==', false)
    )
  );
  const batch = writeBatch(db);
  snap.forEach((n) => batch.update(n.ref, { isRead: true }));
  await batch.commit();
}
