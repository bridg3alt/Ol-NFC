'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import {
  Medication,
  MedicationSchedule,
  MedicationIntake,
  VoicePrompt,
  BottleDevice,
  BottleState,
  Notification,
  DashboardData,
  UpcomingDose,
  DayOfWeek,
  IntakeStatus,
} from '@/types';
import { useAuth } from './AuthContext';
import * as db from '@/services/firestore';
import {
  bleService,
  BottleEvent,
  BottleStatus,
  ConnectionState,
  EventCode,
} from '@/services/ble';

const DAY_NAMES: DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

/** A dose is counted missed once it is this far past its scheduled time. */
const MISSED_AFTER_MINUTES = 60;

interface AppContextType {
  isLoading: boolean;
  error: string | null;

  medications: Medication[];
  addMedication: (
    medication: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  updateMedication: (id: string, data: Partial<Medication>) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;

  schedules: MedicationSchedule[];
  addSchedule: (
    schedule: Omit<MedicationSchedule, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
  ) => Promise<void>;
  updateSchedule: (
    id: string,
    data: Partial<MedicationSchedule>
  ) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;

  intakes: MedicationIntake[];
  markDoseTaken: (dose: UpcomingDose) => Promise<void>;
  markDoseSkipped: (dose: UpcomingDose) => Promise<void>;

  voicePrompts: VoicePrompt[];
  addVoicePrompt: (
    prompt: Omit<VoicePrompt, 'id' | 'userId' | 'createdAt'>
  ) => Promise<void>;
  deleteVoicePrompt: (id: string) => Promise<void>;

  bottleState: BottleState;
  connectionState: ConnectionState;
  isBluetoothSupported: boolean;
  connectBottle: () => Promise<void>;
  connectSimulatedBottle: () => Promise<void>;
  disconnectBottle: () => Promise<void>;
  pushScheduleToBottle: () => Promise<void>;
  dispenseNow: (compartment: number, doseId: number) => Promise<void>;
  testLED: (
    compartment: number,
    intensity: 'low' | 'medium' | 'high',
    speed: 'slow' | 'medium' | 'fast'
  ) => Promise<void>;
  testBuzzer: () => Promise<void>;

  notifications: Notification[];
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  dashboardData: DashboardData;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const EMPTY_BOTTLE_STATE: BottleState = {
  device: null,
  isScanning: false,
  compartments: [],
  lastSync: null,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [medications, setMedications] = useState<Medication[]>([]);
  const [schedules, setSchedules] = useState<MedicationSchedule[]>([]);
  const [intakes, setIntakes] = useState<MedicationIntake[]>([]);
  const [voicePrompts, setVoicePrompts] = useState<VoicePrompt[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [bottleState, setBottleState] = useState<BottleState>(EMPTY_BOTTLE_STATE);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('disconnected');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  // Drives "is this dose late yet" without needing a write.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // ------------------------------------------------------------ data loading

  useEffect(() => {
    if (!userId) {
      setMedications([]);
      setSchedules([]);
      setIntakes([]);
      setVoicePrompts([]);
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const fail = (e: Error) => setError(e.message);

    // Two weeks back covers the dashboard's weekly adherence and the reports page.
    const since = new Date();
    since.setDate(since.getDate() - 14);
    since.setHours(0, 0, 0, 0);

    const unsubs = [
      db.subscribeMedications(
        userId,
        (items) => {
          setMedications(items);
          setIsLoading(false);
        },
        fail
      ),
      db.subscribeSchedules(userId, setSchedules, fail),
      db.subscribeIntakes(userId, since, setIntakes, fail),
      db.subscribeVoicePrompts(userId, setVoicePrompts, fail),
      db.subscribeNotifications(userId, setNotifications, fail),
    ];

    db.getSavedDevice(userId)
      .then((device) => {
        if (device) setBottleState((prev) => ({ ...prev, device }));
      })
      .catch(() => {
        /* no paired bottle yet */
      });

    return () => unsubs.forEach((u) => u());
  }, [userId]);

  // ------------------------------------------------------------ bottle events

  const handleBottleEvent = useCallback(
    async (event: BottleEvent) => {
      if (!userId) return;

      switch (event.type) {
        case EventCode.PILL_REMOVED:
        case EventCode.DISPENSE_COMPLETE: {
          // Attribute the event to whichever dose slot it lands nearest.
          const dose = findNearestDose(schedules, medications, event.timestamp, event.compartment);
          if (!dose) return;

          await db.recordIntake(userId, {
            scheduleId: dose.scheduleId,
            medicationId: dose.medication.id,
            userId,
            scheduledTime: dose.scheduleTime,
            actualTime: event.timestamp,
            status: 'taken',
            compartment: event.compartment,
            confirmedBy: 'sensor',
            sensorData: {
              compartmentOpened: true,
              shelfSlideMotion: false,
              pillRemovalDetected: event.type === EventCode.PILL_REMOVED,
              timestamp: event.timestamp,
            },
          });

          await db.createNotification(userId, {
            type: 'medication_taken',
            title: 'Medication taken',
            message: `${dose.medication.name} taken from compartment ${event.compartment}`,
            isRead: false,
          });
          break;
        }

        case EventCode.DISPENSE_FAILED: {
          await db.createNotification(userId, {
            type: 'system',
            title: 'Dispense failed',
            message: `Compartment ${event.compartment}: ${event.failureReason ?? 'unknown error'}`,
            isRead: false,
          });
          break;
        }

        case EventCode.COMPARTMENT_EMPTY: {
          await db.createNotification(userId, {
            type: 'system',
            title: 'Compartment empty',
            message: `Compartment ${event.compartment} needs refilling`,
            isRead: false,
          });
          break;
        }

        case EventCode.BATTERY: {
          const level = event.batteryLevel ?? 0;
          setBottleState((prev) => ({
            ...prev,
            device: prev.device
              ? { ...prev.device, batteryLevel: level }
              : prev.device,
          }));
          if (level <= 15) {
            await db.createNotification(userId, {
              type: 'battery_low',
              title: 'Low battery',
              message: `Ol bottle battery is at ${level}%`,
              isRead: false,
            });
          }
          break;
        }

        case EventCode.REMINDER_FIRED: {
          const dose = findNearestDose(schedules, medications, event.timestamp, event.compartment);
          await db.createNotification(userId, {
            type: 'medication_upcoming',
            title: 'Reminder',
            message: dose
              ? `Time to take ${dose.medication.name}`
              : `Reminder for compartment ${event.compartment}`,
            isRead: false,
          });
          break;
        }
      }
    },
    [userId, schedules, medications]
  );

  useEffect(() => {
    const offEvent = bleService.onEvent(handleBottleEvent);
    const offState = bleService.onStateChange(setConnectionState);
    const offStatus = bleService.onStatus((status: BottleStatus) => {
      setBottleState((prev) => ({
        ...prev,
        lastSync: new Date(),
        compartments: Array.from({ length: 6 }, (_, i) => ({
          number: i + 1,
          isOpen: status.lidOpen,
          hasPills: status.loadedCompartments.includes(i + 1),
        })),
        device: prev.device
          ? {
              ...prev.device,
              batteryLevel: status.batteryLevel,
              firmwareVersion: status.firmwareVersion,
              isConnected: true,
            }
          : prev.device,
      }));
    });

    return () => {
      offEvent();
      offState();
      offStatus();
    };
  }, [handleBottleEvent]);

  // ------------------------------------------------------------------ actions

  const requireUser = useCallback((): string => {
    if (!userId) throw new Error('You must be signed in to do that');
    return userId;
  }, [userId]);

  const addMedication = useCallback(
    async (medication: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>) => {
      await db.createMedication(requireUser(), medication);
    },
    [requireUser]
  );

  const updateMedication = useCallback(
    async (id: string, data: Partial<Medication>) => {
      await db.updateMedication(id, data);
    },
    []
  );

  const deleteMedication = useCallback(
    async (id: string) => {
      await db.deleteMedication(requireUser(), id);
    },
    [requireUser]
  );

  const addSchedule = useCallback(
    async (
      schedule: Omit<
        MedicationSchedule,
        'id' | 'createdAt' | 'updatedAt' | 'userId'
      >
    ) => {
      const uid = requireUser();
      await db.createSchedule(uid, { ...schedule, userId: uid });
    },
    [requireUser]
  );

  const updateSchedule = useCallback(
    async (id: string, data: Partial<MedicationSchedule>) => {
      await db.updateSchedule(id, data);
    },
    []
  );

  const deleteSchedule = useCallback(async (id: string) => {
    await db.deleteSchedule(id);
  }, []);

  const recordDose = useCallback(
    async (dose: UpcomingDose, status: IntakeStatus) => {
      const uid = requireUser();
      await db.recordIntake(uid, {
        scheduleId: dose.scheduleId,
        medicationId: dose.medication.id,
        userId: uid,
        scheduledTime: dose.scheduleTime,
        actualTime: new Date(),
        status,
        compartment: dose.compartment,
        confirmedBy: 'user',
      });
    },
    [requireUser]
  );

  const markDoseTaken = useCallback(
    (dose: UpcomingDose) => recordDose(dose, 'taken'),
    [recordDose]
  );

  const markDoseSkipped = useCallback(
    (dose: UpcomingDose) => recordDose(dose, 'skipped'),
    [recordDose]
  );

  const addVoicePrompt = useCallback(
    async (prompt: Omit<VoicePrompt, 'id' | 'userId' | 'createdAt'>) => {
      await db.createVoicePrompt(requireUser(), prompt);
    },
    [requireUser]
  );

  const deleteVoicePrompt = useCallback(async (id: string) => {
    await db.deleteVoicePrompt(id);
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    await db.markNotificationRead(id);
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    await db.markAllNotificationsRead(requireUser());
  }, [requireUser]);

  // ------------------------------------------------------------------- bottle

  const pushScheduleToBottle = useCallback(async () => {
    if (!bleService.isConnected()) throw new Error('Bottle is not connected');
    await bleService.pushSchedule(schedules);
    setBottleState((prev) => ({ ...prev, lastSync: new Date() }));
  }, [schedules]);

  const establishBottle = useCallback(
    async (open: () => Promise<boolean>, name: string) => {
      const uid = requireUser();
      await open();

      const status = await bleService.readStatus();
      const device: BottleDevice = {
        id: 'ol-bottle',
        name,
        macAddress: '',
        batteryLevel: status?.batteryLevel ?? 0,
        firmwareVersion: status?.firmwareVersion ?? '',
        isConnected: true,
        lastSeen: new Date(),
        rssi: 0,
      };

      setBottleState((prev) => ({ ...prev, device, lastSync: new Date() }));
      await db.saveDevice(uid, device);

      // The bottle must hold the schedule itself to fire reminders unattended.
      await bleService.pushSchedule(schedules);
    },
    [requireUser, schedules]
  );

  const connectBottle = useCallback(
    () => establishBottle(() => bleService.connect(), 'Ol Bottle'),
    [establishBottle]
  );

  const connectSimulatedBottle = useCallback(
    () =>
      establishBottle(
        () => bleService.connectSimulated(),
        'Ol Bottle (simulated)'
      ),
    [establishBottle]
  );

  const disconnectBottle = useCallback(async () => {
    await bleService.disconnect();
    setBottleState((prev) => ({
      ...prev,
      device: prev.device ? { ...prev.device, isConnected: false } : null,
    }));
  }, []);

  const dispenseNow = useCallback(
    async (compartment: number, doseId: number) => {
      await bleService.dispense(compartment, doseId);
    },
    []
  );

  const testLED = useCallback(
    async (
      compartment: number,
      intensity: 'low' | 'medium' | 'high',
      speed: 'slow' | 'medium' | 'fast'
    ) => {
      await bleService.setLED(compartment, intensity, speed);
    },
    []
  );

  const testBuzzer = useCallback(async () => {
    await bleService.buzz(1000);
  }, []);

  // ---------------------------------------------------------------- dashboard

  const dashboardData = useMemo<DashboardData>(
    () => buildDashboard(schedules, medications, intakes, notifications, bottleState, now),
    [schedules, medications, intakes, notifications, bottleState, now]
  );

  const value: AppContextType = {
    isLoading,
    error,
    medications,
    addMedication,
    updateMedication,
    deleteMedication,
    schedules,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    intakes,
    markDoseTaken,
    markDoseSkipped,
    voicePrompts,
    addVoicePrompt,
    deleteVoicePrompt,
    bottleState,
    connectionState,
    isBluetoothSupported: bleService.isSupported(),
    connectBottle,
    connectSimulatedBottle,
    disconnectBottle,
    pushScheduleToBottle,
    dispenseNow,
    testLED,
    testBuzzer,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    dashboardData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// ---------------------------------------------------------------- computation

/**
 * Expands schedules into the concrete dose slots for a given day, then folds in
 * whatever intake records exist for those slots. A slot with no record is
 * pending until it is an hour late, at which point it counts as missed.
 */
function expandDoses(
  schedules: MedicationSchedule[],
  medications: Medication[],
  intakes: MedicationIntake[],
  day: Date,
  now: Date
): UpcomingDose[] {
  const dayName = DAY_NAMES[day.getDay()];
  const doses: UpcomingDose[] = [];

  for (const schedule of schedules) {
    if (!schedule.isActive) continue;
    if (!schedule.daysOfWeek.includes(dayName)) continue;

    const medication = medications.find((m) => m.id === schedule.medicationId);
    if (!medication) continue;

    for (const time of schedule.times) {
      const [hours, minutes] = time.split(':').map(Number);
      const scheduleTime = new Date(day);
      scheduleTime.setHours(hours, minutes, 0, 0);

      const record = intakes.find(
        (i) =>
          i.scheduleId === schedule.id &&
          i.scheduledTime.getTime() === scheduleTime.getTime()
      );

      let status: IntakeStatus;
      if (record) {
        status = record.status;
      } else {
        const minutesLate = (now.getTime() - scheduleTime.getTime()) / 60000;
        status = minutesLate > MISSED_AFTER_MINUTES ? 'missed' : 'pending';
      }

      doses.push({
        id: `${schedule.id}_${scheduleTime.toISOString()}`,
        scheduleId: schedule.id,
        medication,
        scheduleTime,
        label: schedule.customLabel || schedule.label,
        compartment: schedule.compartment,
        status,
      });
    }
  }

  return doses.sort(
    (a, b) => a.scheduleTime.getTime() - b.scheduleTime.getTime()
  );
}

function findNearestDose(
  schedules: MedicationSchedule[],
  medications: Medication[],
  at: Date,
  compartment: number
): UpcomingDose | null {
  const candidates = expandDoses(schedules, medications, [], at, at).filter(
    (d) => d.compartment === compartment
  );
  if (candidates.length === 0) return null;

  return candidates.reduce((closest, dose) =>
    Math.abs(dose.scheduleTime.getTime() - at.getTime()) <
    Math.abs(closest.scheduleTime.getTime() - at.getTime())
      ? dose
      : closest
  );
}

function adherenceOf(doses: UpcomingDose[]) {
  const total = doses.length;
  const taken = doses.filter(
    (d) => d.status === 'taken' || d.status === 'taken_late'
  ).length;
  return {
    taken,
    total,
    percentage: total === 0 ? 0 : Math.round((taken / total) * 100),
  };
}

function buildDashboard(
  schedules: MedicationSchedule[],
  medications: Medication[],
  intakes: MedicationIntake[],
  notifications: Notification[],
  bottleState: BottleState,
  now: Date
): DashboardData {
  const todaySchedule = expandDoses(schedules, medications, intakes, now, now);

  const weekDoses: UpcomingDose[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    weekDoses.push(...expandDoses(schedules, medications, intakes, day, now));
  }

  const nextReminder =
    todaySchedule.find(
      (d) => d.status === 'pending' && d.scheduleTime.getTime() > now.getTime()
    ) ?? null;

  const nextDoseIn = nextReminder
    ? Math.max(
        0,
        Math.round((nextReminder.scheduleTime.getTime() - now.getTime()) / 60000)
      )
    : 0;

  return {
    todaySchedule,
    nextReminder,
    adherenceStatus: {
      today: adherenceOf(todaySchedule),
      week: adherenceOf(weekDoses),
    },
    bottleConnection: {
      isConnected: bottleState.device?.isConnected ?? false,
      deviceName: bottleState.device?.name,
      batteryLevel: bottleState.device?.batteryLevel,
      lastSync: bottleState.lastSync,
    },
    notifications: notifications.filter((n) => !n.isRead),
    quickStats: {
      totalMedications: medications.length,
      activeSchedules: schedules.filter((s) => s.isActive).length,
      streakDays: computeStreak(schedules, medications, intakes, now),
      nextDoseIn,
    },
  };
}

/** Consecutive days back from yesterday where every scheduled dose was taken. */
function computeStreak(
  schedules: MedicationSchedule[],
  medications: Medication[],
  intakes: MedicationIntake[],
  now: Date
): number {
  let streak = 0;

  for (let i = 1; i <= 14; i++) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);

    const doses = expandDoses(schedules, medications, intakes, day, now);
    if (doses.length === 0) continue;

    const allTaken = doses.every(
      (d) => d.status === 'taken' || d.status === 'taken_late'
    );
    if (!allTaken) break;
    streak++;
  }

  return streak;
}
