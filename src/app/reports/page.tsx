'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { BarChart3, CheckCircle2, XCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { IntakeStatus } from '@/types';

const RANGES = [
  { key: 7, label: 'Last 7 days' },
  { key: 14, label: 'Last 14 days' },
] as const;

export default function ReportsPage() {
  const { intakes, medications, isLoading } = useApp();
  const [days, setDays] = useState<number>(7);

  const report = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const inRange = intakes.filter((i) => i.scheduledTime >= start);

    const counts = { taken: 0, missed: 0, skipped: 0, pending: 0 };
    for (const intake of inRange) {
      if (intake.status === 'taken' || intake.status === 'taken_late') counts.taken++;
      else if (intake.status === 'missed') counts.missed++;
      else if (intake.status === 'skipped') counts.skipped++;
      else counts.pending++;
    }

    const total = counts.taken + counts.missed + counts.skipped;
    const percentage = total === 0 ? 0 : Math.round((counts.taken / total) * 100);

    const byDay = Array.from({ length: days }, (_, offset) => {
      const day = new Date();
      day.setDate(day.getDate() - (days - 1 - offset));
      day.setHours(0, 0, 0, 0);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);

      const dayIntakes = inRange.filter(
        (i) => i.scheduledTime >= day && i.scheduledTime < next
      );
      const taken = dayIntakes.filter(
        (i) => i.status === 'taken' || i.status === 'taken_late'
      ).length;

      return {
        date: day,
        total: dayIntakes.length,
        taken,
        percentage:
          dayIntakes.length === 0
            ? 0
            : Math.round((taken / dayIntakes.length) * 100),
      };
    });

    const byMedication = medications
      .map((med) => {
        const medIntakes = inRange.filter((i) => i.medicationId === med.id);
        const taken = medIntakes.filter(
          (i) => i.status === 'taken' || i.status === 'taken_late'
        ).length;
        return {
          medication: med,
          total: medIntakes.length,
          taken,
          percentage:
            medIntakes.length === 0
              ? 0
              : Math.round((taken / medIntakes.length) * 100),
        };
      })
      .filter((m) => m.total > 0);

    return { counts, total, percentage, byDay, byMedication, recent: inRange.slice(0, 20) };
  }, [intakes, medications, days]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-semibold text-gray-900">Reports</h1>
            <p className="text-gray-500 mt-1">Medication adherence over time</p>
          </div>
          <div className="flex gap-2">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setDays(r.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  days === r.key
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </header>

        {isLoading ? (
          <div className="card p-12 text-center text-gray-500">Loading…</div>
        ) : report.total === 0 ? (
          <div className="card p-12 text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No data yet</h3>
            <p className="text-gray-500">
              Adherence appears here once doses start being recorded.
            </p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard
                icon={<TrendingUp className="w-5 h-5" />}
                label="Adherence"
                value={`${report.percentage}%`}
                tone="primary"
              />
              <SummaryCard
                icon={<CheckCircle2 className="w-5 h-5" />}
                label="Taken"
                value={report.counts.taken.toString()}
                tone="success"
              />
              <SummaryCard
                icon={<XCircle className="w-5 h-5" />}
                label="Missed"
                value={report.counts.missed.toString()}
                tone="error"
              />
              <SummaryCard
                icon={<AlertCircle className="w-5 h-5" />}
                label="Skipped"
                value={report.counts.skipped.toString()}
                tone="warning"
              />
            </div>

            {/* Daily breakdown */}
            <section className="card p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily adherence</h2>
              <div className="space-y-3">
                {report.byDay.map((day) => (
                  <div key={day.date.toISOString()}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">
                        {format(day.date, 'EEE, MMM d')}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {day.total === 0 ? '—' : `${day.taken}/${day.total}`}
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          day.percentage >= 80
                            ? 'bg-success-500'
                            : day.percentage >= 50
                            ? 'bg-warning-500'
                            : 'bg-error-500'
                        }`}
                        style={{ width: `${day.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Per medication */}
            {report.byMedication.length > 0 && (
              <section className="card p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  By medication
                </h2>
                <div className="space-y-4">
                  {report.byMedication.map((row) => (
                    <div key={row.medication.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {row.medication.name}
                        </span>
                        <span className="text-sm text-gray-500">
                          {row.taken}/{row.total} ({row.percentage}%)
                        </span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all duration-500"
                          style={{ width: `${row.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent log */}
            <section className="card p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent doses</h2>
              <div className="space-y-2">
                {report.recent.map((intake) => {
                  const med = medications.find((m) => m.id === intake.medicationId);
                  return (
                    <div
                      key={intake.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
                    >
                      <StatusIcon status={intake.status} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {med?.name ?? 'Unknown medication'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Scheduled {format(intake.scheduledTime, 'MMM d, h:mm a')}
                          {intake.confirmedBy && ` · confirmed by ${intake.confirmedBy}`}
                        </p>
                      </div>
                      <span className="text-sm text-gray-500 capitalize">
                        {intake.status.replace('_', ' ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'primary' | 'success' | 'warning' | 'error';
}) {
  const tones = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    error: 'bg-error-50 text-error-600',
  };

  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${tones[tone]}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-lg font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: IntakeStatus }) {
  if (status === 'taken' || status === 'taken_late') {
    return <CheckCircle2 className="w-5 h-5 text-success-500 flex-shrink-0" />;
  }
  if (status === 'missed') {
    return <XCircle className="w-5 h-5 text-error-500 flex-shrink-0" />;
  }
  return <AlertCircle className="w-5 h-5 text-warning-500 flex-shrink-0" />;
}
