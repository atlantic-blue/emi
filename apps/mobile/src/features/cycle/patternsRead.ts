import type { DayRecord, PatternAnchor } from '@emi/cycle';
import { PATTERN_NEEDS_CYCLES } from '@emi/cycle';
import type { PhaseName } from '@emi/tokens';

import type { CycleRow } from '../../data/cycleRepository';

/**
 * What came back, as a screen reads it back. Nothing is read yet, so no screen gets a pattern from
 * here and every case that reads a card fails.
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

export function patternsRead(_from: PatternsReadFrom): ReadPattern[] {
  return [];
}
