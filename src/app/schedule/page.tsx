'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, CalendarClock } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useApp } from '@/context/AppContext';
import { MEDICATION_SLOTS, NFC_TAGS } from '@/lib/nfcTags';
import { TagColorDot } from '@/components/ui/TagColorDot';
import { DayOfWeek, MedicationSchedule } from '@/types';

function describeDays(days: DayOfWeek[]) {
  if (days.length === 7) return 'Every day';
  const weekend = days.includes('saturday') && days.includes('sunday');
  if (days.length === 5 && !weekend) return 'Weekdays';
  if (days.length === 2 && weekend) return 'Weekends';
  return days.map((d) => d.slice(0, 3)).join(', ');
}

export default function SchedulePage() {
  const { schedules, medications, deleteSchedule } = useApp();

  // Grouped by compartment, in the order of the day.
  const bySlot = MEDICATION_SLOTS.map((slot) => ({
    slot,
    items: schedules
      .filter((s) => s.slot === slot)
      .sort((a, b) => (a.times[0] ?? '').localeCompare(b.times[0] ?? '')),
  }));

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Routine</h1>
            <p className="text-lg text-gray-700 mt-1">
              Which medicine is in which compartment, and when.
            </p>
          </div>
          <Link href="/schedule/new" className="btn btn-primary">
            <Plus className="w-5 h-5" aria-hidden="true" />
            Add step
          </Link>
        </header>

        {schedules.length === 0 ? (
          <div className="card p-6 space-y-3">
            <CalendarClock className="w-10 h-10 text-primary-700" aria-hidden="true" />
            <h2 className="text-xl font-bold">No routine yet</h2>
            <p className="text-gray-700">
              Add a step for each compartment: the medicine, the time, and the colour
              of its sticker.
            </p>
          </div>
        ) : (
          bySlot.map(({ slot, items }) =>
            items.length === 0 ? null : (
              <section key={slot} aria-labelledby={`${slot}-title`} className="space-y-3">
                <h2 id={`${slot}-title`} className="text-2xl font-bold">
                  {NFC_TAGS[slot].label}
                </h2>
                <ul className="space-y-3">
                  {items.map((schedule) => (
                    <ScheduleCard
                      key={schedule.id}
                      schedule={schedule}
                      medicationName={
                        medications.find((m) => m.id === schedule.medicationId)?.name ??
                        'Unknown medicine'
                      }
                      onDelete={() => deleteSchedule(schedule.id)}
                    />
                  ))}
                </ul>
              </section>
            )
          )
        )}
      </div>
    </DashboardLayout>
  );
}

function ScheduleCard({
  schedule,
  medicationName,
  onDelete,
}: {
  schedule: MedicationSchedule;
  medicationName: string;
  onDelete: () => void;
}) {
  return (
    <li className="card p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">{medicationName}</h3>
          <p className="text-gray-700">
            {schedule.times
              .map((t) => format(new Date(`2000-01-01T${t}`), 'h:mm a'))
              .join(', ')}{' '}
            · {describeDays(schedule.daysOfWeek)}
          </p>
          <p className="text-gray-700">
            <TagColorDot color={schedule.tagColor} />
          </p>
        </div>
        {!schedule.isActive && <span className="badge badge-gray">Paused</span>}
      </div>

      {schedule.caregiverInstruction && (
        <p className="border-l-4 border-primary-300 pl-3 italic">
          &ldquo;{schedule.caregiverInstruction}&rdquo;
        </p>
      )}

      <div className="flex gap-2">
        <Link href={`/schedule/new?id=${schedule.id}`} className="btn btn-outline btn-sm">
          <Pencil className="w-4 h-4" aria-hidden="true" />
          Edit<span className="sr-only"> {medicationName}</span>
        </Link>
        <button
          type="button"
          className="btn btn-ghost btn-sm text-error-700"
          onClick={() => {
            if (confirm(`Remove ${medicationName} from the routine?`)) onDelete();
          }}
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
          Remove<span className="sr-only"> {medicationName}</span>
        </button>
      </div>
    </li>
  );
}
