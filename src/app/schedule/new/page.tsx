'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useApp } from '@/context/AppContext';
import { DayOfWeek } from '@/types';
import {
  MEDICATION_SLOTS,
  MedicationSlot,
  NFC_TAGS,
  DEFAULT_SLOT_TIMES,
  TAG_COLORS,
} from '@/lib/nfcTags';

const DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

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
  const { medications, schedules, addSchedule, updateSchedule } = useApp();

  const scheduleId = searchParams.get('id');
  const existing = scheduleId ? schedules.find((s) => s.id === scheduleId) : null;

  const [medicationId, setMedicationId] = useState(existing?.medicationId ?? '');
  const [slot, setSlot] = useState<MedicationSlot>(existing?.slot ?? 'MED_MORNING');
  const [time, setTime] = useState(existing?.times[0] ?? DEFAULT_SLOT_TIMES.MED_MORNING);
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>(
    existing?.daysOfWeek ?? [...DAYS]
  );
  const [color, setColor] = useState(existing?.tagColor ?? 'blue');
  const [instruction, setInstruction] = useState(existing?.caregiverInstruction ?? '');
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseSlot = (next: MedicationSlot) => {
    // Move the time along with the slot unless the caregiver already changed it.
    if (time === DEFAULT_SLOT_TIMES[slot]) setTime(DEFAULT_SLOT_TIMES[next]);
    setSlot(next);
  };

  const toggleDay = (day: DayOfWeek) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!medicationId) return setError('Choose a medicine.');
    if (!time) return setError('Choose a time.');
    if (daysOfWeek.length === 0) return setError('Choose at least one day.');

    const payload = {
      medicationId,
      slot,
      times: [time],
      daysOfWeek,
      tagColor: color,
      caregiverInstruction: instruction.trim() || undefined,
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
      <div className="space-y-6">
        <header className="flex items-center gap-3">
          <Link href="/schedule" className="btn btn-ghost btn-sm">
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            Back
          </Link>
          <h1 className="text-3xl font-bold">
            {existing ? 'Edit routine step' : 'New routine step'}
          </h1>
        </header>

        {medications.length === 0 ? (
          <div className="card p-6 space-y-4">
            <h2 className="text-xl font-bold">Add a medicine first</h2>
            <p className="text-gray-700">A routine step needs a medicine to point at.</p>
            <Link href="/medications/new" className="btn btn-primary">
              <Plus className="w-5 h-5" aria-hidden="true" />
              Add medicine
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {error && (
              <div role="alert" className="card p-4 border-error-300 bg-error-50 text-error-800">
                {error}
              </div>
            )}

            <section className="card p-5">
              <label htmlFor="medication" className="label">
                Medicine
              </label>
              <select
                id="medication"
                value={medicationId}
                onChange={(e) => setMedicationId(e.target.value)}
                className="input"
              >
                <option value="">Choose a medicine…</option>
                {medications.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.dosage} {m.unit}
                  </option>
                ))}
              </select>
            </section>

            <fieldset className="card p-5">
              <legend className="label px-1">Compartment</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {MEDICATION_SLOTS.map((s) => (
                  <label
                    key={s}
                    className={`flex items-center gap-3 min-h-[48px] px-4 rounded-xl border-2 cursor-pointer ${
                      slot === s ? 'border-primary-700 bg-primary-50' : 'border-stone-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="slot"
                      value={s}
                      checked={slot === s}
                      onChange={() => chooseSlot(s)}
                      className="w-5 h-5 accent-primary-700"
                    />
                    <span className="font-bold">{NFC_TAGS[s].label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <section className="card p-5">
              <label htmlFor="time" className="label">
                Time
              </label>
              <input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="input"
              />
            </section>

            <fieldset className="card p-5">
              <legend className="label px-1">Days</legend>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={daysOfWeek.includes(day)}
                    onClick={() => toggleDay(day)}
                    className={`btn btn-sm capitalize ${
                      daysOfWeek.includes(day) ? 'btn-primary' : 'btn-outline'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="card p-5">
              <legend className="label px-1">Sticker colour on this compartment</legend>
              <p className="text-gray-700 mb-3">
                The user hears this colour, so they know which sticker to tap.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TAG_COLORS.map((c) => (
                  <label
                    key={c.id}
                    className={`flex items-center gap-3 min-h-[48px] px-3 rounded-xl border-2 cursor-pointer ${
                      color === c.id ? 'border-primary-700 bg-primary-50' : 'border-stone-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="color"
                      value={c.id}
                      checked={color === c.id}
                      onChange={() => setColor(c.id)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className="w-6 h-6 rounded-full border-2 border-stone-400"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="font-bold">{c.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <section className="card p-5">
              <label htmlFor="instruction" className="label">
                Your instruction (read out loud)
              </label>
              <p id="instruction-hint" className="text-gray-700 mb-3">
                Write it the way you would say it. For example: &ldquo;Take one tablet
                with a full glass of water.&rdquo;
              </p>
              <textarea
                id="instruction"
                aria-describedby="instruction-hint"
                rows={3}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                className="input"
              />
            </section>

            <section className="card p-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-bold" id="active-label">
                  Active
                </p>
                <p className="text-gray-700">Turn off to pause without deleting.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                aria-labelledby="active-label"
                onClick={() => setIsActive((v) => !v)}
                className={`btn ${isActive ? 'btn-primary' : 'btn-outline'} min-w-[80px]`}
              >
                {isActive ? 'On' : 'Off'}
              </button>
            </section>

            <div className="flex flex-col sm:flex-row gap-3">
              <button type="submit" disabled={saving} className="btn btn-primary btn-lg">
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                    Saving…
                  </>
                ) : existing ? (
                  'Save changes'
                ) : (
                  'Add to routine'
                )}
              </button>
              <Link href="/schedule" className="btn btn-outline btn-lg">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
