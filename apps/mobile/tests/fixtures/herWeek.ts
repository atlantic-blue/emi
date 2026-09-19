import { listCycles } from '../../src/data/cycleRepository';
import type { Database } from '../../src/data/database';
import { recordedDays } from '../../src/features/cycle/rebuild';
import { forecastOf } from '../../src/features/forecast/fromCache';
import { type StripDay, weekEndingOn } from '../../src/features/home/weekStrip';
import { readDay } from './cycleCache';

/**
 * The week strip the home screen is handed, built from a database the way the route builds it. A
 * test that renders the screen for another reason still gets the strip she would see.
 */
export function herWeek(database: Database, today: string): StripDay[] {
  const cycles = listCycles(database);

  return weekEndingOn({
    cycles,
    records: recordedDays(database, readDay),
    forecast: forecastOf(cycles),
    today,
  });
}
