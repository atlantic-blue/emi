import type { DayRecord } from '@emi/cycle';

import type { Database } from '../../src/data/database';
import { migrate } from '../../src/data/schema';
import { logDay } from '../../src/features/cycle/rebuild';
import { openTestDatabase } from '../data/nodeDatabase';
import { decodeDay, encodeDay } from './dayPayload';

/** A stored day is an envelope, so reading one is opening it. */
export const readDay = decodeDay;

export function migratedDatabase(): Database {
  const database = openTestDatabase();
  migrate(database);
  return database;
}

/** Her days, written the way a screen writes them: one at a time, each write rebuilding the cache. */
export function daysLogged(days: readonly DayRecord[], now: Date): Database {
  const database = migratedDatabase();
  for (const day of days) {
    logDay(database, { day: day.day, payload: encodeDay(day), now }, readDay);
  }
  return database;
}
