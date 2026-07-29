'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import {
  Pill,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Battery,
  Bluetooth,
  Bell,
  Settings,
  Plus,
  ChevronRight,
  Mic,
  Lightbulb,
  Volume2,
  Calendar,
  TrendingUp,
  User,
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const { dashboardData, markDoseTaken, markDoseSkipped } = useApp();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const {
    todaySchedule,
    nextReminder,
    adherenceStatus,
    bottleConnection,
    notifications,
    quickStats,
  } = dashboardData;

  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 stagger-children">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-semibold text-gray-900">
              Welcome back{user?.displayName ? `, ${user.displayName}` : ''}
            </h1>
            <p className="text-gray-500 mt-1">
              {format(currentTime, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
        </header>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickStatCard
            icon={<Pill className="w-5 h-5" />}
            label="Medications"
            value={quickStats.totalMedications.toString()}
            color="primary"
          />
          <QuickStatCard
            icon={<Calendar className="w-5 h-5" />}
            label="Active Schedules"
            value={quickStats.activeSchedules.toString()}
            color="secondary"
          />
          <QuickStatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Streak"
            value={`${quickStats.streakDays} days`}
            color="success"
          />
          <QuickStatCard
            icon={<Clock className="w-5 h-5" />}
            label="Next Dose"
            value={nextReminder ? `${quickStats.nextDoseIn} min` : '—'}
            color="warning"
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Today's Schedule */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Today's Schedule</h2>
              <Link href="/schedule" className="text-primary-600 text-sm font-medium hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {todaySchedule.length === 0 ? (
                <EmptyState message="No medications scheduled for today" />
              ) : (
                todaySchedule.slice(0, 4).map((dose) => (
                  <DoseCard
                    key={dose.id}
                    dose={dose}
                    onTaken={() => markDoseTaken(dose)}
                    onSkipped={() => markDoseSkipped(dose)}
                  />
                ))
              )}
            </div>
          </section>

          {/* Next Reminder */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Next Reminder</h2>
              {nextReminder && (
                <span className="badge badge-primary">
                  in {formatDistanceToNextReminder(nextReminder.scheduleTime)}
                </span>
              )}
            </div>
            {nextReminder ? (
              <NextReminderCard dose={nextReminder} />
            ) : (
              <EmptyState message="No upcoming reminders" />
            )}
          </section>

          {/* Adherence Status */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Adherence</h2>
              <Link href="/reports" className="text-primary-600 text-sm font-medium hover:underline flex items-center gap-1">
                Details <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <AdherenceCard today={adherenceStatus.today} week={adherenceStatus.week} />
          </section>

          {/* Bottle Connection */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Ol Bottle</h2>
              <Link href="/bottle" className="text-primary-600 text-sm font-medium hover:underline flex items-center gap-1">
                Settings <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <BottleStatusCard 
              isConnected={bottleConnection.isConnected}
              deviceName={bottleConnection.deviceName}
              batteryLevel={bottleConnection.batteryLevel}
              lastSync={bottleConnection.lastSync}
            />
          </section>
        </div>

        {/* Quick Actions */}
        <section className="card p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickActionButton
              icon={<Plus className="w-5 h-5" />}
              label="Add Medication"
              href="/medications/new"
            />
            <QuickActionButton
              icon={<Clock className="w-5 h-5" />}
              label="Schedule"
              href="/schedule/new"
            />
            <QuickActionButton
              icon={<Mic className="w-5 h-5" />}
              label="Voice Prompt"
              href="/voice/new"
            />
            <QuickActionButton
              icon={<Lightbulb className="w-5 h-5" />}
              label="LED Settings"
              href="/led"
            />
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

// Sub-components

function QuickStatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'primary' | 'secondary' | 'success' | 'warning';
}) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    secondary: 'bg-secondary-50 text-secondary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
  };

  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-lg font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function DoseCard({
  dose,
  onTaken,
  onSkipped,
}: {
  dose: import('@/types').UpcomingDose;
  onTaken: () => Promise<void>;
  onSkipped: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  const statusIcons = {
    pending: <Clock className="w-4 h-4 text-gray-400" />,
    taken: <CheckCircle2 className="w-4 h-4 text-success-500" />,
    missed: <XCircle className="w-4 h-4 text-error-500" />,
    skipped: <AlertCircle className="w-4 h-4 text-warning-500" />,
    taken_late: <Clock className="w-4 h-4 text-warning-500" />,
  };

  const needsAction = dose.status === 'pending' || dose.status === 'missed';

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        dose.status === 'taken' ? 'bg-success-100' : 'bg-primary-100'
      }`}>
        <Pill className={`w-5 h-5 ${dose.status === 'taken' ? 'text-success-600' : 'text-primary-600'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{dose.medication.name}</p>
        <p className="text-sm text-gray-500">
          {dose.medication.dosage} {dose.medication.unit} • Compartment {dose.compartment}
        </p>
      </div>

      {needsAction ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {format(dose.scheduleTime, 'h:mm a')}
          </span>
          <button
            onClick={() => run(onSkipped)}
            disabled={busy}
            className="p-2 rounded-lg hover:bg-warning-100 text-gray-400 hover:text-warning-600"
            aria-label="Skip dose"
          >
            <AlertCircle className="w-5 h-5" />
          </button>
          <button
            onClick={() => run(onTaken)}
            disabled={busy}
            className="p-2 rounded-lg hover:bg-success-100 text-gray-400 hover:text-success-600"
            aria-label="Mark as taken"
          >
            <CheckCircle2 className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="text-right">
          <p className="font-medium text-gray-900">{format(dose.scheduleTime, 'h:mm a')}</p>
          {statusIcons[dose.status]}
        </div>
      )}
    </div>
  );
}

