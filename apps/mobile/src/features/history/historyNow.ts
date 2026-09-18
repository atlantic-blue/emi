import type { PatternAnchor, SymptomPattern } from '@emi/cycle';
import {
  PATTERN_NEEDS_CYCLES,
  PATTERN_WINDOW_CYCLES,
  findSymptom,
  isBleeding,
  median,
  patternsIn,
} from '@emi/cycle';
import type { DayRecord } from '@emi/crypto';
import type { PhaseName, PhaseSpan } from '@emi/tokens';

import type { CycleRow } from '../../data/cycleRepository';
import { listCycles } from '../../data/cycleRepository';
import type { Database } from '../../data/database';
import { listDayLogs } from '../../data/dayLogRepository';
import type { DayVault } from '../../services/vault/dayVault';
import { phasesOf, shapeFromLength } from '../cycle/ringInput';

/**
 * What the history screen is handed, read out of the database in one pass. The screen draws this
 * and works nothing out for itself, so the cycles it lists and the patterns it names come from one
 * reading of the same rows.
 */

/** One cycle as she reads it back, with the arcs that colour it. */
export interface HistoryCycle {
  readonly startedOn: string;
  readonly endedOn: string | null;
  readonly lengthDays: number | null;
  readonly periodLengthDays: number | null;
  /** The four arcs of that cycle, so the row can carry its colour without carrying any text on it. */
  readonly phases: readonly PhaseSpan[];
}

/** One symptom that came back, with the name and the colour the screen needs to write it. */
export interface HistoryPattern {
  readonly slug: string;
  readonly name: string;
  readonly anchor: PatternAnchor;
  readonly day: number;
  readonly cyclesWithIt: number;
  readonly cyclesRead: number;
  readonly phase: PhaseName;
  /** The most recent day she logged it, so a press opens a day she actually wrote. */
  readonly lastDay: string;
}

export interface History {
  /** Most recent first, because the cycle she is in is the one she came to read. */
  readonly cycles: readonly HistoryCycle[];
  readonly patterns: readonly HistoryPattern[];
  /** How many of her cycles are complete, which is what the waiting sentence counts. */
  readonly completeCycles: number;
}

/** A period of unknown length is drawn at its shortest, because nothing yet says it ran longer. */
const UNCLOSED_PERIOD_DAYS = 1;

function asCycle(row: CycleRow) {
  return {
    startedOn: row.startedOn,
    endedOn: row.endedOn,
    lengthDays: row.lengthDays,
    periodDays: row.periodLengthDays,
  };
}

/** The period she usually has, so the arcs a pattern is placed against are her own shape. */
function medianPeriodDays(complete: readonly CycleRow[], medianLengthDays: number): number {
  const bled = complete
    .map((cycle) => cycle.periodLengthDays)
    .filter((days): days is number => days !== null)
    .slice(-PATTERN_WINDOW_CYCLES);

  return bled.length > 0
    ? Math.min(medianLengthDays, Math.round(median(bled)))
    : UNCLOSED_PERIOD_DAYS;
}

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

function spansOf(
  row: CycleRow,
  medianLengthDays: number,
  records: readonly DayRecord[],
): PhaseSpan[] {
  const lengthDays = Math.max(row.lengthDays ?? medianLengthDays, 1);
  const periodDays = row.periodLengthDays ?? daysBled(records, row);

  return phasesOf(shapeFromLength(lengthDays, Math.min(lengthDays, periodDays)));
}

/**
 * The phase a day of the cycle falls in, from the arcs of a cycle of that length. A day past the
 * end of the arcs belongs to the last of them, because a cycle that ran longer than the median ran
 * on in its luteal phase.
 */
export function phaseAt(spans: readonly PhaseSpan[], cycleDay: number): PhaseName {
  let reached = 0;

  for (const span of spans) {
    reached += span.days;

    if (cycleDay <= reached && span.days > 0) {
      return span.phase;
    }
  }

  return spans[spans.length - 1]?.phase ?? 'luteal';
}

/** The day of the cycle a pattern lands on, whichever end the arithmetic counted it from. */
export function cycleDayOf(pattern: SymptomPattern, medianLengthDays: number): number {
  if (pattern.anchor === 'cycle-day') {
    return pattern.day;
  }

  return Math.max(1, medianLengthDays - pattern.day + 1);
}

function named(
  pattern: SymptomPattern,
  medianLengthDays: number,
  spans: readonly PhaseSpan[],
): HistoryPattern {
  const lastDay = pattern.days[pattern.days.length - 1] as string;

  return {
    slug: pattern.slug,
    // A retired symptom still resolves, because the record she wrote years ago points at its slug.
    name: findSymptom(pattern.slug)?.name ?? pattern.slug,
    anchor: pattern.anchor,
    day: pattern.day,
    cyclesWithIt: pattern.cyclesWithIt,
    cyclesRead: pattern.cyclesRead,
    phase: phaseAt(spans, cycleDayOf(pattern, medianLengthDays)),
    lastDay,
  };
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
  const lengths = complete.map((cycle) => cycle.lengthDays as number).slice(-PATTERN_WINDOW_CYCLES);
  const medianLengthDays = lengths.length > 0 ? Math.round(median(lengths)) : 0;

  const shown = [
    ...cycles.filter((cycle) => cycle.lengthDays === null),
    ...complete.slice(-PATTERN_WINDOW_CYCLES),
  ].sort((one, other) => other.startedOn.localeCompare(one.startedOn));

  const patterns = patternsIn({ records, cycles: cycles.map(asCycle) });
  // The phase a pattern falls in is read off a cycle of her median length, because a pattern is
  // read from six cycles and belongs to no single one of them.
  const medianSpans =
    medianLengthDays > 0
      ? phasesOf(shapeFromLength(medianLengthDays, medianPeriodDays(complete, medianLengthDays)))
      : [];

  return {
    cycles: shown.map((row) => ({
      startedOn: row.startedOn,
      endedOn: row.endedOn,
      lengthDays: row.lengthDays,
      periodLengthDays: row.periodLengthDays,
      phases: spansOf(row, medianLengthDays, records),
    })),
    patterns: patterns.map((pattern) => named(pattern, medianLengthDays, medianSpans)),
    completeCycles: complete.length,
  };
}

/** How many cycles Emi wants before it names anything, which the screen says while it waits. */
export const historyNeedsCycles = PATTERN_NEEDS_CYCLES;
