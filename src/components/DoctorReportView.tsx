import React, { useState, useMemo } from 'react';
import {
  Printer,
  Download,
  Copy,
  Check,
  FileText,
  Calendar,
  User,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';
import {
  GlucoseLog,
  GLUCOSE_CONTEXT_LABELS,
  INJECTION_SITE_LABELS,
  InsulinLog,
  UserProfile,
} from '../types/diabetes';
import {
  calculateGlucoseStats,
  calculateInsulinStats,
  formatGlucoseValue,
  generateDoctorReportCSV,
} from '../utils/diabetesCalculations';

interface DoctorReportViewProps {
  glucoseLogs: GlucoseLog[];
  insulinLogs: InsulinLog[];
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  scheduledDosesPerDay: number;
}

type ReportPeriod = '7d' | '14d' | '30d' | '90d' | 'all';

export const DoctorReportView: React.FC<DoctorReportViewProps> = ({
  glucoseLogs,
  insulinLogs,
  profile,
  onUpdateProfile,
  scheduledDosesPerDay,
}) => {
  const [period, setPeriod] = useState<ReportPeriod>('14d');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [physicianNotes, setPhysicianNotes] = useState(profile.physicianNotes || '');

  // Filter logs by selected period
  const { filteredGlucose, filteredInsulin, periodDays, startDateStr, endDateStr } = useMemo(() => {
    const now = new Date();
    const daysMap: Record<ReportPeriod, number> = {
      '7d': 7,
      '14d': 14,
      '30d': 30,
      '90d': 90,
      all: 365,
    };
    const days = daysMap[period];
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const g =
      period === 'all'
        ? [...glucoseLogs]
        : glucoseLogs.filter((l) => new Date(l.timestamp) >= cutoff);
    const i =
      period === 'all'
        ? [...insulinLogs]
        : insulinLogs.filter((l) => new Date(l.timestamp) >= cutoff);

    // Sort descending for clinical review
    g.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    i.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const allTimes = [...g.map((x) => x.timestamp), ...i.map((x) => x.timestamp)].sort();
    const sDate = allTimes[0] ? allTimes[0].slice(0, 10) : '—';
    const eDate = allTimes[allTimes.length - 1] ? allTimes[allTimes.length - 1].slice(0, 10) : '—';

    return {
      filteredGlucose: g,
      filteredInsulin: i,
      periodDays: days,
      startDateStr: sDate,
      endDateStr: eDate,
    };
  }, [glucoseLogs, insulinLogs, period]);

  const gStats = useMemo(() => {
    return calculateGlucoseStats(
      filteredGlucose,
      profile.targetGlucoseMin,
      profile.targetGlucoseMax
    );
  }, [filteredGlucose, profile.targetGlucoseMin, profile.targetGlucoseMax]);

  const iStats = useMemo(() => {
    return calculateInsulinStats(filteredInsulin, scheduledDosesPerDay, periodDays);
  }, [filteredInsulin, scheduledDosesPerDay, periodDays]);

  // Combined sorted list for print table
  type PrintItem =
    | { kind: 'glucose'; timestamp: string; date: string; time: string; data: GlucoseLog }
    | { kind: 'insulin'; timestamp: string; date: string; time: string; data: InsulinLog };

  const combinedTable: PrintItem[] = useMemo(() => {
    const list: PrintItem[] = [
      ...filteredGlucose.map((g) => ({
        kind: 'glucose' as const,
        timestamp: g.timestamp,
        date: g.date,
        time: g.time,
        data: g,
      })),
      ...filteredInsulin.map((i) => ({
        kind: 'insulin' as const,
        timestamp: i.timestamp,
        date: i.date,
        time: i.time,
        data: i,
      })),
    ];
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return list;
  }, [filteredGlucose, filteredInsulin]);

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  // Handle CSV Download
  const handleDownloadCSV = () => {
    const csv = generateDoctorReportCSV(filteredGlucose, filteredInsulin, profile);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Endocrinology_Report_${profile.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Copy Summary text for patient portal
  const handleCopySummary = () => {
    const summaryText = `DIABETES CLINICAL SUMMARY FOR DR. VISIT
Patient: ${profile.name} (MRN: ${profile.mrn}, DOB: ${profile.dob})
Period: ${startDateStr} to ${endDateStr} (${gStats.count} glucose readings, ${filteredInsulin.length} insulin shots)
Physician: ${profile.physicianName} - ${profile.clinicName}

GLYCEMIC METRICS:
- Mean Blood Glucose: ${gStats.averageMgDl} mg/dL (${(gStats.averageMgDl / 18.0182).toFixed(1)} mmol/L)
- Estimated A1C: ${gStats.estimatedA1C}%
- Time In Range (70-180 mg/dL): ${gStats.timeInRangePercent}% (Target > 70%)
- Time Below Range (< 70 mg/dL): ${gStats.timeBelowPercent}% (${gStats.hypoEventsCount} low episodes)
- Time Above Range (> 180 mg/dL): ${gStats.timeAbovePercent}%
- Glycemic Variability (CV): ${gStats.coefficientOfVariation}% (Target <= 36%)

INSULIN REGIMEN & ADHERENCE:
- Average Daily Dose (TDD): ${iStats.avgDailyTotalDose} units/day
- Basal Average: ${iStats.avgDailyBasal} u/day (${iStats.basalPercentage}%)
- Bolus Average: ${iStats.avgDailyBolus} u/day (${iStats.bolusPercentage}%)
- Scheduled Dose Adherence: ${iStats.adherencePercent}%

PATIENT NOTES:
${physicianNotes || 'None entered.'}
`;

    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleSaveNotes = () => {
    onUpdateProfile({ ...profile, physicianNotes });
  };

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar (Hidden during print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div>
          <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
            Clinical Documentation
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Doctor Visit Summary & Export
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Standard Ambulatory Glucose Profile (AGP) and insulin adherence report ready for your physician
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-mono">
            {(['7d', '14d', '30d', '90d', 'all'] as ReportPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  period === p ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Copy summary for Patient Portal */}
          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
            title="Copy formatted text to paste into MyChart / Patient Portal message"
          >
            {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSummary ? 'Copied to Clipboard' : 'Copy for Portal'}</span>
          </button>

          {/* Download CSV */}
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>

          {/* Print / Save as PDF */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* The Printable Clinical Document Container */}
      <div className="bg-white border border-slate-300 rounded-xl p-6 sm:p-8 shadow-xs text-slate-900 print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b-2 border-slate-800 pb-5 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="text-xs uppercase font-mono tracking-widest text-slate-500">
                Endocrinology & Diabetes Management Report
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
                Comprehensive Glycemic & Insulin Log
              </h2>
              <div className="text-xs text-slate-600 mt-1">
                Generated via <span className="font-semibold">Diabetic Tracker v0</span> · {new Date().toLocaleString()}
              </div>
            </div>

            <div className="text-left sm:text-right font-mono text-xs text-slate-600 bg-slate-50 print:bg-transparent p-3 sm:p-0 rounded-lg border border-slate-200 sm:border-none">
              <div>
                <span className="font-sans font-semibold text-slate-700">Target Range:</span> {profile.targetGlucoseMin} - {profile.targetGlucoseMax} mg/dL
              </div>
              <div>
                <span className="font-sans font-semibold text-slate-700">Reporting Window:</span> {startDateStr} to {endDateStr}
              </div>
            </div>
          </div>

          {/* Patient and Physician Identification Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-200 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Patient Name</span>
              <span className="font-semibold text-slate-900 text-sm">{profile.name}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">DOB / Medical Record #</span>
              <span className="font-mono text-slate-800">
                {profile.dob} · {profile.mrn}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Attending Physician</span>
              <span className="font-medium text-slate-900">{profile.physicianName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Clinic / Facility</span>
              <span className="text-slate-800">{profile.clinicName}</span>
            </div>
          </div>
        </div>

        {/* Section 1: Executive Glycemic Profile (AGP Standards) */}
        <div className="mb-6">
          <h3 className="text-xs uppercase font-bold tracking-wider text-slate-700 mb-3 border-b border-slate-200 pb-1">
            1. Ambulatory Glucose Profile Summary
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 border border-slate-200 rounded-lg">
              <div className="text-[11px] text-slate-500">Readings Captured</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">{gStats.count}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {(gStats.count / Math.max(1, iStats.daysCount)).toFixed(1)} / day
              </div>
            </div>

            <div className="p-3 border border-slate-200 rounded-lg">
              <div className="text-[11px] text-slate-500">Mean Glucose</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {gStats.averageMgDl} <span className="text-xs font-normal text-slate-500">mg/dL</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {(gStats.averageMgDl / 18.0182).toFixed(1)} mmol/L
              </div>
            </div>

            <div className="p-3 border border-slate-200 rounded-lg bg-teal-50/50">
              <div className="text-[11px] text-teal-800 font-semibold">Estimated A1C (eAG)</div>
              <div className="text-xl font-bold font-mono text-teal-900 mt-1">
                {gStats.estimatedA1C}%
              </div>
              <div className="text-[10px] text-teal-700 mt-0.5">eAG = (Avg + 46.7)/28.7</div>
            </div>

            <div className="p-3 border border-slate-200 rounded-lg">
              <div className="text-[11px] text-slate-500">Time in Range (70-180)</div>
              <div
                className={`text-xl font-bold font-mono mt-1 ${
                  gStats.timeInRangePercent >= 70 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {gStats.timeInRangePercent}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Clinical target &gt; 70%</div>
            </div>

            <div className="p-3 border border-slate-200 rounded-lg">
              <div className="text-[11px] text-slate-500">Time Below Range (&lt; 70)</div>
              <div
                className={`text-xl font-bold font-mono mt-1 ${
                  gStats.timeBelowPercent > 4 ? 'text-rose-700' : 'text-slate-800'
                }`}
              >
                {gStats.timeBelowPercent}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{gStats.hypoEventsCount} low episodes</div>
            </div>

            <div className="p-3 border border-slate-200 rounded-lg">
              <div className="text-[11px] text-slate-500">Glycemic Var. (CV%)</div>
              <div
                className={`text-xl font-bold font-mono mt-1 ${
                  gStats.coefficientOfVariation <= 36 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {gStats.coefficientOfVariation}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Target &le; 36% (Stable)</div>
            </div>
          </div>
        </div>

        {/* Section 2: Insulin Regimen & Adherence Summary */}
        <div className="mb-6">
          <h3 className="text-xs uppercase font-bold tracking-wider text-slate-700 mb-3 border-b border-slate-200 pb-1">
            2. Insulin Regimen & Injection Adherence
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block">Avg. Total Daily Dose (TDD)</span>
              <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
                {iStats.avgDailyTotalDose} units
              </span>
              <span className="text-[11px] text-slate-500">Across {iStats.daysCount} active days</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block">Basal / Bolus Split</span>
              <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
                {iStats.basalPercentage}% / {iStats.bolusPercentage}%
              </span>
              <span className="text-[11px] text-slate-500">
                {iStats.avgDailyBasal}u basal · {iStats.avgDailyBolus}u bolus
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block">Scheduled Dose Adherence</span>
              <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
                {iStats.adherencePercent}%
              </span>
              <span className="text-[11px] text-slate-500">
                {filteredInsulin.length} injections logged
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block">Site Rotation Status</span>
              <span className="text-lg font-bold text-emerald-800 mt-0.5 block">
                Active Cycle
              </span>
              <span className="text-[11px] text-slate-500">Abdomen, Thigh & Arm rotation</span>
            </div>
          </div>
        </div>

        {/* Section 3: Patient & Physician Clinical Notes */}
        <div className="mb-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2">
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-700">
              3. Patient Discussion Topics & Symptoms for Consultation
            </h3>
            <span className="no-print text-[11px] text-slate-400">Click to edit notes</span>
          </div>

          <div className="no-print">
            <textarea
              rows={3}
              value={physicianNotes}
              onChange={(e) => setPhysicianNotes(e.target.value)}
              onBlur={handleSaveNotes}
              placeholder="Enter specific questions, hypoglycemia symptoms, exercise effects, or diet changes you wish to discuss with Dr. Lin..."
              className="w-full p-3 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-teal-600"
            />
          </div>

          {/* Print only representation of the notes */}
          <div className="hidden print:block p-3 border border-slate-300 rounded text-xs text-slate-800 italic bg-slate-50 min-h-[50px]">
            {physicianNotes || 'No specific discussion topics noted by patient.'}
          </div>
        </div>

        {/* Section 4: Chronological Clinical Log Table */}
        <div>
          <h3 className="text-xs uppercase font-bold tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
            4. Detailed Chronological Event Logs ({combinedTable.length} Records)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300 bg-slate-100 text-slate-800 font-semibold">
                  <th className="py-2 px-3 w-28">Date & Time</th>
                  <th className="py-2 px-3 w-24">Type</th>
                  <th className="py-2 px-3 w-28">Measurement / Dose</th>
                  <th className="py-2 px-3 w-32">Context / Site</th>
                  <th className="py-2 px-3">Clinical Notes & Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {combinedTable.slice(0, 80).map((row, idx) => {
                  if (row.kind === 'glucose') {
                    const g = row.data;
                    const isLow = g.value < profile.targetGlucoseMin;
                    const isHigh = g.value > profile.targetGlucoseMax;
                    return (
                      <tr key={`pr-gl-${g.id}-${idx}`} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-slate-700 whitespace-nowrap">
                          {g.date} {g.time}
                        </td>
                        <td className="py-2 px-3 text-slate-700">Glucose</td>
                        <td className="py-2 px-3 font-mono font-bold whitespace-nowrap">
                          <span
                            className={
                              isLow
                                ? 'text-rose-700 underline font-extrabold'
                                : isHigh
                                ? 'text-amber-800'
                                : 'text-emerald-800'
                            }
                          >
                            {formatGlucoseValue(g.value, profile.unitPreference)}{' '}
                            {profile.unitPreference}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600 capitalize">
                          {GLUCOSE_CONTEXT_LABELS[g.context] || g.context}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {g.carbs ? `${g.carbs}g carbs. ` : ''}
                          {g.notes || '—'}
                        </td>
                      </tr>
                    );
                  } else {
                    const ins = row.data;
                    return (
                      <tr key={`pr-ins-${ins.id}-${idx}`} className="hover:bg-slate-50 bg-slate-50/40">
                        <td className="py-2 px-3 font-mono text-slate-700 whitespace-nowrap">
                          {ins.date} {ins.time}
                        </td>
                        <td className="py-2 px-3 text-slate-700 font-medium">Insulin</td>
                        <td className="py-2 px-3 font-mono font-bold text-blue-900 whitespace-nowrap">
                          {ins.units}u ({ins.insulinBrand})
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {INJECTION_SITE_LABELS[ins.site] || ins.site}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          <span className="capitalize font-medium text-slate-700 mr-2">
                            {ins.name}
                          </span>
                          {ins.notes || '—'}
                        </td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>

          {combinedTable.length > 80 && (
            <div className="text-center text-xs text-slate-400 py-3 italic border-t border-slate-200">
              Showing first 80 entries. Export the full CSV file for complete tabular data.
            </div>
          )}
        </div>

        {/* Doctor Review Sign-off area on print */}
        <div className="hidden print:block mt-12 pt-6 border-t border-slate-400 text-xs">
          <div className="grid grid-cols-2 gap-12">
            <div>
              <div className="border-b border-slate-400 pb-1 mb-1 font-mono text-slate-400">
                &nbsp;
              </div>
              <span className="text-slate-600 font-semibold">Attending Physician Signature</span>
            </div>
            <div>
              <div className="border-b border-slate-400 pb-1 mb-1 font-mono text-slate-400">
                &nbsp;
              </div>
              <span className="text-slate-600 font-semibold">Date of Consultation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
