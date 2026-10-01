import type { DayRecord, PatternAnchor, SymptomPattern } from '@emi/cycle';
import {
  PATTERN_NEEDS_CYCLES,
  PATTERN_WINDOW_CYCLES,
  findSymptom,
  median,
  patternsIn,
} from '@emi/cycle';
import type { PhaseName, PhaseSpan } from '@emi/tokens';

import type { CycleRow } from '../../data/cycleRepository';
import { medianCycleLengthDays } from './cyclesRead';
import { phasesOf, shapeFromLength } from './ringInput';

/**
 * What came back, as a screen reads it back: the symptom, the point in her cycle it keeps landing
 * on, and the two counts that are the evidence for it.
 *
 * Two screens name the same pattern: the Insights screen as a row, and the screen she opens as a
 * card. They stand on this one reader, so neither of them can place a symptom its own way, and
 * neither can quote a count the other does not have.
 *
 * Nothing here decides what a pattern is. The arithmetic package refuses a coincidence, and this
 * reader puts a name and a colour on what it returns.
 */

/** One symptom that came back, with the name and the colour a screen needs to write it. */
export interface ReadPattern {
  readonly slug: string;
  readonly name: string;
  readonly anchor: PatternAnchor;
  /** The day it lands on, counted the way `anchor` says, from one. */
  readonly day: number;
  readonly cyclesWithIt: number;
  readonly cyclesRead: number;
  readonly phase: PhaseName;
  /** The most recent day she logged it, so a press opens a day she actually wrote. */
  readonly lastDay: string;
}

export interface PatternsReadFrom {
  readonly cycles: readonly CycleRow[];
  /** Her whole days, because a pattern is made of the symptoms and the moods she wrote. */
  readonly records: readonly DayRecord[];
}

/** How many of her cycles must carry a symptom before Emi names it at all. */
export const patternsNeedCycles = PATTERN_NEEDS_CYCLES;

/** A period the cache has not closed is one day long here, which is what the arcs are drawn at. */
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
): ReadPattern {
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
 * Every symptom that came back often enough for Emi to name it, most repeated first. The phase one
 * of them falls in is read off a cycle of her median length, because a pattern is read from six
 * cycles and belongs to no single one of them.
 */
export function patternsRead(from: PatternsReadFrom): ReadPattern[] {
  const complete = from.cycles.filter((cycle) => cycle.lengthDays !== null);
  const medianLengthDays = medianCycleLengthDays(from.cycles);
  const medianSpans =
    medianLengthDays > 0
      ? phasesOf(shapeFromLength(medianLengthDays, medianPeriodDays(complete, medianLengthDays)))
      : [];

  return patternsIn({ records: from.records, cycles: from.cycles.map(asCycle) }).map((pattern) =>
    named(pattern, medianLengthDays, medianSpans),
  );
}
