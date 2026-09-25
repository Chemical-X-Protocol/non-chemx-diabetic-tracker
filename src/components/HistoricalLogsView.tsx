import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  Edit2,
  Syringe,
  Activity,
  Calendar,
  X,
  Check,
} from 'lucide-react';
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
import {
  formatGlucoseValue,
  generateDoctorReportCSV,
  parseGlucoseInput,
} from '../utils/diabetesCalculations';

interface HistoricalLogsViewProps {
  glucoseLogs: GlucoseLog[];
  insulinLogs: InsulinLog[];
  profile: UserProfile;
  onAddGlucoseLog: (log: Omit<GlucoseLog, 'id'>) => void;
  onAddInsulinLog: (log: Omit<InsulinLog, 'id'>) => void;
  onUpdateGlucoseLog: (log: GlucoseLog) => void;
  onUpdateInsulinLog: (log: InsulinLog) => void;
  onDeleteGlucoseLog: (id: string) => void;
  onDeleteInsulinLog: (id: string) => void;
  onOpenQuickLog: () => void;
}

type RecordTypeFilter = 'all' | 'insulin' | 'glucose';
type DateFilter = 'all' | 'today' | '7d' | '30d';

type CombinedRow =
  | { kind: 'glucose'; id: string; timestamp: string; date: string; time: string; data: GlucoseLog }
  | { kind: 'insulin'; id: string; timestamp: string; date: string; time: string; data: InsulinLog };

