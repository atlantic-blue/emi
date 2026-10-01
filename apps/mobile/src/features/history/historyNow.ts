import { PATTERN_WINDOW_CYCLES } from '@emi/cycle';

import { listCycles } from '../../data/cycleRepository';
import type { Database } from '../../data/database';
import { listDayLogs } from '../../data/dayLogRepository';
import type { DayVault } from '../../services/vault/dayVault';
import type { ReadCycle } from '../cycle/cyclesRead';
import { cyclesRead } from '../cycle/cyclesRead';
import type { ReadPattern } from '../cycle/patternsRead';
import { patternsNeedCycles, patternsRead } from '../cycle/patternsRead';

/**
 * What the history screen is handed, read out of the database in one pass. The screen draws this
 * and works nothing out for itself, so the cycles it lists and the patterns it names come from one
 * reading of the same rows.
 */

/** One cycle as she reads it back, which is the cycle the screen she opens draws as a strip. */
export type HistoryCycle = ReadCycle;

/** One symptom that came back, which is the pattern the screen she opens draws as a card. */
export type HistoryPattern = ReadPattern;

export interface History {
  /** Most recent first, because the cycle she is in is the one she came to read. */
  readonly cycles: readonly HistoryCycle[];
  readonly patterns: readonly HistoryPattern[];
  /** How many of her cycles are complete, which is what the waiting sentence counts. */
  readonly completeCycles: number;
}

/**
 * Her history as it stands now. The cycle she is in comes first, then the six complete cycles the
 * patterns were read from, which is the same window the forecast takes its median over.
 */
export function historyNow(db: Database, vault: DayVault): History {
  const cycles = listCycles(db);
  // The whole record, and not the part the cycle arithmetic reads: a pattern is made of the
  // symptoms and the moods, which no other reader of this table needs.
  const records = listDayLogs(db).map((row) => vault.open(row.payload));
  const complete = cycles.filter((cycle) => cycle.lengthDays !== null);
  // Read once, through the reader the screen she opens reads, so one cycle cannot be two shapes.
  const read = cyclesRead({ cycles, records });
  const shown = [
    ...read.filter((cycle) => cycle.lengthDays === null),
    ...read.filter((cycle) => cycle.lengthDays !== null).slice(0, PATTERN_WINDOW_CYCLES),
  ];

  return {
    cycles: shown,
    // The same reader the cards on the screen she opens read, so a symptom cannot be named at one
    // point in her cycle there and at another point here.
    patterns: patternsRead({ cycles, records }),
    completeCycles: complete.length,
  };
}

/** How many cycles Emi wants before it names anything, which the screen says while it waits. */
export const historyNeedsCycles = patternsNeedCycles;
