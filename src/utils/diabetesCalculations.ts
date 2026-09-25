import { GlucoseLog, InsulinLog, InjectionSite, UserProfile } from '../types/diabetes';

// Conversion between mg/dL and mmol/L
export const MG_DL_TO_MMOL_L = 18.0182;

export function formatGlucoseValue(valueInMgDl: number, unit: 'mg/dL' | 'mmol/L'): string {
  if (unit === 'mmol/L') {
    return (valueInMgDl / MG_DL_TO_MMOL_L).toFixed(1);
  }
  return Math.round(valueInMgDl).toString();
}

export function parseGlucoseInput(inputValue: number, unit: 'mg/dL' | 'mmol/L'): number {
  if (unit === 'mmol/L') {
    return Math.round(inputValue * MG_DL_TO_MMOL_L);
  }
  return Math.round(inputValue);
}

// Estimated A1C formula: eAG (mg/dL) = 28.7 * A1C - 46.7  =>  A1C = (eAG + 46.7) / 28.7
export function calculateEstimatedA1C(avgGlucoseMgDl: number): number {
  if (avgGlucoseMgDl <= 0) return 0;
  const a1c = (avgGlucoseMgDl + 46.7) / 28.7;
  return Number(a1c.toFixed(1));
}

export interface GlucoseStats {
  count: number;
  averageMgDl: number;
  estimatedA1C: number;
  minMgDl: number;
  maxMgDl: number;
  standardDeviation: number;
  coefficientOfVariation: number; // CV% = (SD / Mean) * 100
  timeInRangePercent: number; // 70 - 180 mg/dL
  timeBelowPercent: number; // < 70 mg/dL
  timeVeryLowPercent: number; // < 54 mg/dL
  timeAbovePercent: number; // > 180 mg/dL
  timeVeryHighPercent: number; // > 250 mg/dL
  hypoEventsCount: number; // readings < 70
}

export function calculateGlucoseStats(
  logs: GlucoseLog[],
  targetMin = 70,
  targetMax = 180
): GlucoseStats {
  if (logs.length === 0) {
    return {
      count: 0,
      averageMgDl: 0,
      estimatedA1C: 0,
      minMgDl: 0,
      maxMgDl: 0,
      standardDeviation: 0,
      coefficientOfVariation: 0,
      timeInRangePercent: 0,
      timeBelowPercent: 0,
      timeVeryLowPercent: 0,
      timeAbovePercent: 0,
      timeVeryHighPercent: 0,
      hypoEventsCount: 0,
    };
  }

  const values = logs.map((l) => l.value);
  const sum = values.reduce((acc, v) => acc + v, 0);
  const avg = sum / values.length;

  const min = Math.min(...values);
  const max = Math.max(...values);

  const variance =
    values.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / (values.length > 1 ? values.length - 1 : 1);
  const sd = Math.sqrt(variance);
  const cv = avg > 0 ? (sd / avg) * 100 : 0;

  const veryLowCount = values.filter((v) => v < 54).length;
  const belowCount = values.filter((v) => v >= 54 && v < targetMin).length;
  const inRangeCount = values.filter((v) => v >= targetMin && v <= targetMax).length;
  const aboveCount = values.filter((v) => v > targetMax && v <= 250).length;
  const veryHighCount = values.filter((v) => v > 250).length;

  const total = values.length;
  const hypoEventsCount = values.filter((v) => v < targetMin).length;

  return {
    count: total,
    averageMgDl: Math.round(avg),
    estimatedA1C: calculateEstimatedA1C(avg),
    minMgDl: min,
    maxMgDl: max,
    standardDeviation: Math.round(sd),
    coefficientOfVariation: Number(cv.toFixed(1)),
    timeInRangePercent: Math.round((inRangeCount / total) * 100),
    timeBelowPercent: Math.round(((veryLowCount + belowCount) / total) * 100),
    timeVeryLowPercent: Math.round((veryLowCount / total) * 100),
    timeAbovePercent: Math.round(((aboveCount + veryHighCount) / total) * 100),
    timeVeryHighPercent: Math.round((veryHighCount / total) * 100),
    hypoEventsCount,
  };
}

export interface InsulinStats {
  totalUnits: number;
  avgDailyTotalDose: number;
  avgDailyBasal: number;
  avgDailyBolus: number;
  basalPercentage: number;
  bolusPercentage: number;
  adherencePercent: number;
  daysCount: number;
}