export const HistoricalLogsView: React.FC<HistoricalLogsViewProps> = ({
  glucoseLogs,
  insulinLogs,
  profile,
  onAddGlucoseLog,
  onAddInsulinLog,
  onUpdateGlucoseLog,
  onUpdateInsulinLog,
  onDeleteGlucoseLog,
  onDeleteInsulinLog,
  onOpenQuickLog,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<RecordTypeFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  // Edit states
  const [editingItem, setEditingItem] = useState<CombinedRow | null>(null);

  // Combine and sort chronologically descending
  const combinedRows: CombinedRow[] = useMemo(() => {
    const list: CombinedRow[] = [];

    if (typeFilter === 'all' || typeFilter === 'glucose') {
      glucoseLogs.forEach((g) => {
        list.push({ kind: 'glucose', id: g.id, timestamp: g.timestamp, date: g.date, time: g.time, data: g });
      });
    }

    if (typeFilter === 'all' || typeFilter === 'insulin') {
      insulinLogs.forEach((i) => {
        list.push({ kind: 'insulin', id: i.id, timestamp: i.timestamp, date: i.date, time: i.time, data: i });
      });
    }

    // Sort descending
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply date filter
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return list.filter((row) => {
      // Date filter
      if (dateFilter === 'today' && row.date !== todayStr) return false;
      if (dateFilter === '7d') {
        const diff = (now.getTime() - new Date(row.timestamp).getTime()) / (1000 * 3600 * 24);
        if (diff > 7) return false;
      }
      if (dateFilter === '30d') {
        const diff = (now.getTime() - new Date(row.timestamp).getTime()) / (1000 * 3600 * 24);
        if (diff > 30) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        if (row.kind === 'glucose') {
          const g = row.data;
          const matchContext = g.context.toLowerCase().includes(q);
          const matchNotes = (g.notes || '').toLowerCase().includes(q);
          const matchVal = g.value.toString().includes(q);
          return matchContext || matchNotes || matchVal;
        } else {
          const ins = row.data;
          const matchName = ins.name.toLowerCase().includes(q);
          const matchBrand = ins.insulinBrand.toLowerCase().includes(q);
          const matchSite = ins.site.toLowerCase().includes(q);
          const matchNotes = (ins.notes || '').toLowerCase().includes(q);
          return matchName || matchBrand || matchSite || matchNotes;
        }
      }

      return true;
    });
  }, [glucoseLogs, insulinLogs, typeFilter, dateFilter, searchTerm]);

  // Export CSV
  const handleExportCSV = () => {
    const csv = generateDoctorReportCSV(glucoseLogs, insulinLogs, profile);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diabetic-tracker-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div>
          <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
            Patient Journal
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Historical Records
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Displaying {combinedRows.length} total entries across your treatment history
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onOpenQuickLog}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Entry</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search notes, insulin brands, injection sites..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-teal-600"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setTypeFilter('insulin')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                typeFilter === 'insulin' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              Insulin Only
            </button>
            <button
              onClick={() => setTypeFilter('glucose')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                typeFilter === 'glucose' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              Glucose Only
            </button>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-2 py-1 rounded-md transition-colors ${
                dateFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-2 py-1 rounded-md transition-colors ${
                dateFilter === 'today' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('7d')}
              className={`px-2 py-1 rounded-md transition-colors ${
                dateFilter === '7d' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setDateFilter('30d')}
              className={`px-2 py-1 rounded-md transition-colors ${
                dateFilter === '30d' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              30 Days
            </button>
          </div>
        </div>
      </div>

      {/* High-density Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {combinedRows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No records matched your search or filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4 w-28">Date & Time</th>
                  <th className="py-3 px-4 w-28">Category</th>
                  <th className="py-3 px-4">Primary Value</th>
                  <th className="py-3 px-4">Context / Site</th>
                  <th className="py-3 px-4">Notes & Details</th>
                  <th className="py-3 px-4 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {combinedRows.map((row) => {
                  if (row.kind === 'glucose') {
                    const g = row.data;
                    const isLow = g.value < profile.targetGlucoseMin;
                    const isHigh = g.value > profile.targetGlucoseMax;
                    const badgeClass = isLow
                      ? 'text-rose-700 bg-rose-50 font-bold'
                      : isHigh
                      ? 'text-amber-800 bg-amber-50 font-bold'
                      : 'text-emerald-800 bg-emerald-50 font-semibold';

                    return (
                      <tr key={`gl-${g.id}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                          <div>{g.date}</div>
                          <div className="text-[11px] text-slate-400">{g.time}</div>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <Activity className="w-3.5 h-3.5 text-teal-600" />
                            <span>Glucose</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded font-mono ${badgeClass}`}>
                            {formatGlucoseValue(g.value, profile.unitPreference)} {profile.unitPreference}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 capitalize">
                          {GLUCOSE_CONTEXT_LABELS[g.context] || g.context}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {g.carbs && (
                            <span className="font-mono text-slate-700 font-medium mr-2">
                              {g.carbs}g carbs
                            </span>
                          )}
                          {g.notes ? <span>{g.notes}</span> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingItem(row)}
                              title="Edit reading"
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this glucose reading?')) {
                                  onDeleteGlucoseLog(g.id);
                                }
                              }}
                              title="Delete reading"
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  } else {
                    const ins = row.data;
                    return (
                      <tr key={`ins-${ins.id}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                          <div>{ins.date}</div>
                          <div className="text-[11px] text-slate-400">{ins.time}</div>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <Syringe className="w-3.5 h-3.5 text-blue-600" />
                            <span>Insulin Shot</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded font-mono font-bold bg-blue-50 text-blue-800">
                            {ins.units} units
                          </span>
                          <span className="ml-1.5 text-slate-600">{ins.insulinBrand}</span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {INJECTION_SITE_LABELS[ins.site] || ins.site}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          <span className="capitalize font-medium text-slate-700 mr-2">
                            {ins.name}
                          </span>
                          {ins.notes ? <span>{ins.notes}</span> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingItem(row)}
                              title="Edit insulin record"
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this insulin shot record?')) {
                                  onDeleteInsulinLog(ins.id);
                                }
                              }}
                              title="Delete record"
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <EditRecordModal
          item={editingItem}
          profile={profile}
          onClose={() => setEditingItem(null)}
          onSaveGlucose={(updated) => {
            onUpdateGlucoseLog(updated);
            setEditingItem(null);
          }}
          onSaveInsulin={(updated) => {
            onUpdateInsulinLog(updated);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
};

// Edit Record Modal Component
interface EditRecordModalProps {
  item: CombinedRow;
  profile: UserProfile;
  onClose: () => void;
  onSaveGlucose: (log: GlucoseLog) => void;
  onSaveInsulin: (log: InsulinLog) => void;
}

const EditRecordModal: React.FC<EditRecordModalProps> = ({
  item,
  profile,
  onClose,
  onSaveGlucose,
  onSaveInsulin,
}) => {
  const [date, setDate] = useState(item.date);
  const [time, setTime] = useState(item.time);
  const [notes, setNotes] = useState(item.data.notes || '');

  // Glucose specific fields
  const [glucoseVal, setGlucoseVal] = useState<number>(
    item.kind === 'glucose'
      ? profile.unitPreference === 'mmol/L'
        ? Number((item.data.value / 18.0182).toFixed(1))
        : item.data.value
      : 120
  );
  const [context, setContext] = useState<GlucoseContext>(
    item.kind === 'glucose' ? item.data.context : 'random'
  );
  const [carbs, setCarbs] = useState<number | undefined>(
    item.kind === 'glucose' ? item.data.carbs : undefined
  );

  // Insulin specific fields
  const [units, setUnits] = useState<number>(item.kind === 'insulin' ? item.data.units : 10);
  const [site, setSite] = useState<InjectionSite>(
    item.kind === 'insulin' ? item.data.site : 'abdomen_ur'
  );
  const [brand, setBrand] = useState<string>(
    item.kind === 'insulin' ? item.data.insulinBrand : 'Humalog'
  );

  const handleSave = () => {
    const timestamp = `${date}T${time}:00.000Z`;

    if (item.kind === 'glucose') {
      const storedMgDl = parseGlucoseInput(glucoseVal, profile.unitPreference);
      onSaveGlucose({
        ...item.data,
        timestamp,
        date,
        time,
        value: storedMgDl,
        context,
        carbs: carbs ? Number(carbs) : undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      onSaveInsulin({
        ...item.data,
        timestamp,
        date,
        time,
        units: Number(units),
        site,
        insulinBrand: brand,
        notes: notes.trim() || undefined,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">
            Edit {item.kind === 'glucose' ? 'Glucose Reading' : 'Insulin Shot'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono"
              />
            </div>
          </div>

          {item.kind === 'glucose' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Glucose Reading ({profile.unitPreference})
                </label>
                <input
                  type="number"
                  step={profile.unitPreference === 'mmol/L' ? '0.1' : '1'}
                  value={glucoseVal}
                  onChange={(e) => setGlucoseVal(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Context</label>
                <select
                  value={context}
                  onChange={(e) => setContext(e.target.value as GlucoseContext)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white"
                >
                  {Object.entries(GLUCOSE_CONTEXT_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Carbs (g)</label>
                <input
                  type="number"
                  value={carbs || ''}
                  onChange={(e) => setCarbs(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Optional grams"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Units</label>
                <input
                  type="number"
                  step="0.5"
                  value={units}
                  onChange={(e) => setUnits(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Insulin Brand</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Injection Site</label>
                <select
                  value={site}
                  onChange={(e) => setSite(e.target.value as InjectionSite)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white"
                >
                  {Object.entries(INJECTION_SITE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add clinical or meal notes"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
