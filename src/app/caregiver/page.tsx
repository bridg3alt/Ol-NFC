'use client';

import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';

export default function CaregiverOverviewPage() {
  const { user } = useAuth();
  const linked = (user?.careRecipientIds?.length ?? 0) > 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold">Overview</h1>
          <p className="text-lg text-gray-700 mt-1">What happened today, at a glance.</p>
        </header>

        {!linked && (
          <section className="card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <UserPlus className="w-8 h-8 text-primary-700" aria-hidden="true" />
              <h2 className="text-2xl font-bold">No one linked yet</h2>
            </div>
            <p className="text-lg text-gray-700">
              Link the person you care for to see their medicines and activity here.
            </p>
            <Link href="/settings" className="btn btn-primary">
              Go to settings
            </Link>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
