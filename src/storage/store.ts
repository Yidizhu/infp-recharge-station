import type { AppData, ExportData, LoadData, ParseImport, SaveData, Locale } from '../contracts';

const message = (locale: Locale, zh: string, en: string) => locale === 'en' ? en : zh;

export const STORAGE_KEY = 'infp-charging:data';
const MAX_JSON_LENGTH = 2_000_000;
const emptyData = (): AppData => ({ version: 1, records: [], favorites: [], theme: 'system' });
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const id = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
const timestamp = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
};

function validate(value: unknown, locale: Locale): string | undefined {
  if (!object(value)) return message(locale, '数据必须是对象。', 'Data must be an object.');
  if (value.version !== 1) return message(locale, '不支持此数据版本；当前只支持 version: 1，请保留原文件。', 'Unsupported data version. Only version: 1 is supported. Keep the original file.');
  const keys = ['version', 'records', 'favorites', 'theme'];
  if (Object.hasOwn(value, 'language')) keys.push('language');
  if (!exactKeys(value, keys)) return message(locale, '数据字段缺失或包含未知字段。', 'Data has missing or unknown fields.');
  if (Object.hasOwn(value, 'language') && !['system', 'zh-CN', 'en'].includes(value.language as string)) return message(locale, '语言字段不合法。', 'Invalid language preference.');
  if (!['system', 'light', 'dark'].includes(value.theme as string)) return message(locale, '主题字段不合法。', 'Invalid theme.');
  if (!Array.isArray(value.favorites) || value.favorites.length > 1000
    || !value.favorites.every(id) || new Set(value.favorites).size !== value.favorites.length) return message(locale, '收藏须为不重复的动作 ID 数组，最多 1000 项。', 'Favorites must be an array of unique activity IDs, with at most 1,000 items.');
  if (!Array.isArray(value.records) || value.records.length > 10000) return message(locale, '记录须为数组，最多 10000 条。', 'Records must be an array with at most 10,000 entries.');
  const ids = new Set<string>();
  for (let index = 0; index < value.records.length; index++) {
    const record: unknown = value.records[index];
    const error = message(locale, `第 ${index + 1} 条记录字段不合法。`, `Record ${index + 1} has invalid fields.`);
    if (!object(record) || !exactKeys(record, ['id', 'activityId', 'startedAt', 'endedAt', 'checkIn', 'actualSeconds', 'outcome', 'feedback', 'note'])) return error;
    if (!id(record.id) || ids.has(record.id) || !id(record.activityId)) return error;
    ids.add(record.id);
    if (!timestamp(record.startedAt) || !timestamp(record.endedAt)) return error + message(locale, '时间须为有效的 UTC ISO 格式（含毫秒）。', ' Timestamps must use valid UTC ISO format with milliseconds.');
    const elapsed = (Date.parse(record.endedAt) - Date.parse(record.startedAt)) / 1000;
    if (elapsed < 0 || typeof record.actualSeconds !== 'number' || !Number.isFinite(record.actualSeconds)
      || record.actualSeconds < 0 || record.actualSeconds > elapsed + 1) return error + message(locale, '实际时长不能为负或超过起止间隔（容许 1 秒取整误差）。', ' Actual duration must be nonnegative and within the start/end interval, allowing one second for rounding.');
    if (!object(record.checkIn) || !exactKeys(record.checkIn, ['energy', 'drain', 'minutes'])
      || ![1, 2, 3, 4, 5].includes(record.checkIn.energy as number)
      || !['social', 'rumination', 'tasks', 'body', 'unsure'].includes(record.checkIn.drain as string)
      || ![1, 3, 10].includes(record.checkIn.minutes as number)) return error;
    if (!['completed', 'stopped'].includes(record.outcome as string)
      || ![-1, 0, 1, 2, null].some(feedback => record.feedback === feedback)
      || typeof record.note !== 'string' || record.note.length > 2000) return error;
  }
}

export const parseImport: ParseImport = (json, locale = 'zh-CN') => {
  if (typeof json !== 'string' || json.length > MAX_JSON_LENGTH) return { error: message(locale, '数据文本过大（最多 200 万字符）或格式不合法。', 'Data text is too large (maximum 2 million characters) or has an invalid format.') };
  let value: unknown;
  try { value = JSON.parse(json); } catch { return { error: message(locale, '无法解析 JSON，请保留原文件并检查内容。', 'Cannot parse JSON. Keep the original file and check its contents.') }; }
  const error = validate(value, locale);
  return error ? { error } : { data: value as AppData };
};

export const loadData: LoadData = (locale = 'zh-CN') => {
  try {
    const json = globalThis.localStorage.getItem(STORAGE_KEY);
    if (json === null) return { data: emptyData() };
    const parsed = parseImport(json, locale);
    return parsed.data ? { data: parsed.data } : { data: emptyData(), warning: message(locale, `本地数据未加载：${parsed.error}原数据未修改；保存新数据会覆盖原数据，请先保留原数据。`, `Local data was not loaded: ${parsed.error} The original data is unchanged. Saving new data will overwrite it; preserve the original first.`) };
  } catch {
    return { data: emptyData(), warning: message(locale, '无法读取本地存储。当前可临时使用，关闭页面可能丢失记录，请导出备份。', 'Cannot read local storage. You can use this page temporarily, but records may be lost when you close it. Export a backup.') };
  }
};

export const exportData: ExportData = (data, locale = 'zh-CN') => {
  const error = validate(data, locale);
  if (error) throw new Error(error);
  const json = JSON.stringify(data, null, 2);
  if (json.length > MAX_JSON_LENGTH) throw new Error(message(locale, '数据文本过大（最多 200 万字符），未导出或保存。', 'Data text exceeds 2 million characters. Nothing was exported or saved.'));
  return json;
};

export const saveData: SaveData = (data, locale = 'zh-CN') => {
  let json: string;
  try { json = exportData(data, locale); }
  catch (error) { return { ok: false, warning: error instanceof Error ? error.message : message(locale, '数据不合法，未保存。', 'Invalid data. Nothing was saved.') }; }
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, json);
    return { ok: true };
  } catch {
    return { ok: false, warning: message(locale, '本地保存失败，可能空间不足或存储被禁用。请导出备份，暂勿关闭页面。', 'Could not save locally. Storage may be full or disabled. Export a backup before closing this page.') };
  }
};
