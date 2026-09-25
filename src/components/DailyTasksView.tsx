import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  RotateCw,
  Plus,
  AlertCircle,
  Syringe,
  Check,
  X,
  Volume2,
  Sparkles,
} from 'lucide-react';
import {
  DayTask,
  GlucoseLog,
  INJECTION_SITE_LABELS,
  InjectionSite,
  InsulinLog,
  InsulinScheduleItem,
  UserProfile,
} from '../types/diabetes';
import { formatGlucoseValue, playReminderChime } from '../utils/diabetesCalculations';

interface DailyTasksViewProps {
  schedule: InsulinScheduleItem[];
  todayInsulinLogs: InsulinLog[];
  todayGlucoseLogs: GlucoseLog[];
  profile: UserProfile;
  suggestedSite: InjectionSite;
  onMarkDoseTaken: (schedule: InsulinScheduleItem, actualUnits: number, site: InjectionSite, notes?: string) => void;
  onSkipDose: (schedule: InsulinScheduleItem) => void;
  onUndoDose: (logId: string) => void;
  onOpenQuickLog: () => void;
}

export const DailyTasksView: React.FC<DailyTasksViewProps> = ({
  schedule,
  todayInsulinLogs,
  todayGlucoseLogs,
  profile,
  suggestedSite,
  onMarkDoseTaken,
  onSkipDose,
  onUndoDose,
  onOpenQuickLog,
}) => {
  // Modal for confirming dose details
  const [activeDoseModal, setActiveDoseModal] = useState<InsulinScheduleItem | null>(null);
  const [modalUnits, setModalUnits] = useState<number>(0);
  const [modalSite, setModalSite] = useState<InjectionSite>(suggestedSite);
  const [modalNotes, setModalNotes] = useState<string>('');

  const enabledSchedules = schedule.filter((s) => s.enabled);

  // Map each enabled schedule to its task status
  const tasks: DayTask[] = enabledSchedules.map((item) => {
    const log = todayInsulinLogs.find((l) => l.scheduleId === item.id);
    return {
      schedule: item,
      log,
      isTaken: log?.status === 'taken',
      isSkipped: log?.status === 'skipped',
      isSnoozed: log?.status === 'snoozed',
      suggestedSite,
    };
  });

  const takenCount = tasks.filter((t) => t.isTaken).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  const handleOpenConfirm = (sched: InsulinScheduleItem) => {
    setActiveDoseModal(sched);
    setModalUnits(sched.defaultUnits);
    setModalSite(suggestedSite);
    setModalNotes('');
  };

  const handleConfirmDose = () => {
    if (!activeDoseModal) return;
    onMarkDoseTaken(activeDoseModal, modalUnits, modalSite, modalNotes);
    setActiveDoseModal(null);
  };

  // Format today's date cleanly
  const todayFormatted = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Today's Adherence Summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
              Daily Regimen Checklist
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              Today's Insulin Schedule
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {todayFormatted} · {takenCount} of {totalCount} scheduled shots recorded ({progressPercent}%)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playReminderChime();
              }}
              title="Test reminder chime"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Chime Test</span>
            </button>
            <button
              onClick={onOpenQuickLog}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Log Correction / Extra Dose</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 transition-all duration-300 ${
                progressPercent === 100 ? 'bg-emerald-500' : 'bg-teal-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: The Tasks List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-slate-800">Scheduled Injections</h2>
            <span className="text-xs text-slate-500 font-mono">
              Next rotation: {INJECTION_SITE_LABELS[suggestedSite]}
            </span>
          </div>

          {tasks.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <Syringe className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">No active doses scheduled</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Configure your daily basal and meal bolus reminders in settings to track daily compliance.
              </p>
            </div>
          ) : (
            tasks.map((task) => {
              const { schedule: item, log, isTaken, isSkipped } = task;

              return (
                <div
                  key={item.id}
                  className={`bg-white border rounded-xl p-4 transition-all ${
                    isTaken
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : isSkipped
                      ? 'border-slate-200 opacity-60 bg-slate-50'
                      : 'border-slate-200 shadow-xs hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Check Status Icon */}
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isTaken
                            ? 'bg-emerald-600 text-white'
                            : isSkipped
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-teal-50 text-teal-700 border border-teal-200'
                        }`}
                      >
                        {isTaken ? (
                          <Check className="w-5 h-5 stroke-[2.5]" />
                        ) : isSkipped ? (
                          <X className="w-5 h-5" />
                        ) : (
                          <Syringe className="w-4 h-4" />
                        )}
                      </div>

                      {/* Task details */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3
                            className={`text-sm font-semibold ${
                              isTaken ? 'text-slate-700 line-through' : 'text-slate-900'
                            }`}
                          >
                            {item.name}
                          </h3>
                          <span className="text-xs font-mono text-slate-500">
                            · {item.targetTime}
                          </span>
                        </div>

                        {/* Metadata row */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mt-1">
                          <span className="font-medium text-slate-700">{item.insulinBrand}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-slate-700">{item.defaultUnits} units</span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{item.type}</span>
                          {isTaken && log && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-700 font-medium">
                                Taken at {log.time} ({log.units}u in {INJECTION_SITE_LABELS[log.site]})
                              </span>
                            </>
                          )}
                          {isSkipped && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-amber-700 font-medium">Skipped</span>
                            </>
                          )}
                        </div>

                        {/* Notes if any */}
                        {log?.notes && (
                          <p className="text-xs text-slate-500 italic mt-1 bg-white/60 px-2 py-0.5 rounded border border-slate-100 inline-block">
                            "{log.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 sm:self-center shrink-0">
                      {!isTaken && !isSkipped && (
                        <>
                          <button
                            onClick={() => handleOpenConfirm(item)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Taken</span>
                          </button>
                          <button
                            onClick={() => onSkipDose(item)}
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            Skip
                          </button>
                        </>
                      )}

                      {isTaken && log && (
                        <button
                          onClick={() => onUndoDose(log.id)}
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          Undo
                        </button>
                      )}

                      {isSkipped && log && (
                        <button
                          onClick={() => onUndoDose(log.id)}
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Today's Unscheduled / Correction Shots */}
          {todayInsulinLogs.filter((l) => !l.scheduleId).length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Unscheduled / Correction Injections Today
              </h3>
              <div className="space-y-2">
                {todayInsulinLogs
                  .filter((l) => !l.scheduleId)
                  .map((log) => (
                    <div
                      key={log.id}
                      className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                          <Syringe className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            {log.name || 'Correction Bolus'} · {log.units} units ({log.insulinBrand})
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono">{log.time}</span>
                            <span>·</span>
                            <span>{INJECTION_SITE_LABELS[log.site]}</span>
                            {log.notes && (
                              <>
                                <span>·</span>
                                <span className="italic">{log.notes}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => onUndoDose(log.id)}
                        className="px-2 py-1 text-xs text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Site Rotation Map & Today's Glucose Readings */}
        <div className="space-y-6">
          {/* Site Rotation Tracker Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-semibold text-slate-800">Injection Site Rotation</h3>
              </div>
              <span className="text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md">
                Active Cycle
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Rotating your injection sites prevents lipohypertrophy (fatty lumps) and ensures consistent insulin absorption.
            </p>

            {/* Visual Abdomen / Body site quadrant grid */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-600">Abdomen Quadrants:</div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                <div
                  className={`p-2.5 rounded-lg border transition-colors ${
                    suggestedSite === 'abdomen_ul'
                      ? 'border-teal-500 bg-teal-50/50 text-teal-900 font-semibold ring-1 ring-teal-500'
                      : 'border-slate-200 text-slate-700 bg-slate-50'
                  }`}
                >
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Upper Left</div>
                  <div className="mt-0.5">Abdomen UL</div>
                  {suggestedSite === 'abdomen_ul' && (
                    <span className="text-[10px] text-teal-700 font-sans block mt-1">Recommended</span>
                  )}
                </div>

                <div
                  className={`p-2.5 rounded-lg border transition-colors ${
                    suggestedSite === 'abdomen_ur'
                      ? 'border-teal-500 bg-teal-50/50 text-teal-900 font-semibold ring-1 ring-teal-500'
                      : 'border-slate-200 text-slate-700 bg-slate-50'
                  }`}
                >
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Upper Right</div>
                  <div className="mt-0.5">Abdomen UR</div>
                  {suggestedSite === 'abdomen_ur' && (
                    <span className="text-[10px] text-teal-700 font-sans block mt-1">Recommended</span>
                  )}
                </div>

                <div
                  className={`p-2.5 rounded-lg border transition-colors ${
                    suggestedSite === 'abdomen_ll'
                      ? 'border-teal-500 bg-teal-50/50 text-teal-900 font-semibold ring-1 ring-teal-500'
                      : 'border-slate-200 text-slate-700 bg-slate-50'
                  }`}
                >
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Lower Left</div>
                  <div className="mt-0.5">Abdomen LL</div>
                  {suggestedSite === 'abdomen_ll' && (
                    <span className="text-[10px] text-teal-700 font-sans block mt-1">Recommended</span>
                  )}
                </div>

                <div
                  className={`p-2.5 rounded-lg border transition-colors ${
                    suggestedSite === 'abdomen_lr'
                      ? 'border-teal-500 bg-teal-50/50 text-teal-900 font-semibold ring-1 ring-teal-500'
                      : 'border-slate-200 text-slate-700 bg-slate-50'
                  }`}
                >
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Lower Right</div>
                  <div className="mt-0.5">Abdomen LR</div>
                  {suggestedSite === 'abdomen_lr' && (
                    <span className="text-[10px] text-teal-700 font-sans block mt-1">Recommended</span>
                  )}
                </div>
              </div>

              {/* Alternate sites: Thighs and Arms */}
              <div className="text-xs font-semibold text-slate-600 pt-2">Alternate Sites:</div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                <div
                  className={`p-2 rounded-lg border ${
                    suggestedSite === 'thigh_l' || suggestedSite === 'thigh_r'
                      ? 'border-teal-500 bg-teal-50/50 text-teal-900 font-semibold'
                      : 'border-slate-200 text-slate-700 bg-slate-50'
                  }`}
                >
                  Outer Thighs (L/R)
                </div>
                <div
                  className={`p-2 rounded-lg border ${
                    suggestedSite === 'arm_l' || suggestedSite === 'arm_r'
                      ? 'border-teal-500 bg-teal-50/50 text-teal-900 font-semibold'
                      : 'border-slate-200 text-slate-700 bg-slate-50'
                  }`}
                >
                  Triceps / Arms (L/R)
                </div>
              </div>
            </div>
          </div>

          {/* Today's Glucose Readings Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800">Today's Blood Glucose</h3>
              <button
                onClick={onOpenQuickLog}
                className="text-xs text-teal-700 hover:text-teal-800 font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Reading</span>
              </button>
            </div>

            {todayGlucoseLogs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                No glucose readings logged today yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {todayGlucoseLogs.map((log) => {
                  const isLow = log.value < profile.targetGlucoseMin;
                  const isHigh = log.value > profile.targetGlucoseMax;
                  const statusClass = isLow
                    ? 'text-rose-600 bg-rose-50'
                    : isHigh
                    ? 'text-amber-700 bg-amber-50'
                    : 'text-emerald-700 bg-emerald-50';

                  return (
                    <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-medium text-slate-800 capitalize">
                          {log.context.replace('_', ' ')}
                        </div>
                        <div className="text-slate-400 font-mono text-[11px]">{log.time}</div>
                      </div>

                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded font-mono font-semibold ${statusClass}`}>
                          {formatGlucoseValue(log.value, profile.unitPreference)} {profile.unitPreference}
                        </span>
                        {log.carbs && (
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {log.carbs}g carbs
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Marking Shot as Taken */}
      {activeDoseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Syringe className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">Record Insulin Shot</h3>
              </div>
              <button
                onClick={() => setActiveDoseModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dose Name</span>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {activeDoseModal.name} ({activeDoseModal.insulinBrand})
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Actual Units Injected
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0.5"
                    max="100"
                    step="0.5"
                    value={modalUnits}
                    onChange={(e) => setModalUnits(parseFloat(e.target.value) || 0)}
                    className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-lg font-mono font-bold text-slate-900 focus:outline-teal-600"
                  />
                  <span className="text-sm text-slate-500">units</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setModalUnits((u) => Math.max(0.5, u - 1))}
                      className="px-2.5 py-1 text-xs border border-slate-200 rounded hover:bg-slate-100 font-mono"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalUnits((u) => u + 1)}
                      className="px-2.5 py-1 text-xs border border-slate-200 rounded hover:bg-slate-100 font-mono"
                    >
                      +1
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Injection Site
                </label>
                <select
                  value={modalSite}
                  onChange={(e) => setModalSite(e.target.value as InjectionSite)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-teal-600"
                >
                  {Object.entries(INJECTION_SITE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label} {k === suggestedSite ? '★ (Suggested Rotation)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Meal details (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Breakfast 50g carbs, 15 min pre-bolus"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-teal-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveDoseModal(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDose}
                className="px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-xs"
              >
                Confirm Dose Taken
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
