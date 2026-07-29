'use client';

import { useEffect, useState } from 'react';
import {
  simulatedBottle,
  SimulatorState,
  FailureKind,
} from '@/services/bleSimulator';
import {
  Pill,
  BatteryLow,
  Unplug,
  RotateCcw,
  FastForward,
  PackagePlus,
  DoorOpen,
  AlertTriangle,
} from 'lucide-react';

const FAILURES: FailureKind[] = ['jam', 'empty', 'servo_timeout', 'lid_open'];

export default function BottleSimulator() {
  const [state, setState] = useState<SimulatorState | null>(null);

  useEffect(() => simulatedBottle.subscribe(setState), []);

  if (!state) return null;

  return (
    <section className="card p-6 border-dashed border-2">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-semibold text-gray-900">Bottle simulator</h2>
          <p className="text-sm text-gray-500 mt-1">
            A virtual bottle speaking the real BLE protocol. Use it to exercise
            dispensing, sensors, and failures without hardware.
          </p>
        </div>
        <button
          onClick={() => simulatedBottle.reset()}
          className="btn btn-ghost btn-sm flex-shrink-0"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Reset
        </button>
      </div>

      {/* Vitals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Vital label="Connected" value={state.connected ? 'Yes' : 'No'} />
        <Vital label="Battery" value={`${state.batteryLevel}%`} />
        <Vital label="Lid" value={state.lidOpen ? 'Open' : 'Closed'} />
        <Vital
          label="Queued events"
          value={state.queuedEvents.toString()}
          hint={state.queuedEvents > 0 ? 'Awaiting ack' : undefined}
        />
      </div>

      {/* Compartments */}
      <h3 className="text-sm font-medium text-gray-700 mb-2">Compartments</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        {state.pillCounts.map((count, i) => {
          const compartment = i + 1;
          return (
            <div
              key={compartment}
              className={`p-3 rounded-xl border ${
                count > 0
                  ? 'border-success-200 bg-success-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">#{compartment}</span>
                <span className="text-sm text-gray-500">{count} pills</span>
              </div>
              <div className="flex gap-1 mt-2">
                <button
                  onClick={() => simulatedBottle.takePill(compartment)}
                  className="btn btn-ghost btn-sm flex-1 text-xs"
                  title="Simulate the user taking this pill"
                >
                  <Pill className="w-3 h-3 mr-1" />
                  Take
                </button>
                <button
                  onClick={() => simulatedBottle.refill(compartment)}
                  className="btn btn-ghost btn-sm flex-1 text-xs"
                >
                  <PackagePlus className="w-3 h-3 mr-1" />
                  Refill
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Faults and conditions */}
      <h3 className="text-sm font-medium text-gray-700 mb-2">Conditions</h3>
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => simulatedBottle.setLid(!state.lidOpen)}
          className="btn btn-outline btn-sm"
        >
          <DoorOpen className="w-4 h-4 mr-1" />
          {state.lidOpen ? 'Close lid' : 'Open lid'}
        </button>
        <button
          onClick={() => simulatedBottle.setBattery(12)}
          className="btn btn-outline btn-sm"
        >
          <BatteryLow className="w-4 h-4 mr-1" />
          Drain battery
        </button>
        <button
          onClick={() => simulatedBottle.dropConnection()}
          className="btn btn-outline btn-sm"
        >
          <Unplug className="w-4 h-4 mr-1" />
          Drop connection
        </button>
        <button
          onClick={() => simulatedBottle.shiftClock(60)}
          className="btn btn-outline btn-sm"
          title="Advance the bottle clock to reach the next scheduled minute"
        >
          <FastForward className="w-4 h-4 mr-1" />
          +1 min
        </button>
      </div>

      <h3 className="text-sm font-medium text-gray-700 mb-2">
        Force a dispense failure on compartment 1
      </h3>
      <div className="flex flex-wrap gap-2 mb-5">
        {FAILURES.map((kind) => (
          <button
            key={kind}
            onClick={() => simulatedBottle.failDispense(1, kind)}
            className="btn btn-outline btn-sm text-warning-700"
          >
            <AlertTriangle className="w-4 h-4 mr-1" />
            {kind.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Loaded schedule */}
      {state.slots.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Schedule held on bottle ({state.slots.length} slots)
          </h3>
          <div className="flex flex-wrap gap-2 mb-5">
            {state.slots.map((slot) => (
              <span
                key={slot.index}
                className="px-2 py-1 rounded bg-gray-100 text-sm text-gray-700"
              >
                {String(slot.hour).padStart(2, '0')}:
                {String(slot.minute).padStart(2, '0')} → #{slot.compartment}
                {slot.flags & 0x02 ? ' (auto)' : ''}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Log */}
      <h3 className="text-sm font-medium text-gray-700 mb-2">Activity</h3>
      <div className="bg-gray-900 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs text-gray-300 space-y-1">
        {state.log.length === 0 ? (
          <p className="text-gray-500">No activity yet</p>
        ) : (
          state.log.map((line, i) => <p key={i}>{line}</p>)
        )}
      </div>
    </section>
  );
}

function Vital({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-gray-50">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
      {hint && <p className="text-xs text-warning-600 mt-0.5">{hint}</p>}
    </div>
  );
}
