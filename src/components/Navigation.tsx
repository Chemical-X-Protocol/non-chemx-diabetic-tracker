import React from 'react';
import { Activity, Plus, FileText, CalendarCheck, BarChart3, Settings, ShieldAlert } from 'lucide-react';
import { UserProfile } from '../types/diabetes';

interface NavigationProps {
  currentTab: 'tasks' | 'dashboard' | 'logs' | 'report';
  onSelectTab: (tab: 'tasks' | 'dashboard' | 'logs' | 'report') => void;
  onOpenQuickLog: () => void;
  onOpenSettings: () => void;
  profile: UserProfile;
  onToggleUnit: () => void;
  pendingShotsCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  onOpenQuickLog,
  onOpenSettings,
  profile,
  onToggleUnit,
  pendingShotsCount,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
              Diabetic Tracker v0
            </span>
          </div>

          {/* Zone 2: 4-5 clean text navigation links */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onSelectTab('tasks')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                currentTab === 'tasks'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <CalendarCheck className="w-4 h-4 text-teal-600" />
              <span>Daily Tasks</span>
              {pendingShotsCount > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-mono font-medium bg-amber-100 text-amber-800 rounded-md">
                  {pendingShotsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                currentTab === 'dashboard'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-teal-600" />
              <span>Glucose Dashboard</span>
            </button>

            <button
              onClick={() => onSelectTab('logs')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                currentTab === 'logs'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Activity className="w-4 h-4 text-teal-600" />
              <span>Historical Logs</span>
            </button>

            <button
              onClick={() => onSelectTab('report')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                currentTab === 'report'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4 text-teal-600" />
              <span>Doctor Visit Export</span>
            </button>
          </nav>

          {/* Zone 3: 1-2 primary actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Unit Preference Toggle button */}
            <button
              onClick={onToggleUnit}
              title={`Switch unit to ${profile.unitPreference === 'mg/dL' ? 'mmol/L' : 'mg/dL'}`}
              className="px-2.5 py-1.5 text-xs font-mono font-medium rounded-md border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              {profile.unitPreference}
            </button>

            {/* Quick Log Button */}
            <button
              onClick={onOpenQuickLog}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-xs whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Log Dose / Glucose</span>
              <span className="sm:hidden">Log</span>
            </button>

            {/* Settings button */}
            <button
              onClick={onOpenSettings}
              title="Settings & Regimen"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden border-t border-slate-100 py-2 gap-1 overflow-x-auto">
          <button
            onClick={() => onSelectTab('tasks')}
            className={`flex-1 py-1.5 px-2 text-xs font-medium text-center rounded-md whitespace-nowrap ${
              currentTab === 'tasks' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600'
            }`}
          >
            Tasks {pendingShotsCount > 0 && `(${pendingShotsCount})`}
          </button>
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`flex-1 py-1.5 px-2 text-xs font-medium text-center rounded-md whitespace-nowrap ${
              currentTab === 'dashboard' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onSelectTab('logs')}
            className={`flex-1 py-1.5 px-2 text-xs font-medium text-center rounded-md whitespace-nowrap ${
              currentTab === 'logs' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600'
            }`}
          >
            Logs
          </button>
          <button
            onClick={() => onSelectTab('report')}
            className={`flex-1 py-1.5 px-2 text-xs font-medium text-center rounded-md whitespace-nowrap ${
              currentTab === 'report' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600'
            }`}
          >
            Doctor Report
          </button>
        </div>
      </div>
    </header>
  );
};
