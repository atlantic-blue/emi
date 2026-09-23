import type { Forecast, ForecastResult } from '@emi/cycle';

import { listCycles } from '../../src/data/cycleRepository';
import type { Database } from '../../src/data/database';
import { forecastOf } from '../../src/features/forecast/fromCache';
import { completeFirstRun } from '../../src/features/onboarding/firstRun';
import { logDay } from '../../src/features/cycle/rebuild';
import type { RecordedSet } from '../../../../packages/cycle/tests/fixtures/recordedSets';
import { daysOf } from '../../../../packages/cycle/tests/fixtures/recordedSets';
import { daysLogged, migratedDatabase, readDay } from './cycleCache';
import { encodeDay } from './dayPayload';
import { herProfileVault, herVault } from './herVault';

export const recordedAt = new Date('2026-09-17T08:00:00.000Z');

/**
 * Her days written the way a screen writes them, and read back the way a screen reads them: through
 * the day log, the rebuilt cache and the arithmetic, rather than from a forecast typed out here.
 */
export function forecastFromRecorded(set: RecordedSet): Forecast {
  const database = daysLogged(daysOf(set), recordedAt);
  const forecast = forecastOf(listCycles(database));

  if (forecast.kind !== 'forecast') {
    throw new Error(`${set.lengths.length} recorded cycles left the forecast still learning`);
  }

  return forecast;
}

/** Noon, so the day a write is stamped with is the same day whichever way the clock is set. */
export function atNoonOn(day: string): Date {
  return new Date(`${day}T12:00:00.000Z`);
}

/**
 * Her database as it stands after the first run and every day she logged since, which is the only
 * way the stated cycle length reaches her profile. The first run writes the day she gave, so the
 * rest of the set is logged behind it, one day at a time, each write stamped on the day it happened.
 */
export function asSheLoggedIt(set: RecordedSet, cycleLengthDays: number): Database {
  const days = daysOf(set);
  const [firstDay, ...rest] = days;

  if (firstDay === undefined) {
    throw new Error('a recorded set has at least the day her first period started');
  }

  const database = migratedDatabase();
  completeFirstRun(
    database,
    { day: herVault(), profile: herProfileVault() },
    { periodStartedOn: firstDay.day, cycleLengthDays },
    atNoonOn(firstDay.day),
  );

  for (const day of rest) {
    logDay(database, { day: day.day, payload: encodeDay(day), now: atNoonOn(day.day) }, readDay);
  }

  return database;
}

/** What a screen is handed: a forecast, or the reason there is not one yet. */
export function forecastResultFromRecorded(set: RecordedSet): ForecastResult {
  const database = daysLogged(daysOf(set), recordedAt);

  return forecastOf(listCycles(database));
}
