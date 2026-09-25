import type { UserRole } from '@/types';

/** Where each role lands after signing in, and where "Home" points. */
export function homePathFor(role: UserRole): string {
  return role === 'caregiver' ? '/caregiver' : '/today';
}