export function calculateInsulinStats(
  insulinLogs: InsulinLog[],
  scheduledCountPerDay: number,
  daysCount = 14
): InsulinStats {
  const takenLogs = insulinLogs.filter((l) => l.status === 'taken');
  const totalUnits = takenLogs.reduce((acc, l) => acc + l.units, 0);

  // Group by date
  const dateMap: Record<string, { basal: number; bolus: number; total: number; count: number }> = {};

  takenLogs.forEach((log) => {
    if (!dateMap[log.date]) {
      dateMap[log.date] = { basal: 0, bolus: 0, total: 0, count: 0 };
    }
    dateMap[log.date].total += log.units;
    dateMap[log.date].count += 1;
    if (log.type === 'basal' || log.type === 'intermediate') {
      dateMap[log.date].basal += log.units;
    } else {
      dateMap[log.date].bolus += log.units;
    }
  });

  const uniqueDays = Object.keys(dateMap).length || 1;
  const divisor = Math.max(uniqueDays, 1);

  const totalBasal = Object.values(dateMap).reduce((acc, d) => acc + d.basal, 0);
  const totalBolus = Object.values(dateMap).reduce((acc, d) => acc + d.bolus, 0);

  const avgTDD = totalUnits / divisor;
  const avgBasal = totalBasal / divisor;
  const avgBolus = totalBolus / divisor;

  const basalPct = avgTDD > 0 ? Math.round((avgBasal / avgTDD) * 100) : 50;
  const bolusPct = 100 - basalPct;

  // Adherence
  const totalExpected = scheduledCountPerDay * Math.max(daysCount, 1);
  const adherence = totalExpected > 0 ? Math.min(100, Math.round((takenLogs.length / totalExpected) * 100)) : 100;

  return {
    totalUnits: Math.round(totalUnits),
    avgDailyTotalDose: Number(avgTDD.toFixed(1)),
    avgDailyBasal: Number(avgBasal.toFixed(1)),
    avgDailyBolus: Number(avgBolus.toFixed(1)),
    basalPercentage: basalPct,
    bolusPercentage: bolusPct,
    adherencePercent: adherence,
    daysCount: uniqueDays,
  };
}

// Recommended injection site rotation order
export const ROTATION_SITES: InjectionSite[] = [
  'abdomen_ur',
  'abdomen_lr',
  'abdomen_ll',
  'abdomen_ul',
  'thigh_r',
  'thigh_l',
  'arm_r',
  'arm_l',
];

export function getNextRecommendedSite(lastLogs: InsulinLog[]): InjectionSite {
  if (lastLogs.length === 0) return 'abdomen_ur';
  const lastSite = lastLogs[0]?.site;
  const lastIdx = ROTATION_SITES.indexOf(lastSite);
  if (lastIdx === -1 || lastIdx === ROTATION_SITES.length - 1) {
    return ROTATION_SITES[0];
  }
  return ROTATION_SITES[lastIdx + 1];
}

// Gentle reminder chime using Web Audio API
export function playReminderChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Two pleasant bell notes (E5, G#5)
    const now = ctx.currentTime;
    const playNote = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    };

    playNote(659.25, now, 0.4); // E5
    playNote(830.61, now + 0.15, 0.6); // G#5
  } catch {
    // Audio context may be restricted before user gesture
  }
}

// Export CSV generator
export function generateDoctorReportCSV(
  glucoseLogs: GlucoseLog[],
  insulinLogs: InsulinLog[],
  profile: UserProfile
): string {
  const rows: string[] = [];

  // Header meta
  rows.push(`"DIABETIC TRACKER REPORT - NON-CHEMX"`);
  rows.push(`"Patient:","${profile.name}","DOB:","${profile.dob}","MRN:","${profile.mrn}"`);
  rows.push(`"Physician:","${profile.physicianName}","Clinic:","${profile.clinicName}"`);
  rows.push(`"Report Generated:","${new Date().toLocaleString()}"`);
  rows.push(`"Target Range:","${profile.targetGlucoseMin} - ${profile.targetGlucoseMax} mg/dL"`);
  rows.push(``);

  // Table columns
  rows.push(`"Date","Time","Record Type","Glucose (mg/dL)","Insulin Brand","Insulin Type","Units","Injection Site","Meal/Context","Notes"`);

  // Combine and sort chronologically descending
  type CombinedItem =
    | { kind: 'glucose'; data: GlucoseLog }
    | { kind: 'insulin'; data: InsulinLog };

  const combined: CombinedItem[] = [
    ...glucoseLogs.map((g) => ({ kind: 'glucose' as const, data: g })),
    ...insulinLogs.map((i) => ({ kind: 'insulin' as const, data: i })),
  ];

  combined.sort((a, b) => new Date(b.data.timestamp).getTime() - new Date(a.data.timestamp).getTime());

  combined.forEach((item) => {
    if (item.kind === 'glucose') {
      const g = item.data;
      rows.push(
        `"${g.date}","${g.time}","Glucose","${g.value}","","","","","${g.context}","${(g.notes || '').replace(/"/g, '""')}"`
      );
    } else {
      const ins = item.data;
      rows.push(
        `"${ins.date}","${ins.time}","Insulin Shot","","${ins.insulinBrand}","${ins.type}","${ins.units}","${ins.site}","${ins.status}","${(ins.notes || '').replace(/"/g, '""')}"`
      );
    }
  });

  return rows.join('\r\n');
}
