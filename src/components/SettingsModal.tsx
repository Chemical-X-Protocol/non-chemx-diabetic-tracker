import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Volume2,
  Syringe,
  User,
  RotateCcw,
  Download,
  Upload,
  Check,
} from 'lucide-react';
import {
  GlucoseLog,
  InjectionSite,
  InsulinLog,
  InsulinScheduleItem,
  InsulinType,
  UserProfile,
} from '../types/diabetes';
import { playReminderChime } from '../utils/diabetesCalculations';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  schedule: InsulinScheduleItem[];
  glucoseLogs: GlucoseLog[];
  insulinLogs: InsulinLog[];
  onUpdateProfile: (profile: UserProfile) => void;
  onUpdateSchedule: (schedule: InsulinScheduleItem[]) => void;
  onResetSampleData: () => void;
  onImportAllData: (data: {
    profile?: UserProfile;
    schedule?: InsulinScheduleItem[];
    glucoseLogs?: GlucoseLog[];
    insulinLogs?: InsulinLog[];
  }) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  schedule,
  glucoseLogs,
  insulinLogs,
  onUpdateProfile,
  onUpdateSchedule,
  onResetSampleData,
  onImportAllData,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'schedule' | 'profile' | 'data'>('schedule');

  // Local state for profile
  const [localProfile, setLocalProfile] = useState<UserProfile>(profile);

  // Local state for schedules
  const [localSchedule, setLocalSchedule] = useState<InsulinScheduleItem[]>(schedule);

  // New schedule form
  const [newName, setNewName] = useState('');
  const [newTime, setNewTime] = useState('12:00');
  const [newType, setNewType] = useState<InsulinType>('bolus');
  const [newBrand, setNewBrand] = useState('Humalog (Lispro)');
  const [newUnits, setNewUnits] = useState(6);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const handleSaveProfile = () => {
    onUpdateProfile(localProfile);
  };

  const handleToggleScheduleItem = (id: string) => {
    const updated = localSchedule.map((item) =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    setLocalSchedule(updated);
    onUpdateSchedule(updated);
  };

  const handleDeleteScheduleItem = (id: string) => {
    if (confirm('Delete this scheduled dose?')) {
      const updated = localSchedule.filter((item) => item.id !== id);
      setLocalSchedule(updated);
      onUpdateSchedule(updated);
    }
  };

  const handleAddScheduleItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newItem: InsulinScheduleItem = {
      id: `sched-${Date.now()}`,
      name: newName.trim(),
      targetTime: newTime,
      type: newType,
      insulinBrand: newBrand.trim(),
      defaultUnits: Number(newUnits),
      enabled: true,
      reminderActive: true,
    };

    const updated = [...localSchedule, newItem];
    setLocalSchedule(updated);
    onUpdateSchedule(updated);

    setNewName('');
    setIsAddingNew(false);
  };

  // Export full JSON backup
  const handleExportJSON = () => {
    const backup = {
      profile: localProfile,
      schedule: localSchedule,
      glucoseLogs,
      insulinLogs,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diabetic-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        onImportAllData(parsed);
        alert('Data backup successfully restored!');
        onClose();
      } catch (err) {
        alert('Invalid JSON file. Please check file formatting.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Settings & Regimen Configuration
            </h2>
            <p className="text-xs text-slate-500">Manage your daily dose schedule, doctor details, and data</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 border-b border-slate-100 pt-3 pb-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'schedule'
                ? 'bg-teal-50 text-teal-800 font-semibold border border-teal-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daily Dosing Schedule
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'profile'
                ? 'bg-teal-50 text-teal-800 font-semibold border border-teal-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Patient & Clinic Profile
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'data'
                ? 'bg-teal-50 text-teal-800 font-semibold border border-teal-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Data Backup & Reset
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Tab 1: Schedule */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Scheduled Daily Injections
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    These form your daily task checklist for taking your insulin on time.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingNew(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Scheduled Dose</span>
                </button>
              </div>

              {/* Schedule List */}
              <div className="space-y-2">
                {localSchedule.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                      item.enabled ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => handleToggleScheduleItem(item.id)}
                        className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="text-slate-500 font-mono mt-0.5">
                          {item.targetTime} · {item.defaultUnits} units · {item.insulinBrand} (
                          <span className="capitalize">{item.type}</span>)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteScheduleItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete schedule slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Dose Form Drawer */}
              {isAddingNew && (
                <form
                  onSubmit={handleAddScheduleItem}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
                >
                  <div className="text-xs font-bold text-slate-800">Add New Recurring Dose</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Dose Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Afternoon Snack Bolus"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Target Time
                      </label>
                      <input
                        type="time"
                        required
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Insulin Type
                      </label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value as InsulinType)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
                      >
                        <option value="bolus">Rapid / Bolus</option>
                        <option value="basal">Long / Basal</option>
                        <option value="correction">Correction</option>
                        <option value="intermediate">Intermediate</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Insulin Brand
                      </label>
                      <input
                        type="text"
                        value={newBrand}
                        onChange={(e) => setNewBrand(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Default Units
                      </label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={newUnits}
                        onChange={(e) => setNewUnits(parseFloat(e.target.value) || 1)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingNew(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded shadow-xs"
                    >
                      Save Dose Slot
                    </button>
                  </div>
                </form>
              )}

              {/* Sound Chime Checkbox */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-teal-600" />
                  <span className="text-xs font-medium text-slate-700">Audio reminder chime</span>
                </div>
                <button
                  type="button"
                  onClick={() => playReminderChime()}
                  className="text-xs text-teal-700 hover:underline"
                >
                  Play Sample Chime
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Profile */}
          {activeTab === 'profile' && (
            <div className="space-y-4 text-xs">
              <h3 className="font-semibold text-slate-700 uppercase tracking-wider">
                Patient & Physician Details
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Patient Full Name</label>
                  <input
                    type="text"
                    value={localProfile.name}
                    onChange={(e) => setLocalProfile({ ...localProfile, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={localProfile.dob}
                    onChange={(e) => setLocalProfile({ ...localProfile, dob: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Medical Record # (MRN)
                  </label>
                  <input
                    type="text"
                    value={localProfile.mrn}
                    onChange={(e) => setLocalProfile({ ...localProfile, mrn: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Attending Physician</label>
                  <input
                    type="text"
                    value={localProfile.physicianName}
                    onChange={(e) =>
                      setLocalProfile({ ...localProfile, physicianName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Clinic / Facility Name</label>
                <input
                  type="text"
                  value={localProfile.clinicName}
                  onChange={(e) => setLocalProfile({ ...localProfile, clinicName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target Glucose Min (mg/dL)
                  </label>
                  <input
                    type="number"
                    value={localProfile.targetGlucoseMin}
                    onChange={(e) =>
                      setLocalProfile({
                        ...localProfile,
                        targetGlucoseMin: parseInt(e.target.value, 10) || 70,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target Glucose Max (mg/dL)
                  </label>
                  <input
                    type="number"
                    value={localProfile.targetGlucoseMax}
                    onChange={(e) =>
                      setLocalProfile({
                        ...localProfile,
                        targetGlucoseMax: parseInt(e.target.value, 10) || 180,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg shadow-xs"
                >
                  Save Profile Changes
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Data Backup & Reset */}
          {activeTab === 'data' && (
            <div className="space-y-4 text-xs">
              <h3 className="font-semibold text-slate-700 uppercase tracking-wider">
                Data Storage & Safety
              </h3>
              <p className="text-slate-500">
                All logs, reminders, and patient settings are preserved locally in your browser storage.
              </p>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="font-semibold text-slate-800">Export & Import Backups</div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleExportJSON}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download JSON Backup</span>
                  </button>

                  <label className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Restore Backup from File</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportJSON}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                <div className="font-semibold text-amber-900">Reset & Sample Data</div>
                <p className="text-amber-800">
                  You can reload the comprehensive 14-day sample records to test reports, charts, and daily checklists.
                </p>
                <button
                  onClick={() => {
                    if (
                      confirm(
                        'Replace current logs with the 14-day clinical sample dataset? Current unsaved entries will be overwritten.'
                      )
                    ) {
                      onResetSampleData();
                      onClose();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reload Sample 14-Day Clinical Data</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
