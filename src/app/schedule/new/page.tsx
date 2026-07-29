'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, Save, Plus, X, Loader2, AlertTriangle } from 'lucide-react';
import {
  DayOfWeek,
  MedicationLabel,
  MEDICATION_LABELS,
  ReminderMode,
} from '@/types';

const DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const LABELS: MedicationLabel[] = ['bb', 'ab', 'bl', 'al', 'bd', 'ad', 'custom'];
const MODES: ReminderMode[] = ['led', 'buzzer', 'vibration', 'voice'];

export default function ScheduleFormPage() {
  return (
    <Suspense fallback={null}>
      <ScheduleForm />
    </Suspense>
  );
}

function ScheduleForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { medications, schedules, voicePrompts, addSchedule, updateSchedule } = useApp();

  const scheduleId = searchParams.get('id');
  const existing = scheduleId ? schedules.find((s) => s.id === scheduleId) : null;

  const [medicationId, setMedicationId] = useState(existing?.medicationId ?? '');
  const [times, setTimes] = useState<string[]>(existing?.times ?? ['08:00']);
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>(
    existing?.daysOfWeek ?? [...DAYS]
  );
  const [label, setLabel] = useState<MedicationLabel>(existing?.label ?? 'bb');
  const [customLabel, setCustomLabel] = useState(existing?.customLabel ?? '');
  const [compartment, setCompartment] = useState(existing?.compartment ?? 1);
  const [modes, setModes] = useState<ReminderMode[]>(
    existing?.reminderSettings.modes ?? ['led', 'buzzer']
  );
  const [autoDispense, setAutoDispense] = useState(
    existing?.reminderSettings.autoDispense ?? false
  );
  const [voicePromptId, setVoicePromptId] = useState(existing?.voicePromptId ?? '');
  const [ledText, setLedText] = useState(existing?.ledSettings.text ?? '');
  const [blinkIntensity, setBlinkIntensity] = useState<'low' | 'medium' | 'high'>(
    existing?.ledSettings.blinkIntensity ?? 'medium'
  );
  const [blinkSpeed, setBlinkSpeed] = useState<'slow' | 'medium' | 'fast'>(
    existing?.ledSettings.blinkSpeed ?? 'medium'
  );
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (day: DayOfWeek) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleMode = (mode: ReminderMode) => {
    setModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!medicationId) return setError('Choose a medication');
    if (times.length === 0) return setError('Add at least one time');
    if (daysOfWeek.length === 0) return setError('Choose at least one day');
    if (label === 'custom' && !customLabel.trim()) {
      return setError('Enter a custom label');
    }

    const medication = medications.find((m) => m.id === medicationId);

    const payload = {
      medicationId,
      times: [...times].sort(),
      daysOfWeek,
      label,
      customLabel: label === 'custom' ? customLabel.trim() : undefined,
      compartment,
      reminderSettings: {
        enabled: true,
        modes,
        advanceMinutes: 0,
        autoDispense,
      },
      voicePromptId: voicePromptId || undefined,
      ledSettings: {
        enabled: modes.includes('led'),
        text: ledText.trim() || (medication?.name ?? '').toUpperCase(),
        blinkIntensity,
        blinkSpeed,
      },
      isActive,
    };

    setSaving(true);
    try {
      if (existing) {
        await updateSchedule(existing.id, payload);
      } else {
        await addSchedule(payload);
      }
      router.push('/schedule');
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <header className="flex items-center gap-3">
          <Link href="/schedule" className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-semibold text-gray-900">
              {existing ? 'Edit schedule' : 'New schedule'}
            </h1>
            <p className="text-gray-500 mt-1">
              When to take it, and how the bottle should remind you
            </p>
          </div>
        </header>

        {medications.length === 0 ? (
          <div className="card p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Add a medication first
            </h3>
            <p className="text-gray-500 mb-6">
              A schedule needs a medication to point at.
            </p>
            <Link href="/medications/new" className="btn btn-primary">
              <Plus className="w-5 h-5 mr-2" />
              Add medication
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="card p-4 bg-error-50 border-error-200 text-sm text-error-700">
                {error}
              </div>
            )}

            {/* Medication */}
            <section className="card p-5">
              <label htmlFor="medication" className="block text-sm font-medium text-gray-700 mb-2">
                Medication
              </label>
              <select
                id="medication"
                value={medicationId}
                onChange={(e) => setMedicationId(e.target.value)}
                className="input"
              >
                <option value="">Select a medication…</option>
                {medications.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.dosage} {m.unit}
                  </option>
                ))}
              </select>
            </section>

            {/* Times */}
            <section className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">Times</label>
                <button
                  type="button"
                  onClick={() => setTimes((t) => [...t, '12:00'])}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add time
                </button>
              </div>
              <div className="space-y-2">
                {times.map((time, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) =>
                        setTimes((t) =>
                          t.map((v, i) => (i === index ? e.target.value : v))
                        )
                      }
                      className="input flex-1"
                    />
                    {times.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setTimes((t) => t.filter((_, i) => i !== index))}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-error-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Days */}
            <section className="card p-5">
              <label className="block text-sm font-medium text-gray-700 mb-3">Days</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${
                      daysOfWeek.includes(day)
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </section>

            {/* Label & compartment */}
            <section className="card p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Label</label>
                <div className="flex flex-wrap gap-2">
                  {LABELS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLabel(l)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        label === l
                          ? 'bg-primary-100 text-primary-700 border border-primary-300'
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {MEDICATION_LABELS[l]}
                    </button>
                  ))}
                </div>
                {label === 'custom' && (
                  <input
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="e.g. Heart Health"
                    className="input mt-3"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Compartment
                </label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCompartment(n)}
                      className={`w-12 h-12 rounded-lg text-sm font-medium transition-colors ${
                        compartment === n
                          ? 'bg-secondary-100 text-secondary-700 border border-secondary-300'
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Reminders */}
            <section className="card p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Reminder modes
                </label>
                <div className="flex flex-wrap gap-2">
                  {MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => toggleMode(mode)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                        modes.includes(mode)
                          ? 'bg-primary-100 text-primary-700 border border-primary-300'
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {modes.includes('voice') && voicePrompts.length > 0 && (
                <div>
                  <label htmlFor="voice" className="block text-sm font-medium text-gray-700 mb-2">
                    Voice prompt
                  </label>
                  <select
                    id="voice"
                    value={voicePromptId}
                    onChange={(e) => setVoicePromptId(e.target.value)}
                    className="input"
                  >
                    <option value="">None</option>
                    {voicePrompts.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {modes.includes('led') && (
                <>
                  <div>
                    <label htmlFor="ledText" className="block text-sm font-medium text-gray-700 mb-2">
                      LED text
                    </label>
                    <input
                      id="ledText"
                      type="text"
                      value={ledText}
                      onChange={(e) => setLedText(e.target.value.toUpperCase())}
                      placeholder="Defaults to the medication name"
                      maxLength={16}
                      className="input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Blink intensity
                      </label>
                      <select
                        value={blinkIntensity}
                        onChange={(e) =>
                          setBlinkIntensity(e.target.value as 'low' | 'medium' | 'high')
                        }
                        className="input"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Blink speed
                      </label>
                      <select
                        value={blinkSpeed}
                        onChange={(e) =>
                          setBlinkSpeed(e.target.value as 'slow' | 'medium' | 'fast')
                        }
                        className="input"
                      >
                        <option value="slow">Slow</option>
                        <option value="medium">Medium</option>
                        <option value="fast">Fast</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </section>

            {/* Auto dispense */}
            <section className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Automatic dispensing</p>
                  <p className="text-xs text-gray-500 mt-1">
                    The bottle releases the pill at the scheduled time without anyone
                    pressing a button.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoDispense((v) => !v)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                    autoDispense ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoDispense ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {autoDispense && (
                <div className="mt-4 p-4 rounded-lg bg-warning-50 border border-warning-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-warning-800">
                    Confirm the correct pills are in compartment {compartment} before
                    enabling this. The bottle will release a dose on schedule whether or
                    not anyone is watching.
                  </p>
                </div>
              )}
            </section>

            {/* Active */}
            <section className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Schedule active</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Turn off to pause without deleting
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isActive ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </section>

            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    {existing ? 'Save changes' : 'Create schedule'}
                  </>
                )}
              </button>
              <Link href="/schedule" className="btn btn-outline">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
