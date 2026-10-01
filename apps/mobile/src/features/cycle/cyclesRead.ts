import { type DayRecord, PATTERN_WINDOW_CYCLES, isBleeding, median } from '@emi/cycle';
import type { PhaseSpan } from '@emi/tokens';

import type { CycleRow } from '../../data/cycleRepository';
import { phasesOf, shapeFromLength } from './ringInput';

/**
 * Her cycles as a screen reads them back, each with the four arcs that colour it.
 *
 * Two screens draw the same cycle: the Insights screen as a row, and the screen she opens as a
 * strip. They stand on this one reader, so neither of them can divide a cycle its own way.
 *
 * Nothing here works out a length. The cache holds it, and contract TABLE-2 makes the cache the one
 * place a cycle comes from, so a reader that counted the days again would be a second answer.
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
  /** Her days, which give the bleeding of a cycle whose period the cache has not closed yet. */
  readonly records: readonly DayRecord[];
}

/** A period of unknown length is drawn at its shortest, because nothing yet says it ran longer. */
const UNCLOSED_PERIOD_DAYS = 1;

/**
 * The days she bled in a cycle whose period the cache has not closed yet. A period is closed by a
 * recorded day without bleeding, so the cycle she is in has no length of its own while it runs, and
 * a row drawn at one day would show a woman in the middle of her period a cycle she is not having.
 */
function daysBled(records: readonly DayRecord[], row: CycleRow): number {
  const bled = records.filter(
    (record) =>
      record.day >= row.startedOn &&
      (row.endedOn === null || record.day <= row.endedOn) &&
      isBleeding(record),
  );

  return Math.max(UNCLOSED_PERIOD_DAYS, bled.length);
}

/** The length her recent cycles came to, which is what a cycle still running is drawn against. */
export function medianCycleLengthDays(cycles: readonly CycleRow[]): number {
  const lengths = cycles
    .map((cycle) => cycle.lengthDays)
    .filter((length): length is number => length !== null)
    .slice(-PATTERN_WINDOW_CYCLES);

  return lengths.length > 0 ? Math.round(median(lengths)) : 0;
}

export function phasesOfCycle(
  row: CycleRow,
  medianLengthDays: number,
  records: readonly DayRecord[],
): PhaseSpan[] {
  const lengthDays = Math.max(row.lengthDays ?? medianLengthDays, 1);
  const periodDays = row.periodLengthDays ?? daysBled(records, row);

  return phasesOf(shapeFromLength(lengthDays, Math.min(lengthDays, periodDays)));
}

function asRead(row: CycleRow, medianLengthDays: number, records: readonly DayRecord[]): ReadCycle {
  return {
    startedOn: row.startedOn,
    endedOn: row.endedOn,
    lengthDays: row.lengthDays,
    periodLengthDays: row.periodLengthDays,
    phases: phasesOfCycle(row, medianLengthDays, records),
  };
}

/**
 * Every cycle she had, most recent first, each with its arcs. A forecast cycle is not a cycle she
 * had, so it is left out: a screen that drew one would offer her a past she has not lived.
 */
export function cyclesRead({ cycles, records }: CyclesReadFrom): ReadCycle[] {
  const hers = cycles.filter((cycle) => !cycle.isPredicted);
  const medianLengthDays = medianCycleLengthDays(hers);

  return hers
    .map((row) => asRead(row, medianLengthDays, records))
    .sort((one, other) => other.startedOn.localeCompare(one.startedOn));
}
