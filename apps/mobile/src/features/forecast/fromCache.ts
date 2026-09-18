import type { Cycle, ForecastResult } from '@emi/cycle';
import { forecastFrom } from '@emi/cycle';

import type { CycleRow } from '../../data/cycleRepository';

/**
 * The cache rows, read back as the cycles the arithmetic produced. The cache adds an identifier and
 * a predicted marker, and neither of those is arithmetic, so neither travels back.
 */
export function cyclesOf(rows: readonly CycleRow[]): Cycle[] {
  return rows
    .filter((row) => !row.isPredicted)
    .map((row) => ({
      startedOn: row.startedOn,
      endedOn: row.endedOn,
      lengthDays: row.lengthDays,
      periodDays: row.periodLengthDays,
    }));
}

/** A forecast from what the cache holds, which is what every screen reads. */
export function forecastOf(rows: readonly CycleRow[]): ForecastResult {
  return forecastFrom(cyclesOf(rows));
}
