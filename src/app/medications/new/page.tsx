'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, Save, Pill } from 'lucide-react';

export default function MedicationFormPage() {
  return (
    <Suspense fallback={null}>
      <MedicationForm />
    </Suspense>
  );
}

function MedicationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { medications, addMedication, updateMedication } = useApp();
  
  const medicationId = searchParams.get('id');
  const isEdit = !!medicationId;
  const existingMedication = isEdit 
    ? medications.find(m => m.id === medicationId)
    : null;

  const [formData, setFormData] = useState({
    name: existingMedication?.name || '',
    dosage: existingMedication?.dosage || '',
    unit: existingMedication?.unit || 'mg',
    instructions: existingMedication?.instructions || '',
    frequency: 'daily',
    times: ['08:00'],
    color: existingMedication?.color || '#3B82F6',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const medicationData = {
        name: formData.name,
        dosage: formData.dosage,
        unit: formData.unit,
        instructions: formData.instructions,
        color: formData.color,
        icon: 'Pill',
      };

      if (isEdit && medicationId) {
        updateMedication(medicationId, medicationData);
      } else {
        addMedication(medicationData);
      }

      router.push('/medications');
    } catch (error) {
      console.error('Failed to save medication:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTime = () => {
    setFormData({
      ...formData,
      times: [...formData.times, '12:00'],
    });
  };

  const removeTime = (index: number) => {
    setFormData({
      ...formData,
      times: formData.times.filter((_, i) => i !== index),
    });
  };

  const updateTime = (index: number, value: string) => {
    const newTimes = [...formData.times];
    newTimes[index] = value;
    setFormData({ ...formData, times: newTimes });
  };

  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
  ];

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link 
            href="/medications" 
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-semibold text-gray-900">
              {isEdit ? 'Edit Medication' : 'Add Medication'}
            </h1>
            <p className="text-gray-500 mt-1">
              {isEdit ? 'Update medication details' : 'Add a new medication to your list'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medication Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Aspirin"
                  className="input w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dosage *
                  </label>
                  <input
                    type="text"
                    value={formData.dosage}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    placeholder="e.g., 100"
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="input w-full"
                  >
                    <option value="mg">mg</option>
                    <option value="ml">ml</option>
                    <option value="mcg">mcg</option>
                    <option value="g">g</option>
                    <option value="tablet">tablet(s)</option>
                    <option value="capsule">capsule(s)</option>
                    <option value="drop">drop(s)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructions
                </label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="e.g., Take with food"
                  className="input w-full"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Schedule</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="input w-full"
                >
                  <option value="daily">Daily</option>
                  <option value="twice_daily">Twice Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="as_needed">As Needed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Times
                </label>
                <div className="space-y-2">
                  {formData.times.map((time, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => updateTime(index, e.target.value)}
                        className="input flex-1"
                      />
                      {formData.times.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTime(index)}
                          className="px-3 py-2 text-error-600 hover:bg-error-50 rounded-lg"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addTime}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    + Add another time
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Link href="/medications" className="btn btn-outline flex-1">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary flex-1"
            >
              <Save className="w-5 h-5 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Medication'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
