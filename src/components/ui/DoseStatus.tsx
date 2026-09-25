import { CircleCheck, Clock, BellRing, CircleAlert, CircleMinus, LucideIcon } from 'lucide-react';
import { UpcomingDose } from '@/types';

export type DoseDisplayStatus = 'taken' | 'due' | 'upcoming' | 'missed' | 'skipped';

/**
 * The stored status says "pending" for both a dose due now and one due this
 * evening. For display we split those apart using the clock.
 */
export function displayStatusOf(dose: UpcomingDose, now: Date): DoseDisplayStatus {
  switch (dose.status) {
    case 'taken':
    case 'taken_late':
      return 'taken';
    case 'missed':
      return 'missed';
    case 'skipped':
      return 'skipped';
    default:
      return dose.scheduleTime.getTime() <= now.getTime() ? 'due' : 'upcoming';
  }
}

const STYLES: Record<DoseDisplayStatus, { label: string; icon: LucideIcon; className: string }> = {
  taken: { label: 'Taken', icon: CircleCheck, className: 'badge-success' },
  due: { label: 'Due now', icon: BellRing, className: 'badge-warning' },
  upcoming: { label: 'Upcoming', icon: Clock, className: 'badge-gray' },
  missed: { label: 'Missed', icon: CircleAlert, className: 'badge-error' },
  skipped: { label: 'Skipped', icon: CircleMinus, className: 'badge-gray' },
};

/** Always icon + word, never colour alone, so it reads for colour-blind users. */
export function DoseStatusBadge({ status }: { status: DoseDisplayStatus }) {
  const { label, icon: Icon, className } = STYLES[status];
  return (
    <span className={`badge ${className}`}>
      <Icon className="w-4 h-4" aria-hidden="true" />
      {label}
    </span>
  );
}