function NextReminderCard({ dose }: { dose: import('@/types').UpcomingDose }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 p-6 text-white">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <Pill className="w-5 h-5" />
          <span className="text-white/80">Next medication</span>
        </div>
        <h3 className="text-2xl font-semibold mb-1">{dose.medication.name}</h3>
        <p className="text-white/90 mb-4">
          {dose.medication.dosage} {dose.medication.unit}
        </p>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="text-lg font-medium">{format(dose.scheduleTime, 'h:mm a')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-white/20 rounded text-sm">
              Compartment {dose.compartment}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdherenceCard({
  today,
  week,
}: {
  today: { taken: number; total: number; percentage: number };
  week: { taken: number; total: number; percentage: number };
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Today</span>
          <span className="text-sm font-medium text-gray-900">
            {today.taken}/{today.total} doses
          </span>
        </div>
        <ProgressBar percentage={today.percentage} color="primary" />
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">This Week</span>
          <span className="text-sm font-medium text-gray-900">
            {week.taken}/{week.total} doses ({week.percentage}%)
          </span>
        </div>
        <ProgressBar percentage={week.percentage} color="success" />
      </div>
    </div>
  );
}

function ProgressBar({
  percentage,
  color,
}: {
  percentage: number;
  color: 'primary' | 'success' | 'warning' | 'error';
}) {
  const colors = {
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
  };

  return (
    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${colors[color]} rounded-full transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

function BottleStatusCard({
  isConnected,
  deviceName,
  batteryLevel,
  lastSync,
}: {
  isConnected: boolean;
  deviceName?: string;
  batteryLevel?: number;
  lastSync?: Date | null;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
        isConnected ? 'bg-success-100' : 'bg-gray-100'
      }`}>
        <Bluetooth className={`w-7 h-7 ${isConnected ? 'text-success-600' : 'text-gray-400'}`} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`status-dot ${isConnected ? 'status-dot-online' : 'status-dot-offline'}`} />
          <span className="font-medium text-gray-900">
            {isConnected ? (deviceName || 'Ol Bottle') : 'Not Connected'}
          </span>
        </div>
        {isConnected && batteryLevel !== undefined && (
          <div className="flex items-center gap-2 mt-1">
            <Battery className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">{batteryLevel}%</span>
            {lastSync && (
              <span className="text-sm text-gray-400">
                • Synced {formatDistanceToNow(lastSync)} ago
              </span>
            )}
          </div>
        )}
      </div>
      {!isConnected && (
        <Link href="/bottle/connect" className="btn btn-primary btn-sm">
          Connect
        </Link>
      )}
    </div>
  );
}

function QuickActionButton({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all"
    >
      <div className="p-2 rounded-full bg-primary-100 text-primary-600">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-gray-500">
      <AlertCircle className="w-8 h-8 mb-2" />
      <p>{message}</p>
    </div>
  );
}

function LoginPrompt() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="card max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Pill className="w-8 h-8 text-primary-600" />
        </div>
        <h1 className="text-2xl font-display font-semibold text-gray-900 mb-2">
          Welcome to Olvia
        </h1>
        <p className="text-gray-600 mb-6">
          Your smart medication assistant. Connect with your Ol bottle to manage medications, track adherence, and receive personalized reminders.
        </p>
        <div className="space-y-3">
          <Link href="/login" className="btn btn-primary w-full">
            Sign In
          </Link>
          <Link href="/register" className="btn btn-outline w-full">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}

function formatDistanceToNextReminder(date: Date): string {
  const minutes = differenceInMinutes(date, new Date());
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours} hr`;
}
