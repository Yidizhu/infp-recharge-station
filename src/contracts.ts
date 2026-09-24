/** Shared API v1. Only headquarters edits this file. */
export type Energy = 1 | 2 | 3 | 4 | 5;
export type Locale = 'zh-CN' | 'en';
export type LanguagePreference = 'system' | Locale;
export type Drain = 'social' | 'rumination' | 'tasks' | 'body' | 'unsure';
export type Duration = 1 | 3 | 10;
export type Recovery = 'detach' | 'relax' | 'control' | 'mastery' | 'connect' | 'meaning';
/** null means skipped/unknown, never a zero rating. */
export type Feedback = -1 | 0 | 1 | 2 | null;

export interface CheckIn { energy: Energy; drain: Drain; minutes: Duration }
export interface Activity {
  id: string;
  title: string;
  kind: Recovery;
  drains: Drain[];
  effort: 'low' | 'medium';
  environment: string;
  variants: Record<Duration, { intro: string; steps: string[] }>;
}
export interface SessionRecord {
  id: string;
  activityId: string;
  /** ISO 8601 timestamps; actualSeconds excludes pauses. */
  startedAt: string;
  endedAt: string;
  /** minutes is the chosen variant at start, including any pre-start shortening. */
  checkIn: CheckIn;
  actualSeconds: number;
  outcome: 'completed' | 'stopped';
  feedback: Feedback;
  note: string;
}
export interface AppData {
  version: 1;
  records: SessionRecord[];
  favorites: string[];
  theme: 'system' | 'light' | 'dark';
  /** Missing in older v1 backups means system. */
  language?: LanguagePreference;
}
export interface Insight { text: string; sampleSize: number }

export type Recommend = (
  checkIn: CheckIn, activities: Activity[], records: SessionRecord[], excludedIds?: string[],
) => Activity | null;
export type GetActivities = (locale: Locale) => Activity[];
export type GetInsights = (records: SessionRecord[], activities: Activity[], locale?: Locale) => Insight[];
export type LoadData = (locale?: Locale) => { data: AppData; warning?: string };
export type SaveData = (data: AppData, locale?: Locale) => { ok: boolean; warning?: string };
export type ExportData = (data: AppData, locale?: Locale) => string;
export type ParseImport = (json: string, locale?: Locale) => { data?: AppData; error?: string };

export interface ChargingAppProps {
  activities: Activity[];
  getActivities?: GetActivities;
  initialData: AppData;
  initialWarning?: string;
  recommend: Recommend;
  getInsights: GetInsights;
  saveData: SaveData;
  exportData: ExportData;
  parseImport: ParseImport;
}
