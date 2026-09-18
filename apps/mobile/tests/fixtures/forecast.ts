import type { Forecast } from '@emi/cycle';

import { listCycles } from '../../src/data/cycleRepository';
import { forecastOf } from '../../src/features/forecast/fromCache';
import type { RecordedSet } from '../../../../packages/cycle/tests/fixtures/recordedSets';
import { daysOf } from '../../../../packages/cycle/tests/fixtures/recordedSets';
import { daysLogged } from './cycleCache';

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
