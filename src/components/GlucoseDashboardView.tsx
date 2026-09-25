import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Activity,
  Award,
  AlertTriangle,
  Info,
  Calendar,
  Syringe,
  ChevronDown,
} from 'lucide-react';
import { GlucoseLog, InsulinLog, UserProfile } from '../types/diabetes';
import {
  calculateGlucoseStats,
  calculateInsulinStats,
  formatGlucoseValue,
  MG_DL_TO_MMOL_L,
} from '../utils/diabetesCalculations';

interface GlucoseDashboardViewProps {
  glucoseLogs: GlucoseLog[];
  insulinLogs: InsulinLog[];
  profile: UserProfile;
  scheduledDosesPerDay: number;
}

type TimeRange = '24h' | '7d' | '14d' | '30d' | '90d';

export const GlucoseDashboardView: React.FC<GlucoseDashboardViewProps> = ({
  glucoseLogs,
  insulinLogs,
  profile,
  scheduledDosesPerDay,
}) => {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('14d');
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    log: GlucoseLog;
    nearbyInsulin?: InsulinLog[];
  } | null>(null);

  // Filter logs by selected range
  const filteredData = useMemo(() => {
    const now = new Date();
    const daysMap: Record<TimeRange, number> = {
      '24h': 1,
      '7d': 7,
      '14d': 14,
      '30d': 30,
      '90d': 90,
    };
    const days = daysMap[selectedRange];
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const gLogs = glucoseLogs.filter((l) => new Date(l.timestamp) >= cutoff);
    const iLogs = insulinLogs.filter((l) => new Date(l.timestamp) >= cutoff);

    // Sort ascending for chart
    gLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      glucose: gLogs,
      insulin: iLogs,
      days,
    };
  }, [glucoseLogs, insulinLogs, selectedRange]);

  const gStats = useMemo(() => {
    return calculateGlucoseStats(
      filteredData.glucose,
      profile.targetGlucoseMin,
      profile.targetGlucoseMax
    );
  }, [filteredData.glucose, profile.targetGlucoseMin, profile.targetGlucoseMax]);

  const iStats = useMemo(() => {
    return calculateInsulinStats(filteredData.insulin, scheduledDosesPerDay, filteredData.days);
  }, [filteredData.insulin, scheduledDosesPerDay, filteredData.days]);

  // SVG Chart Geometry calculations
  const chartHeight = 280;
  const chartWidth = 800; // viewBox width
  const padding = { top: 20, right: 30, bottom: 40, left: 45 };

  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const yMin = 40; // mg/dL
  const yMax = 300; // mg/dL

  const getY = (val: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, val));
    return padding.top + innerHeight - ((clamped - yMin) / (yMax - yMin)) * innerHeight;
  };

  const timestamps = filteredData.glucose.map((l) => new Date(l.timestamp).getTime());
  const minTime = timestamps.length > 0 ? Math.min(...timestamps) : Date.now() - 86400000;
  const maxTime = timestamps.length > 0 ? Math.max(...timestamps) : Date.now();
  const timeSpan = maxTime - minTime || 1;

  const getX = (timestamp: string) => {
    const t = new Date(timestamp).getTime();
    return padding.left + ((t - minTime) / timeSpan) * innerWidth;
  };

  // Generate SVG polyline points
  const pointsString = filteredData.glucose
    .map((l) => `${getX(l.timestamp)},${getY(l.value)}`)
    .join(' ');

  // Target band rectangle
  const targetBandTop = getY(profile.targetGlucoseMax);
  const targetBandBottom = getY(profile.targetGlucoseMin);
  const targetBandHeight = Math.abs(targetBandBottom - targetBandTop);

  // Group by meal context for context averages
  const contextAverages = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    filteredData.glucose.forEach((g) => {
      if (!map[g.context]) map[g.context] = { total: 0, count: 0 };
      map[g.context].total += g.value;
      map[g.context].count += 1;
    });

    return Object.entries(map).map(([ctx, data]) => ({
      context: ctx,
      avg: Math.round(data.total / data.count),
      count: data.count,
    }));
  }, [filteredData.glucose]);

  return (
    <div className="space-y-6">
      {/* Header and Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div>
          <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
            Clinical Analytics
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Glucose & Insulin Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Analyzing {filteredData.glucose.length} blood glucose readings and {filteredData.insulin.length} insulin doses
          </p>
        </div>

        {/* Range Segmented Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {(['24h', '7d', '14d', '30d', '90d'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedRange === range
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Metric 1: Avg Glucose */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Average Glucose</div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
              {formatGlucoseValue(gStats.averageMgDl, profile.unitPreference)}
            </span>
            <span className="text-xs font-mono text-slate-500">{profile.unitPreference}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Min: {formatGlucoseValue(gStats.minMgDl, profile.unitPreference)} · Max: {formatGlucoseValue(gStats.maxMgDl, profile.unitPreference)}
          </div>
        </div>

        {/* Metric 2: Estimated A1C */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Estimated A1C (eAG)</div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-teal-700">
              {gStats.estimatedA1C > 0 ? `${gStats.estimatedA1C}%` : '—'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            ADA general goal: &lt; 7.0%
          </div>
        </div>

        {/* Metric 3: Time in Range */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Time In Range (TIR)</div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span
              className={`text-2xl sm:text-3xl font-bold font-mono ${
                gStats.timeInRangePercent >= 70 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {gStats.timeInRangePercent}%
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Goal: &gt; 70% (70-180 {profile.unitPreference})
          </div>
        </div>

        {/* Metric 4: Glycemic Variability (CV%) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Glycemic Var. (CV%)</div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span
              className={`text-2xl sm:text-3xl font-bold font-mono ${
                gStats.coefficientOfVariation <= 36 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {gStats.coefficientOfVariation}%
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Target: &le; 36% (Stable)
          </div>
        </div>

        {/* Metric 5: Average Daily Insulin (TDD) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs col-span-2 lg:col-span-1">
          <div className="text-xs font-semibold text-slate-500">Avg. Daily Dose (TDD)</div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
              {iStats.avgDailyTotalDose}
            </span>
            <span className="text-xs font-mono text-slate-500">u / day</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {iStats.basalPercentage}% Basal · {iStats.bolusPercentage}% Bolus
          </div>
        </div>
      </div>

      {/* Interactive Glycemic Trend Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-semibold text-slate-800">Glycemic Trend Curve & Dose Markers</h2>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Target Band (70 - 180 {profile.unitPreference})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span>Hypo risk (&lt; 70)</span>
            </div>
          </div>
        </div>

        {filteredData.glucose.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No readings recorded for this time range. Add a glucose reading to see your curve.
          </div>
        ) : (
          <div className="relative mt-4 overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto min-w-[600px] select-none"
            >
              {/* Background Target Band (70 - 180 mg/dL) */}
              <rect
                x={padding.left}
                y={targetBandTop}
                width={innerWidth}
                height={targetBandHeight}
                fill="#10b981"
                fillOpacity="0.08"
              />

              {/* Target lines */}
              {/* High target line (180 mg/dL) */}
              <line
                x1={padding.left}
                y1={targetBandTop}
                x2={padding.left + innerWidth}
                y2={targetBandTop}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={targetBandTop + 4}
                textAnchor="end"
                className="text-[10px] font-mono fill-slate-400"
              >
                180
              </text>

              {/* Low target line (70 mg/dL) */}
              <line
                x1={padding.left}
                y1={targetBandBottom}
                x2={padding.left + innerWidth}
                y2={targetBandBottom}
                stroke="#fca5a5"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={targetBandBottom + 4}
                textAnchor="end"
                className="text-[10px] font-mono fill-rose-500 font-semibold"
              >
                70
              </text>

              {/* Y Axis line */}
              <line
                x1={padding.left}
                y1={padding.top}
                x2={padding.left}
                y2={padding.top + innerHeight}
                stroke="#cbd5e1"
                strokeWidth="1"
              />

              {/* X Axis line */}
              <line
                x1={padding.left}
                y1={padding.top + innerHeight}
                x2={padding.left + innerWidth}
                y2={padding.top + innerHeight}
                stroke="#cbd5e1"
                strokeWidth="1"
              />

              {/* Connecting curve line */}
              {filteredData.glucose.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#0f766e"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={pointsString}
                />
              )}

              {/* Insulin dose indicators pinned to the bottom */}
              {filteredData.insulin.map((ins) => {
                const insX = getX(ins.timestamp);
                const isBasal = ins.type === 'basal';
                return (
                  <g key={ins.id}>
                    <line
                      x1={insX}
                      y1={padding.top + innerHeight}
                      x2={insX}
                      y2={padding.top + innerHeight - 12}
                      stroke={isBasal ? '#2563eb' : '#0d9488'}
                      strokeWidth="2"
                    />
                    <circle
                      cx={insX}
                      cy={padding.top + innerHeight - 14}
                      r="3"
                      fill={isBasal ? '#2563eb' : '#0d9488'}
                    />
                  </g>
                );
              })}

              {/* Data points */}
              {filteredData.glucose.map((log) => {
                const cx = getX(log.timestamp);
                const cy = getY(log.value);
                const isLow = log.value < profile.targetGlucoseMin;
                const isHigh = log.value > profile.targetGlucoseMax;
                const pointColor = isLow ? '#ef4444' : isHigh ? '#f59e0b' : '#10b981';

                // Look for nearby insulin shots within 1 hour
                const logTime = new Date(log.timestamp).getTime();
                const nearby = filteredData.insulin.filter(
                  (ins) => Math.abs(new Date(ins.timestamp).getTime() - logTime) <= 60 * 60 * 1000
                );

                return (
                  <g key={log.id} className="cursor-pointer">
                    <circle
                      cx={cx}
                      cy={cy}
                      r="4.5"
                      fill={pointColor}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      className="transition-transform hover:scale-150"
                      onMouseEnter={() =>
                        setHoveredPoint({
                          x: cx,
                          y: cy,
                          log,
                          nearbyInsulin: nearby,
                        })
                      }
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  </g>
                );
              })}

              {/* Date ticks on X axis */}
              {filteredData.glucose.length > 0 && (
                <>
                  <text
                    x={padding.left}
                    y={padding.top + innerHeight + 20}
                    className="text-[10px] font-mono fill-slate-500"
                  >
                    {filteredData.glucose[0]?.date}
                  </text>
                  <text
                    x={padding.left + innerWidth}
                    y={padding.top + innerHeight + 20}
                    textAnchor="end"
                    className="text-[10px] font-mono fill-slate-500"
                  >
                    {filteredData.glucose[filteredData.glucose.length - 1]?.date}
                  </text>
                </>
              )}
            </svg>

            {/* Hover Tooltip Box */}
            {hoveredPoint && (
              <div
                className="absolute z-10 pointer-events-none bg-slate-900 text-white rounded-lg p-3 text-xs shadow-xl border border-slate-700 font-sans"
                style={{
                  left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                  top: `${Math.max(10, (hoveredPoint.y / chartHeight) * 100 - 30)}%`,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <div className="font-semibold flex items-center justify-between gap-3">
                  <span className="font-mono text-sm text-teal-300">
                    {formatGlucoseValue(hoveredPoint.log.value, profile.unitPreference)}{' '}
                    {profile.unitPreference}
                  </span>
                  <span className="text-slate-400 capitalize">
                    {hoveredPoint.log.context.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  {hoveredPoint.log.date} · {hoveredPoint.log.time}
                </div>
                {hoveredPoint.log.carbs && (
                  <div className="text-[11px] text-slate-300">
                    Carbs: {hoveredPoint.log.carbs}g
                  </div>
                )}
                {hoveredPoint.log.notes && (
                  <div className="text-[11px] text-slate-400 italic mt-0.5">
                    "{hoveredPoint.log.notes}"
                  </div>
                )}
                {hoveredPoint.nearbyInsulin && hoveredPoint.nearbyInsulin.length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-700 text-[10px] text-teal-200">
                    {hoveredPoint.nearbyInsulin.map((ins) => (
                      <div key={ins.id}>
                        Shot: {ins.name} ({ins.units}u) at {ins.time}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ambulatory Glucose Profile (AGP) - Time In Range Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">
          Ambulatory Glucose Profile (Time in Range Breakdown)
        </h3>

        {/* Stacked Percentage Bar */}
        <div className="w-full h-8 rounded-lg overflow-hidden flex font-mono text-xs font-bold text-white shadow-xs">
          {/* Very Low (<54) */}
          {gStats.timeVeryLowPercent > 0 && (
            <div
              style={{ width: `${gStats.timeVeryLowPercent}%` }}
              className="bg-rose-700 flex items-center justify-center"
              title={`Very Low (< 54 mg/dL): ${gStats.timeVeryLowPercent}% (Goal < 1%)`}
            >
              {gStats.timeVeryLowPercent >= 3 && `${gStats.timeVeryLowPercent}%`}
            </div>
          )}
          {/* Low (54-69) */}
          {gStats.timeBelowPercent - gStats.timeVeryLowPercent > 0 && (
            <div
              style={{ width: `${gStats.timeBelowPercent - gStats.timeVeryLowPercent}%` }}
              className="bg-rose-500 flex items-center justify-center"
              title={`Low (54-69 mg/dL): ${gStats.timeBelowPercent - gStats.timeVeryLowPercent}% (Goal < 4%)`}
            >
              {gStats.timeBelowPercent - gStats.timeVeryLowPercent >= 3 &&
                `${gStats.timeBelowPercent - gStats.timeVeryLowPercent}%`}
            </div>
          )}
          {/* In Target (70-180) */}
          <div
            style={{ width: `${gStats.timeInRangePercent}%` }}
            className="bg-emerald-600 flex items-center justify-center"
            title={`In Target Range (70-180 mg/dL): ${gStats.timeInRangePercent}% (Goal > 70%)`}
          >
            {gStats.timeInRangePercent >= 10 && `${gStats.timeInRangePercent}%`}
          </div>
          {/* High (181-250) */}
          {gStats.timeAbovePercent - gStats.timeVeryHighPercent > 0 && (
            <div
              style={{ width: `${gStats.timeAbovePercent - gStats.timeVeryHighPercent}%` }}
              className="bg-amber-500 flex items-center justify-center"
              title={`High (181-250 mg/dL): ${gStats.timeAbovePercent - gStats.timeVeryHighPercent}% (Goal < 25%)`}
            >
              {gStats.timeAbovePercent - gStats.timeVeryHighPercent >= 3 &&
                `${gStats.timeAbovePercent - gStats.timeVeryHighPercent}%`}
            </div>
          )}
          {/* Very High (>250) */}
          {gStats.timeVeryHighPercent > 0 && (
            <div
              style={{ width: `${gStats.timeVeryHighPercent}%` }}
              className="bg-amber-700 flex items-center justify-center"
              title={`Very High (> 250 mg/dL): ${gStats.timeVeryHighPercent}% (Goal < 5%)`}
            >
              {gStats.timeVeryHighPercent >= 3 && `${gStats.timeVeryHighPercent}%`}
            </div>
          )}
        </div>

        {/* Legend with ADA Consensus targets */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100 text-xs">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              <span className="font-semibold text-slate-700">Low (&lt; 70)</span>
            </div>
            <div className="text-slate-500 mt-0.5">
              {gStats.timeBelowPercent}% · <span className="text-slate-400">Target &lt; 4%</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span className="font-semibold text-slate-700">In Target (70-180)</span>
            </div>
            <div className="text-slate-500 mt-0.5">
              {gStats.timeInRangePercent}% · <span className="text-slate-400">Target &gt; 70%</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="font-semibold text-slate-700">High (&gt; 180)</span>
            </div>
            <div className="text-slate-500 mt-0.5">
              {gStats.timeAbovePercent}% · <span className="text-slate-400">Target &lt; 25%</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
              <span className="font-semibold text-slate-700">Adherence</span>
            </div>
            <div className="text-slate-500 mt-0.5">
              {iStats.adherencePercent}% of scheduled doses taken
            </div>
          </div>
        </div>
      </div>

      {/* Context Breakdown Grid */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">
          Average Glucose by Time & Meal Context
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {contextAverages.map((item) => (
            <div key={item.context} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-[11px] font-medium text-slate-500 capitalize">
                {item.context.replace('_', ' ')}
              </div>
              <div className="mt-1 text-lg font-bold font-mono text-slate-900">
                {formatGlucoseValue(item.avg, profile.unitPreference)}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                {item.count} readings
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
