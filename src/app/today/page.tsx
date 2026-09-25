'use client';

import { format } from 'date-fns';
import { Nfc } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { NFC_TAGS } from '@/lib/nfcTags';
import { DoseStatusBadge, displayStatusOf } from '@/components/ui/DoseStatus';
import { TagColorDot } from '@/components/ui/TagColorDot';

function greetingFor(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function TodayPage() {
  const { user } = useAuth();
  const { dashboardData, isLoading } = useApp();
  const now = new Date();
  const doses = dashboardData.todaySchedule;
  const firstName = user?.displayName.split(' ')[0];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold">
            {greetingFor(now.getHours())}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-lg text-gray-700 mt-1">{format(now, 'EEEE d MMMM')}</p>
        </header>

        <section
          aria-label="How to start"
          className="rounded-2xl bg-primary-700 text-white p-6 flex items-center gap-4"
        >
          <Nfc className="w-12 h-12 shrink-0" aria-hidden="true" />
          <p className="text-xl font-bold">Tap an Olvia tag to get started.</p>
        </section>

        <section aria-labelledby="routine-title" className="space-y-4">
          <h2 id="routine-title" className="text-2xl font-bold">
            Today&rsquo;s routine
          </h2>

          {isLoading ? (
            <p role="status" className="text-gray-700">
              Loading your routine…
            </p>
          ) : doses.length === 0 ? (
            <div className="card p-6">
              <p className="text-lg font-bold">Nothing planned for today.</p>
              <p className="text-gray-700 mt-1">
                Your caregiver sets up your routine. Once they do, it appears here.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {doses.map((dose) => (
                <li key={dose.id} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold">{NFC_TAGS[dose.slot].label}</h3>
                      <p className="text-lg">{dose.medication.name}</p>
                      <p className="text-gray-700">
                        {format(dose.scheduleTime, 'h:mm a')} ·{' '}
                        <TagColorDot color={dose.tagColor} />
                      </p>
                    </div>
                    <DoseStatusBadge status={displayStatusOf(dose, now)} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
