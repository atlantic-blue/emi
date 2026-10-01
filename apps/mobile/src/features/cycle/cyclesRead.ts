import type { DayRecord } from '@emi/crypto';
import type { PhaseSpan } from '@emi/tokens';

import type { CycleRow } from '../../data/cycleRepository';

/**
 * Her cycles as a screen reads them back, each with the four arcs that colour it.
 *
 * Two screens draw the same cycle: the Insights screen as a row, and the screen she opens as a
 * strip. They stand on this one reader, so neither of them can divide a cycle its own way.
 */

export interface ReadCycle {
  readonly startedOn: string;
  readonly endedOn: string | null;
  readonly lengthDays: number | null;
  readonly periodLengthDays: number | null;
  /** The four arcs of that cycle, so a bar can carry its colour without carrying any text on it. */
  readonly phases: readonly PhaseSpan[];
}

export interface CyclesReadFrom {
  readonly cycles: readonly CycleRow[];
  /** Her days, which close the period of a cycle the cache has not closed yet. */
  readonly records: readonly DayRecord[];
}

export function cyclesRead(_from: CyclesReadFrom): ReadCycle[] {
  return [];
}
