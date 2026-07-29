'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Bluetooth,
  BluetoothOff,
  Battery,
  RefreshCw,
  AlertTriangle,
  Package,
  Volume2,
  Lightbulb,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import BottleSimulator from '@/components/BottleSimulator';

export default function BottlePage() {
  const {
    bottleState,
    connectionState,
    isBluetoothSupported,
    connectBottle,
    connectSimulatedBottle,
    disconnectBottle,
    pushScheduleToBottle,
    testLED,
    testBuzzer,
    schedules,
  } = useApp();

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (key: string, action: () => Promise<void>, ok?: string) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (ok) setNotice(ok);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const device = bottleState.device;
  const isConnected = connectionState === 'connected';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-display font-semibold text-gray-900">Ol Bottle</h1>
          <p className="text-gray-500 mt-1">Connect and manage your smart bottle</p>
        </header>

        {!isBluetoothSupported && (
          <div className="card p-4 bg-warning-50 border-warning-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-warning-800">
              <p className="font-medium">Bluetooth not available in this browser</p>
              <p className="mt-1">
                Web Bluetooth works in Chrome, Edge, and Opera on desktop and Android.
                Safari and iOS are not supported.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="card p-4 bg-error-50 border-error-200 text-sm text-error-700">
            {error}
          </div>
        )}
        {notice && (
          <div className="card p-4 bg-success-50 border-success-200 text-sm text-success-700">
            {notice}
          </div>
        )}

        {/* Connection */}
        <section className="card p-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                isConnected ? 'bg-success-100' : 'bg-gray-100'
              }`}
            >
              {isConnected ? (
                <Bluetooth className="w-8 h-8 text-success-600" />
              ) : (
                <BluetoothOff className="w-8 h-8 text-gray-400" />
              )}
            </div>

            <div className="flex-1">
              <h2 className="font-semibold text-gray-900">
                {device?.name ?? 'No bottle paired'}
              </h2>
              <p className="text-sm text-gray-500 capitalize">
                {connectionState}
                {device?.firmwareVersion && ` · firmware ${device.firmwareVersion}`}
              </p>
              {bottleState.lastSync && (
                <p className="text-xs text-gray-400 mt-1">
                  Synced {formatDistanceToNow(bottleState.lastSync, { addSuffix: true })}
                </p>
              )}
            </div>

            {isConnected ? (
              <button
                onClick={() => run('disconnect', disconnectBottle)}
                disabled={busy !== null}
                className="btn btn-outline"
              >
                Disconnect
              </button>
            ) : (
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => run('connect', connectBottle, 'Bottle connected')}
                  disabled={busy !== null || !isBluetoothSupported}
                  className="btn btn-primary"
                >
                  {busy === 'connect' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Connect'
                  )}
                </button>
                <button
                  onClick={() =>
                    run('sim', connectSimulatedBottle, 'Simulated bottle connected')
                  }
                  disabled={busy !== null}
                  className="text-sm text-gray-500 hover:text-primary-600 underline"
                >
                  Connect simulated bottle
                </button>
              </div>
            )}
          </div>

          {isConnected && device && (
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <Battery className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Battery</p>
                  <p className="font-medium text-gray-900">{device.batteryLevel}%</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Loaded compartments</p>
                  <p className="font-medium text-gray-900">
                    {bottleState.compartments.filter((c) => c.hasPills).length} of 6
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Schedule sync */}
        <section className="card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-gray-900">Schedule sync</h2>
              <p className="text-sm text-gray-500 mt-1">
                The bottle stores its own copy of your schedule, so reminders still
                fire when your phone is away or offline.
              </p>
              <p className="text-sm text-gray-400 mt-2">
                {schedules.filter((s) => s.isActive).length} active schedules
              </p>
            </div>
            <button
              onClick={() =>
                run('sync', pushScheduleToBottle, 'Schedule pushed to bottle')
              }
              disabled={busy !== null || !isConnected}
              className="btn btn-outline flex-shrink-0"
            >
              {busy === 'sync' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Push now
                </>
              )}
            </button>
          </div>
        </section>

        {/* Compartments */}
        {isConnected && bottleState.compartments.length > 0 && (
          <section className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Compartments</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {bottleState.compartments.map((c) => (
                <div
                  key={c.number}
                  className={`p-4 rounded-xl border ${
                    c.hasPills
                      ? 'border-success-200 bg-success-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <p className="font-medium text-gray-900">Compartment {c.number}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {c.hasPills ? 'Loaded' : 'Empty'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Hardware test */}
        <section className="card p-6">
          <h2 className="font-semibold text-gray-900">Test hardware</h2>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Fire the reminder outputs to check the bottle responds.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => run('led', () => testLED(1, 'medium', 'medium'))}
              disabled={busy !== null || !isConnected}
              className="btn btn-outline"
            >
              <Lightbulb className="w-5 h-5 mr-2" />
              Test LED
            </button>
            <button
              onClick={() => run('buzzer', testBuzzer)}
              disabled={busy !== null || !isConnected}
              className="btn btn-outline"
            >
              <Volume2 className="w-5 h-5 mr-2" />
              Test buzzer
            </button>
          </div>
        </section>

        <BottleSimulator />
      </div>
    </DashboardLayout>
  );
}
