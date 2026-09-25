'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Plus,
  Pill,
  Edit2,
  Trash2,
  Search,
  Filter,
  AlertCircle,
} from 'lucide-react';
import { Medication } from '@/types';

export default function MedicationsPage() {
  const { medications, deleteMedication } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const filteredMedications = medications.filter(med =>
    med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    med.dosage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: string) => {
    deleteMedication(id);
    setShowDeleteConfirm(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-semibold text-gray-900">Medications</h1>
            <p className="text-gray-500 mt-1">Manage your medications</p>
          </div>
          <Link href="/medications/new" className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Add Medication
          </Link>
        </header>

        {/* Search & Filter */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search medications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-12"
            />
          </div>
          <button className="btn btn-outline">
            <Filter className="w-5 h-5 mr-2" />
            Filter
          </button>
        </div>

        {/* Medications Grid */}
        {filteredMedications.length === 0 ? (
          <div className="card p-12 text-center">
            <Pill className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No medications found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery
                ? 'Try adjusting your search'
                : 'Add your first medication to get started'}
            </p>
            {!searchQuery && (
              <Link href="/medications/new" className="btn btn-primary">
                <Plus className="w-5 h-5 mr-2" />
                Add Medication
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMedications.map(medication => (
              <MedicationCard
                key={medication.id}
                medication={medication}
                onDelete={() => setShowDeleteConfirm(medication.id)}
              />
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-error-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-error-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Delete Medication</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this medication? This will also remove all associated schedules.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="btn btn-danger flex-1"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function MedicationCard({
  medication,
  onDelete,
}: {
  medication: Medication;
  onDelete: () => void;
}) {
  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
          <Pill className="w-6 h-6 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{medication.name}</h3>
          <p className="text-sm text-gray-500">
            {medication.dosage} {medication.unit}
          </p>
          {medication.instructions && (
            <p className="text-sm text-gray-400 mt-2 line-clamp-2">
              {medication.instructions}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
        <Link
          href={`/medications/new?id=${medication.id}`}
          className="btn btn-ghost btn-sm flex-1"
        >
          <Edit2 className="w-4 h-4 mr-1" />
          Edit
        </Link>
        <button
          onClick={onDelete}
          className="btn btn-ghost btn-sm text-error-600 hover:bg-error-50 flex-1"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </button>
      </div>
    </div>
  );
}
