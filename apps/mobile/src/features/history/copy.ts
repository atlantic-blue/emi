import type { PatternAnchor } from '@emi/cycle';

import { monthNames, ordinal } from '../forecast/copy';

/**
 * The words of the history screen, in one place, so a test can read them without rendering
 * anything. Section 9.7 of the design sets the rules: say what happens, never congratulate, no
 * exclamation mark, and write the number rather than a vague quantity.
 *
 * Every sentence here names its own evidence. A screen that says a symptom comes back before her
 * period, without saying in how many cycles, is asking her to take Emi's word for it.
 */

export const historyCopy = {
  title: 'History',
  back: 'Back',
  cycles: 'Your cycles',
  patterns: 'What comes back',
  running: 'Still running',
  noCycles: 'No cycle is recorded yet. Log a day you bled and this fills in.',
  nothingRepeats: 'Nothing has come back in 3 cycles yet.',
} as const;

/** The day as she reads it: the 14th of May. */
export function dayReads(day: string): string {
  const month = monthNames[Number(day.slice(5, 7)) - 1];

  if (month === undefined) {
    throw new Error(`${day} names no month of the year`);
  }

  return `the ${ordinal(Number(day.slice(8, 10)))} of ${month}`;
}

/** A sentence opens with a capital, and a day is written the same way wherever it sits in one. */
function opening(sentence: string): string {
  return `${sentence.slice(0, 1).toUpperCase()}${sentence.slice(1)}`;
}

/** One cycle, by the days it covers. A cycle she is still in has a start and no end to name. */
export function cycleSentence(startedOn: string, endedOn: string | null): string {
  if (endedOn === null) {
    return `From ${dayReads(startedOn)}`;
  }

  return opening(`${dayReads(startedOn)} to ${dayReads(endedOn)}`);
}

function days(count: number): string {
  return `${count} ${count === 1 ? 'day' : 'days'}`;
}

/** How long the cycle ran and how much of it she bled, which is what she compares month to month. */
export function cycleLengthSentence(
  lengthDays: number | null,
  periodLengthDays: number | null,
): string {
  if (lengthDays === null) {
    return periodLengthDays === null
      ? historyCopy.running
      : `${historyCopy.running}, ${days(periodLengthDays)} of bleeding so far`;
  }

  if (periodLengthDays === null) {
    return days(lengthDays);
  }

  return `${days(lengthDays)}, ${periodLengthDays} of them bleeding`;
}

/** Where in her cycle it keeps landing, said the way the arithmetic anchored it. */
export function patternDaySentence(anchor: PatternAnchor, day: number): string {
  if (anchor === 'cycle-day') {
    return `About day ${day} of your cycle`;
  }

  return `About ${days(day)} before your period`;
}

/** The evidence, beside the answer, so the count she is trusting is on the screen with it. */
export function patternEvidenceSentence(cyclesWithIt: number, cyclesRead: number): string {
  return `in ${cyclesWithIt} of your last ${cyclesRead} cycles`;
}

/** The whole line she reads about one symptom. */
export function patternSentence(
  anchor: PatternAnchor,
  day: number,
  cyclesWithIt: number,
  cyclesRead: number,
): string {
  return `${patternDaySentence(anchor, day)}, ${patternEvidenceSentence(cyclesWithIt, cyclesRead)}`;
}

/**
 * What Emi says before it has read enough to say anything. The count of complete cycles is named,
 * because a woman who is told to wait deserves to know how long.
 */
export function patternsWaitingSentence(completeCycles: number, needsCycles: number): string {
  return `Emi names a symptom once it has come back in ${needsCycles} cycles. ${completeCycles} of yours ${completeCycles === 1 ? 'is' : 'are'} complete.`;
}
