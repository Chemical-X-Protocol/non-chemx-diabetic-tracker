/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigation } from './components/Navigation';
import { DailyTasksView } from './components/DailyTasksView';
import { GlucoseDashboardView } from './components/GlucoseDashboardView';
import { HistoricalLogsView } from './components/HistoricalLogsView';
import { DoctorReportView } from './components/DoctorReportView';
import { LogEntryModal } from './components/LogEntryModal';
import { SettingsModal } from './components/SettingsModal';
import {
  GlucoseLog,
  InjectionSite,
  InsulinLog,
  InsulinScheduleItem,
  UserProfile,
} from './types/diabetes';
import {
  getNextRecommendedSite,
  playReminderChime,
} from './utils/diabetesCalculations';
import {
  INITIAL_PROFILE,
  INITIAL_SCHEDULE,
  generateSampleLogs,
} from './utils/sampleData';
import { Bell, X, Check } from 'lucide-react';

const STORAGE_KEYS = {
  PROFILE: 'diabetic_tracker_profile_v0',
  SCHEDULE: 'diabetic_tracker_schedule_v0',
  GLUCOSE_LOGS: 'diabetic_tracker_glucose_logs_v0',
  INSULIN_LOGS: 'diabetic_tracker_insulin_logs_v0',
};

export default function App() {
  // 1. Initial State with local storage retrieval or realistic sample data
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      name: 'Alex Morgan',
      dob: '1988-04-12',
      mrn: 'DM-784920',
      physicianName: 'Dr. Sarah Lin, MD (Endocrinology)',
      clinicName: 'Cascade Diabetes & Endocrine Center',
      targetGlucoseMin: 70,
      targetGlucoseMax: 180,
      unitPreference: 'mg/dL',
      reminderSound: true,
      physicianNotes: 'Discussing morning dawn phenomenon. Reviewing Humalog 1:10 carb ratio for dinner.',
    };
  });

  const [schedule, setSchedule] = useState<InsulinScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_SCHEDULE;
  });

  const [glucoseLogs, setGlucoseLogs] = useState<GlucoseLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GLUCOSE_LOGS);
      if (saved) return JSON.parse(saved);
    } catch {}
    const initial = generateSampleLogs();
    return initial.glucoseLogs;
  });

  const [insulinLogs, setInsulinLogs] = useState<InsulinLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INSULIN_LOGS);
      if (saved) return JSON.parse(saved);
    } catch {}
    const initial = generateSampleLogs();
    return initial.insulinLogs;
  });

  // UI state
  const [currentTab, setCurrentTab] = useState<'tasks' | 'dashboard' | 'logs' | 'report'>('tasks');
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeAlert, setActiveAlert] = useState<{ id: string; message: string; schedule: InsulinScheduleItem } | null>(null);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch {}
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
    } catch {}
  }, [schedule]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.GLUCOSE_LOGS, JSON.stringify(glucoseLogs));
    } catch {}
  }, [glucoseLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.INSULIN_LOGS, JSON.stringify(insulinLogs));
    } catch {}
  }, [insulinLogs]);

  // Today string
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Today's specific logs
  const todayInsulinLogs = useMemo(() => {
    return insulinLogs.filter((l) => l.date === todayStr);
  }, [insulinLogs, todayStr]);

  const todayGlucoseLogs = useMemo(() => {
    return glucoseLogs.filter((l) => l.date === todayStr);
  }, [glucoseLogs, todayStr]);

  // Calculate recommended site from recent logs
  const suggestedSite = useMemo(() => {
    return getNextRecommendedSite(insulinLogs);
  }, [insulinLogs]);

  // Count pending scheduled shots for today
  const pendingShotsCount = useMemo(() => {
    const enabled = schedule.filter((s) => s.enabled);
    const takenOrSkippedIds = new Set(
      todayInsulinLogs.filter((l) => l.status === 'taken' || l.status === 'skipped').map((l) => l.scheduleId)
    );
    return enabled.filter((s) => !takenOrSkippedIds.has(s.id)).length;
  }, [schedule, todayInsulinLogs]);

  // Daily Reminder Interval
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;

      // Check if any enabled schedule matches current time and not yet logged today
      schedule.forEach((sched) => {
        if (!sched.enabled || !sched.reminderActive) return;

        const alreadyLogged = todayInsulinLogs.some((l) => l.scheduleId === sched.id);
        if (!alreadyLogged && sched.targetTime === currentHHmm) {
          if (profile.reminderSound) {
            playReminderChime();
          }
          setActiveAlert({
            id: `alert-${sched.id}-${Date.now()}`,
            message: `Time for your scheduled ${sched.name} (${sched.defaultUnits} units of ${sched.insulinBrand})`,
            schedule: sched,
          });
        }
      });
    };

    const intervalId = setInterval(checkReminders, 30000); // Check every 30 seconds
    return () => clearInterval(intervalId);
  }, [schedule, todayInsulinLogs, profile.reminderSound]);

  // Handlers for marking shots taken
  const handleMarkDoseTaken = useCallback(
    (sched: InsulinScheduleItem, actualUnits: number, site: InjectionSite, notes?: string) => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newLog: InsulinLog = {
        id: `ins-${Date.now()}`,
        scheduleId: sched.id,
        timestamp: now.toISOString(),
        date: todayStr,
        time: timeStr,
        name: sched.name,
        type: sched.type,
        insulinBrand: sched.insulinBrand,
        units: actualUnits,
        site,
        status: 'taken',
        notes,
      };

      setInsulinLogs((prev) => [newLog, ...prev]);
      if (activeAlert?.schedule.id === sched.id) {
        setActiveAlert(null);
      }
    },
    [todayStr, activeAlert]
  );

  const handleSkipDose = useCallback(
    (sched: InsulinScheduleItem) => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const skipLog: InsulinLog = {
        id: `ins-skip-${Date.now()}`,
        scheduleId: sched.id,
        timestamp: now.toISOString(),
        date: todayStr,
        time: timeStr,
        name: sched.name,
        type: sched.type,
        insulinBrand: sched.insulinBrand,
        units: 0,
        site: suggestedSite,
        status: 'skipped',
        notes: 'Dose marked as skipped by patient',
      };

      setInsulinLogs((prev) => [skipLog, ...prev]);
      if (activeAlert?.schedule.id === sched.id) {
        setActiveAlert(null);
      }
    },
    [todayStr, suggestedSite, activeAlert]
  );

  const handleUndoDose = useCallback((logId: string) => {
    setInsulinLogs((prev) => prev.filter((l) => l.id !== logId));
  }, []);

  // Quick log handlers
  const handleSaveGlucose = useCallback((newG: Omit<GlucoseLog, 'id'>) => {
    const created: GlucoseLog = {
      ...newG,
      id: `gl-${Date.now()}`,
    };
    setGlucoseLogs((prev) => [created, ...prev]);
  }, []);

  const handleSaveInsulin = useCallback((newI: Omit<InsulinLog, 'id'>) => {
    const created: InsulinLog = {
      ...newI,
      id: `ins-${Date.now()}`,
    };
    setInsulinLogs((prev) => [created, ...prev]);
  }, []);

  const handleSaveBoth = useCallback(
    (newG: Omit<GlucoseLog, 'id'>, newI: Omit<InsulinLog, 'id'>) => {
      handleSaveGlucose(newG);
      handleSaveInsulin(newI);
    },
    [handleSaveGlucose, handleSaveInsulin]
  );

  // CRUD for historical logs
  const handleUpdateGlucoseLog = useCallback((updated: GlucoseLog) => {
    setGlucoseLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }, []);

  const handleUpdateInsulinLog = useCallback((updated: InsulinLog) => {
    setInsulinLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }, []);

  const handleDeleteGlucoseLog = useCallback((id: string) => {
    setGlucoseLogs((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const handleDeleteInsulinLog = useCallback((id: string) => {
    setInsulinLogs((prev) => prev.filter((l) => l.id !== id));
  }, []);

  // Reset sample dataset
  const handleResetSampleData = useCallback(() => {
    const sample = generateSampleLogs();
    setGlucoseLogs(sample.glucoseLogs);
    setInsulinLogs(sample.insulinLogs);
    setSchedule(INITIAL_SCHEDULE);
  }, []);

  // Import all data
  const handleImportAllData = useCallback(
    (data: {
      profile?: UserProfile;
      schedule?: InsulinScheduleItem[];
      glucoseLogs?: GlucoseLog[];
      insulinLogs?: InsulinLog[];
    }) => {
      if (data.profile) setProfile(data.profile);
      if (data.schedule) setSchedule(data.schedule);
      if (data.glucoseLogs) setGlucoseLogs(data.glucoseLogs);
      if (data.insulinLogs) setInsulinLogs(data.insulinLogs);
    },
    []
  );

  // Toggle unit preference (mg/dL <-> mmol/L)
  const handleToggleUnit = useCallback(() => {
    setProfile((prev) => ({
      ...prev,
      unitPreference: prev.unitPreference === 'mg/dL' ? 'mmol/L' : 'mg/dL',
    }));
  }, []);

  const scheduledDosesPerDay = useMemo(() => {
    return schedule.filter((s) => s.enabled).length || 4;
  }, [schedule]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Active Reminder Toast Notification */}
      {activeAlert && (
        <div className="bg-teal-700 text-white px-4 py-3 shadow-md flex items-center justify-between sticky top-0 z-40 animate-in slide-in-from-top duration-200 no-print">
          <div className="flex items-center gap-2.5 max-w-4xl mx-auto w-full">
            <Bell className="w-5 h-5 animate-bounce shrink-0" />
            <div className="text-xs sm:text-sm font-medium flex-1">
              <span className="font-bold">Dose Reminder:</span> {activeAlert.message}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  handleMarkDoseTaken(
                    activeAlert.schedule,
                    activeAlert.schedule.defaultUnits,
                    suggestedSite
                  );
                }}
                className="px-3 py-1 bg-white text-teal-800 text-xs font-bold rounded hover:bg-teal-50 transition-colors"
              >
                Mark Taken ({activeAlert.schedule.defaultUnits}u)
              </button>
              <button
                onClick={() => setActiveAlert(null)}
                className="p-1 text-teal-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenQuickLog={() => setIsQuickLogOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        profile={profile}
        onToggleUnit={handleToggleUnit}
        pendingShotsCount={pendingShotsCount}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'tasks' && (
          <DailyTasksView
            schedule={schedule}
            todayInsulinLogs={todayInsulinLogs}
            todayGlucoseLogs={todayGlucoseLogs}
            profile={profile}
            suggestedSite={suggestedSite}
            onMarkDoseTaken={handleMarkDoseTaken}
            onSkipDose={handleSkipDose}
            onUndoDose={handleUndoDose}
            onOpenQuickLog={() => setIsQuickLogOpen(true)}
          />
        )}

        {currentTab === 'dashboard' && (
          <GlucoseDashboardView
            glucoseLogs={glucoseLogs}
            insulinLogs={insulinLogs}
            profile={profile}
            scheduledDosesPerDay={scheduledDosesPerDay}
          />
        )}

        {currentTab === 'logs' && (
          <HistoricalLogsView
            glucoseLogs={glucoseLogs}
            insulinLogs={insulinLogs}
            profile={profile}
            onAddGlucoseLog={handleSaveGlucose}
            onAddInsulinLog={handleSaveInsulin}
            onUpdateGlucoseLog={handleUpdateGlucoseLog}
            onUpdateInsulinLog={handleUpdateInsulinLog}
            onDeleteGlucoseLog={handleDeleteGlucoseLog}
            onDeleteInsulinLog={handleDeleteInsulinLog}
            onOpenQuickLog={() => setIsQuickLogOpen(true)}
          />
        )}

        {currentTab === 'report' && (
          <DoctorReportView
            glucoseLogs={glucoseLogs}
            insulinLogs={insulinLogs}
            profile={profile}
            onUpdateProfile={setProfile}
            scheduledDosesPerDay={scheduledDosesPerDay}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-slate-200 bg-white py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">Diabetic Tracker v0 - Non-chemx</span>
            <span>·</span>
            <span>Clinical-grade diabetes daily task & glucose management</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-slate-900 transition-colors"
            >
              Regimen Settings
            </button>
            <span>·</span>
            <button
              onClick={() => setCurrentTab('report')}
              className="hover:text-slate-900 transition-colors"
            >
              Export Doctor Visit
            </button>
            <span>·</span>
            <button
              onClick={() => {
                if (confirm('Reload the 14-day sample records?')) {
                  handleResetSampleData();
                }
              }}
              className="text-teal-700 hover:text-teal-800 font-medium"
            >
              Reload Sample Data
            </button>
          </div>
        </div>
      </footer>

      {/* Quick Log Modal */}
      <LogEntryModal
        isOpen={isQuickLogOpen}
        onClose={() => setIsQuickLogOpen(false)}
        profile={profile}
        suggestedSite={suggestedSite}
        onSaveGlucose={handleSaveGlucose}
        onSaveInsulin={handleSaveInsulin}
        onSaveBoth={handleSaveBoth}
      />

      {/* Regimen & Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        schedule={schedule}
        glucoseLogs={glucoseLogs}
        insulinLogs={insulinLogs}
        onUpdateProfile={setProfile}
        onUpdateSchedule={setSchedule}
        onResetSampleData={handleResetSampleData}
        onImportAllData={handleImportAllData}
      />
    </div>
  );
}
