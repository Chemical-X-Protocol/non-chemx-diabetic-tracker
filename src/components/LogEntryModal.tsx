import React, { useState } from 'react';
import { X, Syringe, Activity, Check, Plus, AlertCircle } from 'lucide-react';
import {
  GlucoseContext,
  GlucoseLog,
  GLUCOSE_CONTEXT_LABELS,
  INJECTION_SITE_LABELS,
  InjectionSite,
  InsulinLog,
  InsulinType,
  UserProfile,
} from '../types/diabetes';
import { parseGlucoseInput } from '../utils/diabetesCalculations';

interface LogEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  suggestedSite: InjectionSite;
  onSaveGlucose: (log: Omit<GlucoseLog, 'id'>) => void;
  onSaveInsulin: (log: Omit<InsulinLog, 'id'>) => void;
  onSaveBoth: (glucose: Omit<GlucoseLog, 'id'>, insulin: Omit<InsulinLog, 'id'>) => void;
}

type Mode = 'both' | 'insulin' | 'glucose';

export const LogEntryModal: React.FC<LogEntryModalProps> = ({
  isOpen,
  onClose,
  profile,
  suggestedSite,
  onSaveGlucose,
  onSaveInsulin,
  onSaveBoth,
}) => {
  if (!isOpen) return null;

  const now = new Date();
  const defaultDate = now.toISOString().slice(0, 10);
  const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  const [mode, setMode] = useState<Mode>('both');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);

  // Glucose state
  const [glucoseVal, setGlucoseVal] = useState<string>('120');
  const [context, setContext] = useState<GlucoseContext>('pre_meal');
  const [carbs, setCarbs] = useState<string>('');

  // Insulin state
  const [insulinUnits, setInsulinUnits] = useState<string>('6');
  const [insulinType, setInsulinType] = useState<InsulinType>('bolus');
  const [brand, setBrand] = useState<string>('Humalog (Lispro)');
  const [site, setSite] = useState<InjectionSite>(suggestedSite);
  const [name, setName] = useState<string>('Meal Bolus');

  // Shared notes
  const [notes, setNotes] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const timestamp = `${date}T${time}:00.000Z`;

    const gNum = parseFloat(glucoseVal);
    const iUnits = parseFloat(insulinUnits);

    const glucoseData: Omit<GlucoseLog, 'id'> | null =
      mode === 'both' || mode === 'glucose'
        ? {
            timestamp,
            date,
            time,
            value: parseGlucoseInput(gNum, profile.unitPreference),
            context,
            carbs: carbs ? parseInt(carbs, 10) : undefined,
            notes: notes.trim() || undefined,
          }
        : null;

    const insulinData: Omit<InsulinLog, 'id'> | null =
      mode === 'both' || mode === 'insulin'
        ? {
            timestamp,
            date,
            time,
            name: name || 'Insulin Injection',
            type: insulinType,
            insulinBrand: brand,
            units: iUnits || 0,
            site,
            status: 'taken',
            notes: notes.trim() || undefined,
          }
        : null;

    if (mode === 'both' && glucoseData && insulinData) {
      onSaveBoth(glucoseData, insulinData);
    } else if (mode === 'glucose' && glucoseData) {
      onSaveGlucose(glucoseData);
    } else if (mode === 'insulin' && insulinData) {
      onSaveInsulin(insulinData);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Log Glucose & Insulin Shot
            </h2>
            <p className="text-xs text-slate-500">Record a new measurement or injection</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg my-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setMode('both')}
            className={`py-1.5 rounded-md transition-colors ${
              mode === 'both' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
            }`}
          >
            Combined Entry
          </button>
          <button
            type="button"
            onClick={() => setMode('insulin')}
            className={`py-1.5 rounded-md transition-colors ${
              mode === 'insulin' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
            }`}
          >
            Insulin Shot Only
          </button>
          <button
            type="button"
            onClick={() => setMode('glucose')}
            className={`py-1.5 rounded-md transition-colors ${
              mode === 'glucose' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
            }`}
          >
            Glucose Only
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Timestamp fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Time</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-teal-600"
              />
            </div>
          </div>

          {/* Glucose Section */}
          {(mode === 'both' || mode === 'glucose') && (
            <div className="p-3.5 bg-teal-50/40 border border-teal-200/80 rounded-xl space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800">
                <Activity className="w-4 h-4 text-teal-600" />
                <span>Blood Glucose Reading</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Value ({profile.unitPreference})
                  </label>
                  <input
                    type="number"
                    required
                    step={profile.unitPreference === 'mmol/L' ? '0.1' : '1'}
                    min={profile.unitPreference === 'mmol/L' ? '1.5' : '30'}
                    max={profile.unitPreference === 'mmol/L' ? '35' : '600'}
                    value={glucoseVal}
                    onChange={(e) => setGlucoseVal(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base font-mono font-bold text-slate-900 focus:outline-teal-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Context</label>
                  <select
                    value={context}
                    onChange={(e) => setContext(e.target.value as GlucoseContext)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:outline-teal-600"
                  >
                    {Object.entries(GLUCOSE_CONTEXT_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Carbs (grams, optional)
                </label>
                <input
                  type="number"
                  min="0"
                  max="300"
                  placeholder="e.g. 45"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono bg-white focus:outline-teal-600"
                />
              </div>
            </div>
          )}

          {/* Insulin Section */}
          {(mode === 'both' || mode === 'insulin') && (
            <div className="p-3.5 bg-blue-50/40 border border-blue-200/80 rounded-xl space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <Syringe className="w-4 h-4 text-blue-600" />
                <span>Insulin Injection</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Units Injected
                  </label>
                  <input
                    type="number"
                    required
                    step="0.5"
                    min="0.5"
                    max="100"
                    value={insulinUnits}
                    onChange={(e) => setInsulinUnits(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base font-mono font-bold text-slate-900 focus:outline-blue-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Insulin Type
                  </label>
                  <select
                    value={insulinType}
                    onChange={(e) => {
                      const t = e.target.value as InsulinType;
                      setInsulinType(t);
                      if (t === 'basal') {
                        setBrand('Lantus (Glargine)');
                        setName('Basal Dose');
                      } else {
                        setBrand('Humalog (Lispro)');
                        setName('Bolus Dose');
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:outline-blue-600"
                  >
                    <option value="bolus">Rapid-Acting (Bolus / Meal)</option>
                    <option value="basal">Long-Acting (Basal / Background)</option>
                    <option value="correction">Correction Bolus (High BG)</option>
                    <option value="intermediate">Intermediate / NPH</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Injection Site
                  </label>
                  <select
                    value={site}
                    onChange={(e) => setSite(e.target.value as InjectionSite)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:outline-blue-600"
                  >
                    {Object.entries(INJECTION_SITE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label} {k === suggestedSite ? '★ (Suggested)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <input
              type="text"
              placeholder="e.g. Oatmeal with chia seeds, light 20m walk afterwards"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-teal-600"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-xs"
            >
              Save Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
