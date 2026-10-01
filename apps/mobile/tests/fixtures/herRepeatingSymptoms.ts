import type { DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';

import { startsOf } from '../../../../packages/cycle/tests/fixtures/recordedSets';
import {
  daysOfHerSixCycles,
  herCycleLengths,
  herPeriodRunsFor,
  theDaySheOpensItOn,
} from './herSixCycles';

/**
 * The phone the pattern cards are read off, shared by the scenario and by the integration test so
 * the two are held to one woman rather than to two that happen to look alike.
 *
 * She logged three things over the six cycles of `herSixCycles`. Two of them came back often enough
 * for Emi to name them, and they are anchored at opposite ends of her cycle, because a card that
 * only ever counts back from a period would read the same whichever end the arithmetic chose. The
 * third she logged in two cycles, which is the coincidence the count exists to refuse.
 */

/** What she logged, and what Emi may say about it. The day is counted the way the anchor says. */
export interface SymptomThatCameBack {
  readonly slug: string;
  readonly anchor: 'cycle-day' | 'days-before-the-period';
  readonly day: number;
  readonly cyclesWithIt: number;
}

/** How many complete cycles Emi reads back, which is the second number on every card. */
export const theCyclesEmiReads = 6;

/**
 * The two Emi names, most repeated first, which is the order the arithmetic returns and the order
 * the cards are drawn in.
 */
export const theSymptomsThatCameBack: readonly SymptomThatCameBack[] = [
  { slug: 'cramps', anchor: 'days-before-the-period', day: 2, cyclesWithIt: 5 },
  { slug: 'bloating', anchor: 'cycle-day', day: 12, cyclesWithIt: 4 },
];

/** The one she logged twice, which no card may name. */
export const theSymptomSheLoggedTwice = 'headache';
export const theCyclesTheThirdSymptomIsIn = 2;

/** The day of her cycle the third symptom sits on, which is no day either pattern lands on. */
const theThirdSymptomSitsOnCycleDay = 9;

/** The first day of every cycle, the running one included, which the symptoms are placed against. */
export function herCyclesStartOn(today: string): string[] {
  const ranAltogether = herCycleLengths.reduce((total, length) => total + length, 0);

  return startsOf({
    firstStart: addDays(today, -(theDaySheOpensItOn - 1) - ranAltogether),
    lengths: herCycleLengths,
    periodDays: herPeriodRunsFor,
  });
}

function recordedOn(day: string, slug: string): DayRecord {
  return { day, symptoms: [slug], recordedAt: `${day}T20:00:00.000Z` };
}

/**
 * Her days: the six cycles she bled through, and the symptoms she wrote on top of them. Every
 * symptom sits well past the day her period closed, so none of them lands on a day the cycle
 * arithmetic reads, and the cycles are the cycles of `herSixCycles`.
 */
export function daysOfHerRepeatingSymptoms(today: string): DayRecord[] {
  const starts = herCyclesStartOn(today);
  const marked: DayRecord[] = [];

  for (const pattern of theSymptomsThatCameBack) {
    for (let cycle = 0; cycle < pattern.cyclesWithIt; cycle += 1) {
      const day =
        pattern.anchor === 'cycle-day'
          ? addDays(String(starts[cycle]), pattern.day - 1)
          : addDays(String(starts[cycle + 1]), -pattern.day);

      marked.push(recordedOn(day, pattern.slug));
    }
  }

  for (let cycle = 0; cycle < theCyclesTheThirdSymptomIsIn; cycle += 1) {
    marked.push(
      recordedOn(
        addDays(String(starts[cycle]), theThirdSymptomSitsOnCycleDay - 1),
        theSymptomSheLoggedTwice,
      ),
    );
  }

  return [...daysOfHerSixCycles(today), ...marked].sort((one, other) =>
    one.day.localeCompare(other.day),
  );
}
