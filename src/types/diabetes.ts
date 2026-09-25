export type InsulinType = 'basal' | 'bolus' | 'correction' | 'intermediate';

export type InjectionSite =
  | 'abdomen_ur'
  | 'abdomen_ul'
  | 'abdomen_lr'
  | 'abdomen_ll'
  | 'thigh_r'
  | 'thigh_l'
  | 'arm_r'
  | 'arm_l'
  | 'buttock_r'
  | 'buttock_l';

export const INJECTION_SITE_LABELS: Record<InjectionSite, string> = {
  abdomen_ur: 'Abdomen (Upper Right)',
  abdomen_ul: 'Abdomen (Upper Left)',
  abdomen_lr: 'Abdomen (Lower Right)',
  abdomen_ll: 'Abdomen (Lower Left)',
  thigh_r: 'Thigh (Right)',
  thigh_l: 'Thigh (Left)',
  arm_r: 'Upper Arm (Right)',
  arm_l: 'Upper Arm (Left)',
  buttock_r: 'Buttock (Right)',
  buttock_l: 'Buttock (Left)',
};

export interface InsulinScheduleItem {
  id: string;
  name: string; // e.g. "Morning Basal", "Breakfast Bolus"
  targetTime: string; // "07:30" (24h)
  type: InsulinType;
  insulinBrand: string; // e.g. "Lantus", "Humalog", "Tresiba", "Novolog"
  defaultUnits: number;
  enabled: boolean;
  reminderActive: boolean;
}

export interface InsulinLog {
  id: string;
  scheduleId?: string;
  timestamp: string; // ISO string
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  name: string;
  type: InsulinType;
  insulinBrand: string;
  units: number;
  site: InjectionSite;
  status: 'taken' | 'skipped' | 'snoozed';
  notes?: string;
}

export type GlucoseContext =
  | 'fasting'
  | 'pre_meal'
  | 'post_meal'
  | 'bedtime'
  | 'night'
  | 'random';

export const GLUCOSE_CONTEXT_LABELS: Record<GlucoseContext, string> = {
  fasting: 'Fasting (Morning)',
  pre_meal: 'Before Meal',
  post_meal: 'After Meal (2 hrs)',
  bedtime: 'Bedtime',
  night: 'Overnight (3 AM)',
  random: 'Random / Check',
};

export interface GlucoseLog {
  id: string;
  timestamp: string; // ISO string
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  value: number; // Stored in mg/dL always internally
  context: GlucoseContext;
  carbs?: number; // In grams
  notes?: string;
}

export interface UserProfile {
  name: string;
  dob: string;
  mrn: string; // Medical Record Number
  physicianName: string;
  clinicName: string;
  targetGlucoseMin: number; // default 70 mg/dL
  targetGlucoseMax: number; // default 180 mg/dL
  unitPreference: 'mg/dL' | 'mmol/L';
  reminderSound: boolean;
  physicianNotes: string;
}

export interface DayTask {
  schedule: InsulinScheduleItem;
  log?: InsulinLog;
  isTaken: boolean;
  isSkipped: boolean;
  isSnoozed: boolean;
  suggestedSite: InjectionSite;
}
