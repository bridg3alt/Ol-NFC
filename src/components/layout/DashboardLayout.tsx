'use client';

import { ReactNode, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sun,
  Pill,
  HelpCircle,
  Settings,
  LayoutDashboard,
  CalendarClock,
  LogOut,
  Type,
  X,
  LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDisplayPrefs, TextSize } from '@/context/DisplayPrefsContext';
import AuthGuard from '@/components/AuthGuard';
import { homePathFor } from '@/lib/roles';
import { UserRole } from '@/types';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AuthGuard>
      <DashboardChrome>{children}</DashboardChrome>
    </AuthGuard>
  );
}

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

// Four items at most per role: every one fits the phone's bottom bar with a
// text label, so no screen hides navigation behind a menu button.
const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  user: [
    { href: '/today', icon: Sun, label: 'Today' },
    { href: '/medications', icon: Pill, label: 'Medicines' },
    { href: '/help', icon: HelpCircle, label: 'Help' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ],
  caregiver: [
    { href: '/caregiver', icon: LayoutDashboard, label: 'Overview' },
    { href: '/schedule', icon: CalendarClock, label: 'Routine' },
    { href: '/medications', icon: Pill, label: 'Medicines' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ],
};

function DashboardChrome({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const displayDialog = useRef<HTMLDialogElement>(null);

  const role = user?.role ?? 'user';
  const navItems = NAV_BY_ROLE[role];
  const isCurrent = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 bg-white border-b border-stone-200">
        <div className="container-app flex items-center justify-between h-16">
          <Link href={homePathFor(role)} className="flex items-center gap-2 rounded-lg">
            <img src="/logo.jpeg" alt="" className="w-9 h-9 object-contain" />
            <span className="font-bold text-xl text-ink">Olvia</span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => displayDialog.current?.showModal()}
              className="btn btn-ghost btn-sm"
            >
              <Type className="w-5 h-5" aria-hidden="true" />
              <span>Display</span>
            </button>
            <button type="button" onClick={() => logout()} className="btn btn-ghost btn-sm">
              <LogOut className="w-5 h-5" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="lg:flex lg:max-w-6xl lg:mx-auto">
        {/* Desktop: navigation down the left side */}
        <nav aria-label="Main" className="hidden lg:block w-60 shrink-0 p-4">
          <ul className="space-y-1 sticky top-20">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isCurrent(item.href) ? 'page' : undefined}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold ${
                    isCurrent(item.href)
                      ? 'bg-primary-100 text-primary-800'
                      : 'text-gray-700 hover:bg-stone-100'
                  }`}
                >
                  <item.icon className="w-6 h-6" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main id="main" className="flex-1 pb-28 lg:pb-12">
          <div className="container-app py-6">{children}</div>
        </main>
      </div>

      {/* Phone: navigation in a bar along the bottom, within thumb reach */}
      <nav
        aria-label="Main"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-stone-200"
      >
        <ul className="grid grid-cols-4">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isCurrent(item.href) ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 min-h-[64px] text-sm font-bold ${
                  isCurrent(item.href) ? 'text-primary-800 bg-primary-50' : 'text-gray-700'
                }`}
              >
                <item.icon className="w-6 h-6" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <DisplayDialog dialogRef={displayDialog} />
    </div>
  );
}

const TEXT_SIZES: { id: TextSize; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'large', label: 'Large' },
  { id: 'xlarge', label: 'Extra large' },
];

/**
 * Uses the native <dialog> element: showModal() keeps keyboard focus inside
 * the dialog, Escape closes it, and screen readers announce it as a dialog.
 */
function DisplayDialog({
  dialogRef,
}: {
  dialogRef: React.RefObject<HTMLDialogElement>;
}) {
  const { textSize, setTextSize, highContrast, setHighContrast } = useDisplayPrefs();
  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="display-title"
      className="rounded-2xl p-0 w-[min(28rem,calc(100vw-2rem))] backdrop:bg-black/50"
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 id="display-title" className="text-2xl font-bold">
            Display
          </h2>
          <button type="button" onClick={close} className="btn btn-ghost btn-sm">
            <X className="w-5 h-5" aria-hidden="true" />
            Close
          </button>
        </div>

        <fieldset>
          <legend className="label">Text size</legend>
          <div className="grid grid-cols-3 gap-2">
            {TEXT_SIZES.map((size) => (
              <button
                key={size.id}
                type="button"
                aria-pressed={textSize === size.id}
                onClick={() => setTextSize(size.id)}
                className={`btn ${textSize === size.id ? 'btn-primary' : 'btn-outline'}`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bold" id="contrast-label">
              High contrast
            </p>
            <p className="text-gray-700">Black text on white, stronger outlines.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={highContrast}
            aria-labelledby="contrast-label"
            onClick={() => setHighContrast(!highContrast)}
            className={`btn ${highContrast ? 'btn-primary' : 'btn-outline'} min-w-[80px]`}
          >
            {highContrast ? 'On' : 'Off'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
