import { type DayRecord, recordBytes, recordFromBytes } from '@emi/crypto';

import type { Database } from '../../src/data/database';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import { logDay } from '../../src/features/cycle/rebuild';
import { defaultCycleLengthDays } from '../../src/features/onboarding/firstRun';
import { openDatabaseSync } from '../data/expoSqlite';

/**
 * The phone a rendered test drives. The application opens its own database by name, so a test
 * reads and seeds through the same name rather than through a database of its own, and every day
 * is written the way a screen writes it: one at a time, each write rebuilding the cycle cache.
 */

export function herDatabase(): Database {
  return expoDatabase(openDatabaseSync(databaseFileName));
}

/** Her clock's day, read the way the screen reads it rather than by the screen's own arithmetic. */
export function dayOf(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/** A day she bled, at the middle value, which is the value her first run writes for her too. */
export function aBleedingDay(day: string): DayRecord {
  return { day, flow: 'medium', recordedAt: `${day}T08:00:00.000Z` };
}

/**
 * Her phone before she opens it: the days she recorded, and the two answers the first run wrote.
 * Without those answers the application sends her back to the first run and she never reaches the
 * screen under test.
 */
export function herPhoneHolds(
  firstRunFinishedAt: Date,
  records: readonly DayRecord[],
  cycleLengthDays: number = defaultCycleLengthDays,
): void {
  const database = herDatabase();
  migrate(database);

  for (const record of records) {
    const when = new Date(record.recordedAt);
    logDay(database, { day: record.day, payload: recordBytes(record), now: when }, recordFromBytes);
  }

  writeSetting(database, 'cycleLengthDays', String(cycleLengthDays));
  writeSetting(database, 'firstRunCompletedAt', firstRunFinishedAt.toISOString());
}
