import type { PatternAnchor } from '@emi/cycle';

import { words } from '../../language';
import { monthNames, ordinal } from '../forecast/copy';

/**
 * The words of the history screen. Section 9.7 of the design sets the rules: say what happens,
 * never congratulate, no exclamation mark, and write the number rather than a vague quantity.
 *
 * Every sentence here names its own evidence. A screen that says a symptom comes back before her
 * period, without saying in how many cycles, is asking her to take Emi's word for it.
 */

export const historyCopy = {
  title: words('history.title'),
  back: words('history.back'),
  cycles: words('history.cycles'),
  patterns: words('history.patterns'),
  running: words('history.running'),
  noCycles: words('history.noCycles'),
  nothingRepeats: words('history.nothingRepeats'),
} as const;

/** The day as she reads it: the 14th of May. */
export function dayReads(day: string): string {
  const month = monthNames[Number(day.slice(5, 7)) - 1];

  if (month === undefined) {
    throw new Error(`${day} names no month of the year`);
  }

  return words('history.dayReads', undefined, {
    month,
    ordinal: ordinal(Number(day.slice(8, 10))),
  });
}

/** A sentence opens with a capital, and a day is written the same way wherever it sits in one. */
function opening(sentence: string): string {
  return `${sentence.slice(0, 1).toUpperCase()}${sentence.slice(1)}`;
}

/** One cycle, by the days it covers. A cycle she is still in has a start and no end to name. */
export function cycleSentence(startedOn: string, endedOn: string | null): string {
  if (endedOn === null) {
    return words('history.cycleFrom', undefined, { day: dayReads(startedOn) });
  }

  return opening(
    words('history.cycleRange', undefined, { from: dayReads(startedOn), to: dayReads(endedOn) }),
  );
}

function days(count: number): string {
  return words('history.cycleDayCount', count);
}

/** How long the cycle ran and how much of it she bled, which is what she compares month to month. */
export function cycleLengthSentence(
  lengthDays: number | null,
  periodLengthDays: number | null,
): string {
  if (lengthDays === null) {
    return periodLengthDays === null
      ? historyCopy.running
      : words('history.runningWithPeriod', undefined, {
          periodDays: days(periodLengthDays),
          running: historyCopy.running,
        });
  }

  if (periodLengthDays === null) {
    return days(lengthDays);
  }

  return words('history.cycleLengthAndPeriod', undefined, {
    length: days(lengthDays),
    periodDays: periodLengthDays,
  });
}

/** Where in her cycle it keeps landing, said the way the arithmetic anchored it. */
export function patternDaySentence(anchor: PatternAnchor, day: number): string {
  if (anchor === 'cycle-day') {
    return words('history.pattern.cycleDay', undefined, { day });
  }

  return words('history.pattern.beforePeriod', undefined, { days: days(day) });
}

/** The evidence, beside the answer, so the count she is trusting is on the screen with it. */
export function patternEvidenceSentence(cyclesWithIt: number, cyclesRead: number): string {
  return words('history.pattern.evidence', undefined, {
    read: cyclesRead,
    withIt: cyclesWithIt,
  });
}

/** The whole line she reads about one symptom. */
export function patternSentence(
  anchor: PatternAnchor,
  day: number,
  cyclesWithIt: number,
  cyclesRead: number,
): string {
  return words('history.pattern.line', undefined, {
    evidence: patternEvidenceSentence(cyclesWithIt, cyclesRead),
    when: patternDaySentence(anchor, day),
  });
}

/**
 * What Emi says before it has read enough to say anything. The count of complete cycles is named,
 * because a woman who is told to wait deserves to know how long.
 */
export function patternsWaitingSentence(completeCycles: number, needsCycles: number): string {
  return words('history.patternsWaiting', completeCycles, { needs: needsCycles });
}
