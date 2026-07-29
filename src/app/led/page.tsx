'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useApp } from '@/context/AppContext';
import {
  Lightbulb,
  Zap,
  Palette,
  Clock,
  Check,
  RefreshCw,
} from 'lucide-react';

export default function LEDSettingsPage() {
  const { schedules, updateSchedule } = useApp();
  const [testCompartment, setTestCompartment] = useState<number | null>(null);

  const ledSchedules = schedules.filter(s => s.ledSettings.enabled);

  const handleTestLED = async (compartment: number) => {
    setTestCompartment(compartment);
    // In a real app, this would trigger the actual LED via BLE
    setTimeout(() => setTestCompartment(null), 3000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-display font-semibold text-gray-900">LED Display</h1>
          <p className="text-gray-500 mt-1">Customize LED display settings for each compartment</p>
        </header>

        {/* Info Card */}
        <div className="card p-5 bg-primary-50 border-primary-200">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-primary-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-primary-900">LED Display Control</h3>
              <p className="text-sm text-primary-700 mt-1">
                When a reminder triggers, the corresponding shelf LED will blink and display the label you set. 
                This helps users quickly identify which medication to take.
              </p>
            </div>
          </div>
        </div>

        {/* Compartments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(compartment => {
            const schedule = schedules.find(s => s.compartment === compartment && s.ledSettings.enabled);
            
            return (
              <div key={compartment} className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <span className="font-semibold text-gray-700">{compartment}</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Compartment {compartment}</h3>
                      <p className="text-xs text-gray-500">
                        {schedule ? 'Configured' : 'Not set up'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTestLED(compartment)}
                    className="btn btn-ghost btn-sm"
                    disabled={!schedule}
                  >
                    <RefreshCw className={`w-4 h-4 ${testCompartment === compartment ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {schedule ? (
                  <div className="space-y-3">
                    {/* LED Text Display */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Display Text
                      </label>
                      <div className="mt-1">
                        <span className={`led-display blink-${schedule.ledSettings.blinkSpeed}`}>
                          {schedule.ledSettings.text}
                        </span>
                      </div>
                    </div>

                    {/* Settings */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Blink Intensity
                        </label>
                        <p className="text-sm text-gray-900 capitalize mt-1">
                          {schedule.ledSettings.blinkIntensity}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Blink Speed
                        </label>
                        <p className="text-sm text-gray-900 capitalize mt-1">
                          {schedule.ledSettings.blinkSpeed}
                        </p>
                      </div>
                    </div>

                    {/* Medication Info */}
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        Linked to: <span className="font-medium text-gray-700">
                          {/* Would show medication name */}
                          Medication
                        </span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-3">
                      No schedule configured for this compartment
                    </p>
                    <a href="/schedule/new" className="btn btn-outline btn-sm">
                      Add Schedule
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Global Settings */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Global LED Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-warning-500" />
                <div>
                  <p className="font-medium text-gray-900">Enable LED Reminders</p>
                  <p className="text-sm text-gray-500">Show visual cues for medication reminders</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-secondary-500" />
                <div>
                  <p className="font-medium text-gray-900">Default Color</p>
                  <p className="text-sm text-gray-500">LED color for all compartments</p>
                </div>
              </div>
              <select className="input w-40">
                <option value="green">Green</option>
                <option value="blue">Blue</option>
                <option value="white">White</option>
                <option value="amber">Amber</option>
              </select>
            </div>
          </div>
        </div>

        {/* Test All LEDs */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Test All LEDs</h2>
          <p className="text-gray-600 mb-4">
            Test the LED display on all configured compartments. Each will blink in sequence.
          </p>
          <button className="btn btn-primary">
            <Lightbulb className="w-5 h-5 mr-2" />
            Test All LEDs
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
