import { GlucoseLog, InsulinLog, InsulinScheduleItem, UserProfile } from '../types/diabetes';

export const INITIAL_USER_PROFILE: UserProfile = {
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

export const INITIAL_PROFILE = INITIAL_USER_PROFILE;

export const INITIAL_SCHEDULE: InsulinScheduleItem[] = [
  {
    id: 'sched-1',
    name: 'Morning Basal (Lantus)',
    targetTime: '07:30',
    type: 'basal',
    insulinBrand: 'Lantus (Glargine)',
    defaultUnits: 16,
    enabled: true,
    reminderActive: true,
  },
  {
    id: 'sched-2',
    name: 'Breakfast Bolus (Humalog)',
    targetTime: '08:30',
    type: 'bolus',
    insulinBrand: 'Humalog (Lispro)',
    defaultUnits: 6,
    enabled: true,
    reminderActive: true,
  },
  {
    id: 'sched-3',
    name: 'Lunch Bolus (Humalog)',
    targetTime: '12:30',
    type: 'bolus',
    insulinBrand: 'Humalog (Lispro)',
    defaultUnits: 8,
    enabled: true,
    reminderActive: true,
  },
  {
    id: 'sched-4',
    name: 'Dinner Bolus (Humalog)',
    targetTime: '18:45',
    type: 'bolus',
    insulinBrand: 'Humalog (Lispro)',
    defaultUnits: 10,
    enabled: true,
    reminderActive: true,
  },
  {
    id: 'sched-5',
    name: 'Bedtime Check / Basal split',
    targetTime: '22:30',
    type: 'correction',
    insulinBrand: 'Humalog (Lispro)',
    defaultUnits: 2,
    enabled: false, // Optional bedtime correction slot
    reminderActive: false,
  },
];

// Generate rich, clinically realistic past 14 days of data leading up to today
export function generateSampleLogs(): { glucoseLogs: GlucoseLog[]; insulinLogs: InsulinLog[] } {
  const glucoseLogs: GlucoseLog[] = [];
  const insulinLogs: InsulinLog[] = [];

  const sites = [
    'abdomen_ur',
    'abdomen_lr',
    'abdomen_ll',
    'abdomen_ul',
    'thigh_r',
    'thigh_l',
    'arm_r',
    'arm_l',
  ] as const;

  const now = new Date();

  // 14 days back
  for (let d = 13; d >= 0; d--) {
    const dayDate = new Date(now);
    dayDate.setDate(now.getDate() - d);
    const dateStr = dayDate.toISOString().slice(0, 10);
    const isToday = d === 0;

    // Fasting morning glucose (07:15)
    // Values typically 90 - 135
    const fastingVal = Math.floor(92 + (Math.sin(d * 1.3) * 18 + Math.random() * 20));
    glucoseLogs.push({
      id: `gl-fast-${d}`,
      timestamp: `${dateStr}T07:15:00.000Z`,
      date: dateStr,
      time: '07:15',
      value: fastingVal,
      context: 'fasting',
      notes: fastingVal > 125 ? 'Dawn phenomenon noted' : undefined,
    });

    // Morning Basal shot (07:30)
    // If today, mark taken only if current hour > 7
    const morningTaken = !isToday || now.getHours() >= 8;
    if (morningTaken) {
      insulinLogs.push({
        id: `ins-basal-${d}`,
        scheduleId: 'sched-1',
        timestamp: `${dateStr}T07:30:00.000Z`,
        date: dateStr,
        time: '07:30',
        name: 'Morning Basal (Lantus)',
        type: 'basal',
        insulinBrand: 'Lantus (Glargine)',
        units: 16,
        site: sites[(d * 4) % sites.length],
        status: 'taken',
        notes: 'Routine morning long-acting',
      });
    }

    // Breakfast Bolus (08:30)
    const breakfastTaken = !isToday || now.getHours() >= 9;
    if (breakfastTaken) {
      insulinLogs.push({
        id: `ins-bkfast-${d}`,
        scheduleId: 'sched-2',
        timestamp: `${dateStr}T08:35:00.000Z`,
        date: dateStr,
        time: '08:35',
        name: 'Breakfast Bolus (Humalog)',
        type: 'bolus',
        insulinBrand: 'Humalog (Lispro)',
        units: 6,
        site: sites[(d * 4 + 1) % sites.length],
        status: 'taken',
        notes: 'Oatmeal & blueberries (~45g carbs)',
      });

      // Post-breakfast glucose (10:30)
      const postBVal = Math.floor(130 + (Math.cos(d * 0.9) * 22 + Math.random() * 25));
      glucoseLogs.push({
        id: `gl-post-b-${d}`,
        timestamp: `${dateStr}T10:30:00.000Z`,
        date: dateStr,
        time: '10:30',
        value: postBVal,
        context: 'post_meal',
        carbs: 45,
      });
    }

    // Pre-Lunch glucose (12:15)
    if (!isToday || now.getHours() >= 12) {
      const preLunchVal = Math.floor(105 + (Math.sin(d * 2.1) * 15 + Math.random() * 18));
      glucoseLogs.push({
        id: `gl-pre-l-${d}`,
        timestamp: `${dateStr}T12:15:00.000Z`,
        date: dateStr,
        time: '12:15',
        value: preLunchVal,
        context: 'pre_meal',
      });
    }

    // Lunch Bolus (12:30)
    const lunchTaken = !isToday || now.getHours() >= 13;
    if (lunchTaken) {
      insulinLogs.push({
        id: `ins-lunch-${d}`,
        scheduleId: 'sched-3',
        timestamp: `${dateStr}T12:35:00.000Z`,
        date: dateStr,
        time: '12:35',
        name: 'Lunch Bolus (Humalog)',
        type: 'bolus',
        insulinBrand: 'Humalog (Lispro)',
        units: 8,
        site: sites[(d * 4 + 2) % sites.length],
        status: 'taken',
        notes: 'Turkey wrap and salad (~55g carbs)',
      });

      // Post-lunch glucose (14:45)
      const postLVal = Math.floor(142 + (Math.sin(d * 1.7) * 24 + Math.random() * 20));
      glucoseLogs.push({
        id: `gl-post-l-${d}`,
        timestamp: `${dateStr}T14:45:00.000Z`,
        date: dateStr,
        time: '14:45',
        value: postLVal,
        context: 'post_meal',
        carbs: 55,
      });
    }

    // Dinner Bolus (18:45)
    const dinnerTaken = !isToday || now.getHours() >= 19;
    if (dinnerTaken) {
      // Occasional high reading or adjusted units
      const dinnerUnits = d === 3 ? 12 : 10;
      insulinLogs.push({
        id: `ins-dinner-${d}`,
        scheduleId: 'sched-4',
        timestamp: `${dateStr}T18:50:00.000Z`,
        date: dateStr,
        time: '18:50',
        name: 'Dinner Bolus (Humalog)',
        type: 'bolus',
        insulinBrand: 'Humalog (Lispro)',
        units: dinnerUnits,
        site: sites[(d * 4 + 3) % sites.length],
        status: 'taken',
        notes: 'Salmon, brown rice & steamed broccoli (~65g carbs)',
      });

      // Post-dinner glucose (21:00)
      // One mild hypo on day 4 (68 mg/dL) for clinical realism
      const postDVal = d === 4 ? 68 : Math.floor(138 + (Math.cos(d * 1.5) * 28 + Math.random() * 22));
      glucoseLogs.push({
        id: `gl-post-d-${d}`,
        timestamp: `${dateStr}T21:00:00.000Z`,
        date: dateStr,
        time: '21:00',
        value: postDVal,
        context: 'post_meal',
        carbs: 65,
        notes: d === 4 ? 'Mild low treated with 15g apple juice' : undefined,
      });
    }

    // Bedtime check (22:45)
    if (!isToday || now.getHours() >= 23) {
      const bedtimeVal = Math.floor(118 + (Math.sin(d * 0.8) * 16 + Math.random() * 15));
      glucoseLogs.push({
        id: `gl-bed-${d}`,
        timestamp: `${dateStr}T22:45:00.000Z`,
        date: dateStr,
        time: '22:45',
        value: bedtimeVal,
        context: 'bedtime',
      });
    }
  }

  return { glucoseLogs, insulinLogs };
}
