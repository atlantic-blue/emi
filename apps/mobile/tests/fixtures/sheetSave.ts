import type { Database } from '../../src/data/database';
import { readDayLog } from '../../src/data/dayLogRepository';
import { editDay, logDay } from '../../src/features/cycle/rebuild';
import type { LogSheetEntry } from '../../src/features/log/LogSheet';
import type { DayRecord } from './dayRecord';
import { herVault } from './herVault';

/**
 * The write the screen hosting the log sheet performs. The sheet never reaches the database
 * itself, so this stands in for that screen until it is built, and every test that presses save
 * writes the same way she will.
 */
export function recordFromEntry(entry: LogSheetEntry, pressedSaveAt: Date): DayRecord {
  return {
    day: entry.day,
    // An empty list is left out rather than written, so a day she cleared holds nothing at all.
    ...(entry.symptoms.length > 0 ? { symptoms: entry.symptoms } : {}),
    ...(entry.moods.length > 0 ? { moods: entry.moods } : {}),
    ...(entry.energy === undefined ? {} : { energy: entry.energy }),
    ...(entry.temperatureCelsius === undefined
      ? {}
      : { temperatureCelsius: entry.temperatureCelsius }),
    ...(entry.weightKilograms === undefined ? {} : { weightKilograms: entry.weightKilograms }),
    recordedAt: pressedSaveAt.toISOString(),
  };
}

/** Every write goes through the rebuild module, so the cycle cache is rebuilt from the whole log. */
export function savesInto(database: Database, pressedSaveAt: Date): (entry: LogSheetEntry) => void {
  return (entry) => {
    const vault = herVault();
    const payload = vault.seal(recordFromEntry(entry, pressedSaveAt));
    const write = { day: entry.day, payload, now: pressedSaveAt };
    if (readDayLog(database, entry.day)) {
      editDay(database, write, vault.open);
    } else {
      logDay(database, write, vault.open);
    }
  };
}
