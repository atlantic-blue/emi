import type { Database } from './database';

/** Local only. Nothing here syncs, because none of it is a fact she entered about her body. */
export type SettingKey =
  | 'articleAnswer'
  | 'cycleLengthDays'
  | 'firstRunCompletedAt'
  | 'lockOnReturn'
  | 'temperatureUnit'
  | 'tourSeenAt'
  | 'weightUnit';

export const settingKeys: readonly SettingKey[] = [
  'articleAnswer',
  'cycleLengthDays',
  'firstRunCompletedAt',
  'lockOnReturn',
  'temperatureUnit',
  'tourSeenAt',
  'weightUnit',
];

export type SettingRefusal = 'value-is-empty';

export class SettingError extends Error {
  readonly refusal: SettingRefusal;

  constructor(refusal: SettingRefusal, message: string) {
    super(message);
    this.name = 'SettingError';
    this.refusal = refusal;
  }
}

export function writeSetting(db: Database, key: SettingKey, value: string): void {
  if (value.length === 0) {
    throw new SettingError('value-is-empty', `${key} was written with no value`);
  }

  db.run(
    `INSERT INTO setting (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

export function readSetting(db: Database, key: SettingKey): string | undefined {
  return db.all<{ value: string }>('SELECT value FROM setting WHERE key = ?', [key])[0]?.value;
}

export function readSettings(db: Database): Partial<Record<SettingKey, string>> {
  const held: Partial<Record<SettingKey, string>> = {};
  for (const row of db.all<{ key: SettingKey; value: string }>('SELECT key, value FROM setting')) {
    held[row.key] = row.value;
  }
  return held;
}
