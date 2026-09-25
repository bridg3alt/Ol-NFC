// =====================================================
// Olvia - NFC assistive companion
// Core Type Definitions
// =====================================================

import type { MedicationSlot } from '@/lib/nfcTags';

// =====================================================
// User Types
// =====================================================

export type UserRole = 'caregiver' | 'user';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  phoneNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  settings: UserSettings;
  careRecipientIds?: string[]; // For caregivers
  caregiverId?: string; // For users
}

export interface UserSettings {
  language: string;
  timezone: string;
  notificationsEnabled: boolean;
  accessibilityMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  highContrast: boolean;
}

// =====================================================
// Medication Types
// =====================================================

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  unit: string;
  instructions?: string;
  sideEffects?: string;
  color?: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * One medicine placed in one compartment. The compartment is identified by
 * its NFC tag (`slot`), and `tagColor` is how the user tells tags apart.
 */
export interface MedicationSchedule {
  id: string;
  medicationId: string;
  medication?: Medication;
  userId: string;

  // Schedule Configuration
  times: string[]; // Array of times in HH:mm format
  daysOfWeek: DayOfWeek[]; // Days when this schedule applies

  // Which compartment tag holds this medicine, and what the sticker looks like
  slot: MedicationSlot;
  tagColor: string;

  // Spoken to the user after the alarm is stopped, written by the caregiver
  caregiverInstruction?: string;

  // Optional recorded caregiver voice, played instead of text-to-speech
  voicePromptId?: string;

  // Status
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

// =====================================================
// Voice Prompt Types
// =====================================================

export interface VoicePrompt {
  id: string;
  userId: string;
  name: string;
  audioUrl: string;
  storagePath?: string; // Storage object backing audioUrl, for deletion
  duration: number; // in seconds
  createdAt: Date;
  isDefault?: boolean;
}

// =====================================================
// Medication Intake & Adherence Types
// =====================================================

export interface MedicationIntake {
  id: string;
  scheduleId: string;
  medicationId: string;
  userId: string;
  scheduledTime: Date;
  actualTime?: Date;
  status: IntakeStatus;
  slot: MedicationSlot;
  confirmedBy?: 'user' | 'caregiver';
  notes?: string;
  createdAt: Date;
}

export type IntakeStatus =
  | 'pending'
  | 'taken'
  | 'missed'
  | 'skipped'
  | 'taken_late';

// =====================================================
// Dashboard Types
// =====================================================

export interface DashboardData {
  todaySchedule: UpcomingDose[];
  nextReminder: UpcomingDose | null;
  adherenceStatus: AdherenceStatus;
}

export interface UpcomingDose {
  id: string;
  scheduleId: string;
  medication: Medication;
  scheduleTime: Date;
  slot: MedicationSlot;
  tagColor: string;
  caregiverInstruction?: string;
  status: IntakeStatus;
}

export interface AdherenceStatus {
  today: {
    taken: number;
    total: number;
    percentage: number;
  };
  week: {
    taken: number;
    total: number;
    percentage: number;
  };
}
