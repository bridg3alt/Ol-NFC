'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Plus,
  Clock,
  Calendar,
  Pill,
  Edit2,
  Trash2,
  ChevronRight,
  Bell,
  Volume2,
  Lightbulb,
} from 'lucide-react';
import { format } from 'date-fns';
import { MedicationSchedule, MEDICATION_LABELS, DayOfWeek } from '@/types';

const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export default function SchedulePage() {
  const { schedules, medications, deleteSchedule } = useApp();
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | 'all'>('all');

  const filteredSchedules = selectedDay === 'all'
    ? schedules
    : schedules.filter(s => s.daysOfWeek.includes(selectedDay));

  const getMedication = (medicationId: string) => {
    return medications.find(m => m.id === medicationId);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-semibold text-gray-900">Schedule</h1>
            <p className="text-gray-500 mt-1">Manage medication schedules</p>
          </div>
          <Link href="/schedule/new" className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Add Schedule
          </Link>
        </header>

        {/* Day Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedDay('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedDay === 'all'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            All Days
          </button>
          {DAYS_OF_WEEK.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors capitalize ${
                selectedDay === day
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>

        {/* Schedule List */}
        <div className="space-y-4">
          {filteredSchedules.length === 0 ? (
            <div className="card p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No schedules yet</h3>
              <p className="text-gray-500 mb-6">Create your first medication schedule to get started</p>
              <Link href="/schedule/new" className="btn btn-primary">
                <Plus className="w-5 h-5 mr-2" />
                Create Schedule
              </Link>
            </div>
          ) : (
            filteredSchedules.map(schedule => {
              const medication = getMedication(schedule.medicationId);
              if (!medication) return null;

              return (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  medication={medication}
                  onDelete={() => deleteSchedule(schedule.id)}
                />
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function ScheduleCard({
  schedule,
  medication,
  onDelete,
}: {
  schedule: MedicationSchedule;
  medication: import('@/types').Medication;
  onDelete: () => void;
}) {
  const isActive = schedule.isActive;

  return (
    <div className={`card p-5 ${!isActive ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Medication Icon */}
        <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
          <Pill className="w-6 h-6 text-primary-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900">{medication.name}</h3>
              <p className="text-sm text-gray-500">
                {medication.dosage} {medication.unit}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {schedule.reminderSettings.enabled && (
                <span className="badge badge-primary">
                  <Bell className="w-3 h-3 mr-1" />
                  Reminders on
                </span>
              )}
              {schedule.voicePromptId && (
                <span className="badge badge-secondary">
                  <Volume2 className="w-3 h-3 mr-1" />
                  Voice
                </span>
              )}
              {schedule.ledSettings.enabled && (
                <span className="badge badge-success">
                  <Lightbulb className="w-3 h-3 mr-1" />
                  LED
                </span>
              )}
            </div>
          </div>

          {/* Times */}
          <div className="flex items-center gap-2 mt-3">
            <Clock className="w-4 h-4 text-gray-400" />
            <div className="flex flex-wrap gap-2">
              {schedule.times.map(time => (
                <span
                  key={time}
                  className="px-2 py-1 bg-gray-100 rounded text-sm font-medium text-gray-700"
                >
                  {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                </span>
              ))}
            </div>
          </div>

          {/* Days & Compartment */}
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span className="capitalize">
                {schedule.daysOfWeek.length === 7
                  ? 'Every day'
                  : schedule.daysOfWeek.length === 5 &&
                    !schedule.daysOfWeek.includes('saturday') &&
                    !schedule.daysOfWeek.includes('sunday')
                  ? 'Weekdays'
                  : schedule.daysOfWeek.length === 2 &&
                    schedule.daysOfWeek.includes('saturday') &&
                    schedule.daysOfWeek.includes('sunday')
                  ? 'Weekends'
                  : schedule.daysOfWeek.map(d => d.slice(0, 3)).join(', ')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-2 py-0.5 bg-secondary-100 rounded text-secondary-700 font-medium">
                Compartment {schedule.compartment}
              </span>
            </div>
          </div>

          {/* Label */}
          {schedule.label !== 'custom' && (
            <div className="mt-2">
              <span className="led-display text-xs">
                {MEDICATION_LABELS[schedule.label]}
              </span>
            </div>
          )}
          {schedule.label === 'custom' && schedule.customLabel && (
            <div className="mt-2">
              <span className="led-display text-xs">{schedule.customLabel}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Link
            href={`/schedule/new?id=${schedule.id}`}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
          >
            <Edit2 className="w-4 h-4" />
          </Link>
          <button
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-error-600"
            onClick={() => {
              if (confirm('Are you sure you want to delete this schedule?')) {
                onDelete();
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
