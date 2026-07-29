// =====================================================
// Olvia - Smart Assistive Medication App
// Core Type Definitions
// =====================================================

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

export interface MedicationSchedule {
  id: string;
  medicationId: string;
  medication?: Medication;
  userId: string;
  
  // Schedule Configuration
  times: string[]; // Array of times in HH:mm format
  daysOfWeek: DayOfWeek[]; // Days when this schedule applies
  
  // Label for display (e.g., "Before Breakfast", "BB")
  label: MedicationLabel;
  customLabel?: string;
  
  // Compartment assignment (1-6 for Ol bottle)
  compartment: number;
  
  // Reminder Settings
  reminderSettings: ReminderSettings;
  
  // Voice Prompt
  voicePromptId?: string;
  
  // LED Display Settings
  ledSettings: LEDSettings;
  
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

export type MedicationLabel = 
  | 'monday' 
  | 'tuesday' 
  | 'wednesday' 
  | 'thursday' 
  | 'friday' 
  | 'saturday' 
  | 'sunday'
  | 'bb'  // Before Breakfast
  | 'ab'  // After Breakfast
  | 'bl'  // Before Lunch
  | 'al'  // After Lunch
  | 'bd'  // Before Dinner
  | 'ad'  // After Dinner
  | 'custom';

export const MEDICATION_LABELS: Record<MedicationLabel, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
  bb: 'Before Breakfast',
  ab: 'After Breakfast',
  bl: 'Before Lunch',
  al: 'After Lunch',
  bd: 'Before Dinner',
  ad: 'After Dinner',
  custom: 'Custom',
};

// =====================================================
// Reminder Types
// =====================================================

export interface ReminderSettings {
  enabled: boolean;
  modes: ReminderMode[];
  advanceMinutes: number; // Minutes before scheduled time to trigger
  repeatInterval?: number; // Minutes between repeats
  repeatCount?: number; // How many times to repeat
  autoDispense?: boolean; // Release the pill automatically at the scheduled time
}

export type ReminderMode = 
  | 'led' 
  | 'buzzer' 
  | 'vibration' 
  | 'voice';

export type ReminderSystemMode = 
  | 'visual_only'      // LED only
  | 'silent'           // LED + vibration
  | 'full'             // All reminders
  | 'voice_only';      // Voice prompt only

// =====================================================
// LED Display Types
// =====================================================

export interface LEDSettings {
  enabled: boolean;
  text: string; // Text to display on LED
  blinkIntensity: 'low' | 'medium' | 'high';
  blinkSpeed: 'slow' | 'medium' | 'fast';
  color?: string;
}

export const DEFAULT_LED_SETTINGS: LEDSettings = {
  enabled: true,
  text: 'TAKE MEDICINE',
  blinkIntensity: 'medium',
  blinkSpeed: 'medium',
};

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
// Bottle Connection Types
// =====================================================

export interface BottleDevice {
  id: string;
  name: string;
  macAddress: string;
  batteryLevel: number;
  firmwareVersion: string;
  isConnected: boolean;
  lastSeen: Date;
  rssi: number;
}

export interface BottleState {
  device: BottleDevice | null;
  isScanning: boolean;
  compartments: CompartmentState[];
  lastSync: Date | null;
}

export interface CompartmentState {
  number: number;
  isOpen: boolean;
  hasPills: boolean;
  pillCount?: number;
  lastOpened?: Date;
  lastPillRemoved?: Date;
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
  compartment: number;
  sensorData?: SensorEventData;
  confirmedBy?: 'sensor' | 'user' | 'caregiver';
  notes?: string;
  createdAt: Date;
}

export type IntakeStatus = 
  | 'pending'
  | 'taken'
  | 'missed'
  | 'skipped'
  | 'taken_late';

export interface SensorEventData {
  compartmentOpened: boolean;
  shelfSlideMotion: boolean;
  pillRemovalDetected: boolean;
  timestamp: Date;
}

export interface AdherenceReport {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  skippedDoses: number;
  adherencePercentage: number;
  dailyBreakdown: DailyAdherence[];
}

export interface DailyAdherence {
  date: Date;
  scheduled: number;
  taken: number;
  missed: number;
  skipped: number;
  percentage: number;
}

// =====================================================
// Notification Types
// =====================================================

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}

export type NotificationType = 
  | 'medication_taken'
  | 'medication_missed'
  | 'medication_upcoming'
  | 'battery_low'
  | 'bottle_disconnected'
  | 'compartment_not_opened'
  | 'schedule_updated'
  | 'system';

// =====================================================
// Dashboard Types
// =====================================================

export interface DashboardData {
  todaySchedule: UpcomingDose[];
  nextReminder: UpcomingDose | null;
  adherenceStatus: AdherenceStatus;
  bottleConnection: BottleConnectionStatus;
  notifications: Notification[];
  quickStats: QuickStats;
}

export interface UpcomingDose {
  id: string;
  scheduleId: string;
  medication: Medication;
  scheduleTime: Date;
  label: string;
  compartment: number;
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

export interface BottleConnectionStatus {
  isConnected: boolean;
  deviceName?: string;
  batteryLevel?: number;
  lastSync?: Date | null;
}

export interface QuickStats {
  totalMedications: number;
  activeSchedules: number;
  streakDays: number;
  nextDoseIn: number; // minutes
}

// =====================================================
// API Response Types
// =====================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =====================================================
// Form Types
// =====================================================

export interface ScheduleFormData {
  medicationId: string;
  times: string[];
  daysOfWeek: DayOfWeek[];
  label: MedicationLabel;
  customLabel?: string;
  compartment: number;
  reminderSettings: ReminderSettings;
  voicePromptId?: string;
  ledSettings: LEDSettings;
}

// =====================================================
// Theme & UI Types
// =====================================================

export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    success: string;
    warning: string;
    error: string;
  };
}
