'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { User, Bell, LogOut, Save, Loader2 } from 'lucide-react';
import { UserSettings } from '@/types';

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [settings, setSettings] = useState<UserSettings>(
    user?.settings ?? {
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notificationsEnabled: true,
      accessibilityMode: false,
      fontSize: 'medium',
      highContrast: false,
    }
  );

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      await updateUser({ displayName, settings });
      setNotice('Settings saved');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <header>
          <h1 className="text-2xl font-display font-semibold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your account and preferences</p>
        </header>

        {notice && (
          <div className="card p-4 bg-success-50 border-success-200 text-sm text-success-700">
            {notice}
          </div>
        )}
        {error && (
          <div className="card p-4 bg-error-50 border-error-200 text-sm text-error-700">
            {error}
          </div>
        )}

        {/* Profile */}
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Profile</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                Display name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={user?.email ?? ''}
                disabled
                className="input bg-gray-50 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <p className="text-gray-900 capitalize">{user?.role ?? '—'}</p>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Notifications</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Enable notifications</p>
              <p className="text-xs text-gray-500 mt-1">
                Reminders and caregiver alerts
              </p>
            </div>
            <button
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  notificationsEnabled: !s.notificationsEnabled,
                }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.notificationsEnabled ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Accessibility defaults */}
        <section className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Accessibility defaults</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Font size
              </label>
              <div className="flex gap-2">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setSettings((s) => ({ ...s, fontSize: size }))}
                    className={`flex-1 py-2 px-4 rounded-lg border capitalize ${
                      settings.fontSize === size
                        ? 'border-primary-500 bg-primary-50 text-primary-600'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">High contrast</p>
              <button
                onClick={() =>
                  setSettings((s) => ({ ...s, highContrast: !s.highContrast }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.highContrast ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.highContrast ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Save changes
              </>
            )}
          </button>
          <button onClick={handleLogout} className="btn btn-outline text-error-600">
            <LogOut className="w-5 h-5 mr-2" />
            Sign out
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
