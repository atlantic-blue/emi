import type { DayRecord } from '@emi/crypto';
import {
  type CycleDays,
  type CyclePhaseName,
  cyclePhaseDays,
  daysBetween,
  ovulationDayWhileLearning,
} from '@emi/cycle';

import type { CycleRow } from '../../data/cycleRepository';
import { type DiaryChip, dayHolds, diaryChips } from './diary';

/**
 * Her own diary, grouped by the phase of each day, over her past complete cycles (issue 274). A
 * complete cycle has a length she lived, so its phases are counted from that length: the ovulation
 * day is the luteal length counted back from the next start, which is how the forecast counts it.
 *
 * The days of a phase are the days the page names for it, so the follicular phase holds the period.
 */

export interface NotedInCycles {
  readonly chip: DiaryChip;
  /** In how many of the counted cycles she noted the chip on at least one day of the phase. */
  readonly cycles: number;
}

export type PastPhase =
  | { readonly kind: 'waiting' }
  | {
      readonly kind: 'counted';
      /** How many complete cycles were read. */
      readonly cycles: number;
      /** Every chip she noted at least once, most cycles first, then in the order of the diary. */
      readonly noted: readonly NotedInCycles[];
    };

export interface PastPhaseFrom {
  readonly cycles: readonly CycleRow[];
  readonly records: readonly DayRecord[];
  readonly phase: CyclePhaseName;
}

function theDaysOf(cycle: CycleRow, lengthDays: number, phase: CyclePhaseName): CycleDays {
  return cyclePhaseDays({
    cycleLengthDays: lengthDays,
    periodLengthDays: Math.min(cycle.periodLengthDays ?? 0, lengthDays),
    ovulationDay: ovulationDayWhileLearning(lengthDays),
  })[phase];
}

/** The chips she noted on the days of the phase in one complete cycle. */
function chipsNotedIn(from: PastPhaseFrom, cycle: CycleRow, lengthDays: number): Set<DiaryChip> {
  const days = theDaysOf(cycle, lengthDays, from.phase);
  const noted = new Set<DiaryChip>();

  for (const record of from.records) {
    const cycleDay = daysBetween(cycle.startedOn, record.day) + 1;
    if (cycleDay < days.from || cycleDay > days.to) {
      continue;
    }
    for (const chip of diaryChips) {
      if (dayHolds(record, chip)) {
        noted.add(chip);
      }
    }
  }

  return noted;
}

export function herPastPhase(from: PastPhaseFrom): PastPhase {
  const complete = from.cycles.filter((cycle) => !cycle.isPredicted && cycle.lengthDays !== null);
  if (complete.length === 0) {
    return { kind: 'waiting' };
  }

  const counts = new Map<DiaryChip, number>();
  for (const cycle of complete) {
    for (const chip of chipsNotedIn(from, cycle, cycle.lengthDays ?? 0)) {
      counts.set(chip, (counts.get(chip) ?? 0) + 1);
    }
  }

  const noted = diaryChips
    .filter((chip) => counts.has(chip))
    .map((chip) => ({ chip, cycles: counts.get(chip) ?? 0 }))
    .sort((one, other) => other.cycles - one.cycles);

  return { kind: 'counted', cycles: complete.length, noted };
}
