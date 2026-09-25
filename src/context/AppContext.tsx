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
  DashboardData,
  UpcomingDose,
  DayOfWeek,
  IntakeStatus,
} from '@/types';
import { useAuth } from './AuthContext';
import * as db from '@/services/firestore';
import { isMedicationSlot } from '@/lib/nfcTags';

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

  dashboardData: DashboardData;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [medications, setMedications] = useState<Medication[]>([]);
  const [schedules, setSchedules] = useState<MedicationSchedule[]>([]);
  const [intakes, setIntakes] = useState<MedicationIntake[]>([]);
  const [voicePrompts, setVoicePrompts] = useState<VoicePrompt[]>([]);
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
    ];

    return () => unsubs.forEach((u) => u());
  }, [userId]);

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
        slot: dose.slot,
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

  // ---------------------------------------------------------------- dashboard

  const dashboardData = useMemo<DashboardData>(
    () => buildDashboard(schedules, medications, intakes, now),
    [schedules, medications, intakes, now]
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
    // Schedules saved before the NFC redesign have no compartment tag.
    if (!isMedicationSlot(schedule.slot)) continue;
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
        slot: schedule.slot,
        tagColor: schedule.tagColor,
        caregiverInstruction: schedule.caregiverInstruction,
        status,
      });
    }
  }

  return doses.sort(
    (a, b) => a.scheduleTime.getTime() - b.scheduleTime.getTime()
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

  return {
    todaySchedule,
    nextReminder,
    adherenceStatus: {
      today: adherenceOf(todaySchedule),
      week: adherenceOf(weekDoses),
    },
  };
}
