import { type ProfileRecord, goalValues } from '@emi/crypto';

import {
  cycleLengthDaysLabel,
  feelingLabels,
  focusNamesInASentence,
  periodLengthDaysLabel,
  regularityLabels,
} from '../onboarding/copy';
import { goalsChosenLabel } from './copy';

/**
 * The eight answers the first run takes, read back out of the one sealed profile row.
 *
 * The order is the order the drawing of her answers places them in, which is the order the first
 * run asked for them. Nothing here reaches the database: the row is opened once by the route and
 * handed in, so a screen cannot draw one profile and a test read another.
 */

export const yourAnswerRows = [
  'name',
  'birthYear',
  'cycleLength',
  'periodLength',
  'regularity',
  'feeling',
  'goals',
  'focus',
] as const;

export type YourAnswerRow = (typeof yourAnswerRows)[number];

/**
 * The rows short enough to read on the same line as the question. The four below carry a word or
 * a number; the other four carry a sentence, which goes under the question instead.
 */
export const answersReadBesideTheQuestion: readonly YourAnswerRow[] = [
  'name',
  'birthYear',
  'cycleLength',
  'periodLength',
];

/**
 * What she gave for one question, or nothing at all where she skipped it.
 *
 * Nothing at all is the answer, so the row is drawn with the question and no value under it. A
 * default put here would read as something she said, and she said nothing.
 */
export function theAnswerSheGave(
  row: YourAnswerRow,
  answers: ProfileRecord | undefined,
): string | undefined {
  if (answers === undefined) {
    return undefined;
  }

  switch (row) {
    case 'name':
      return answers.name;
    case 'birthYear':
      return answers.birthYear === undefined ? undefined : String(answers.birthYear);
    case 'cycleLength':
      return answers.cycleLengthDays === undefined
        ? undefined
        : cycleLengthDaysLabel(answers.cycleLengthDays);
    case 'periodLength':
      return answers.periodLengthDays === undefined
        ? undefined
        : periodLengthDaysLabel(answers.periodLengthDays);
    case 'regularity':
      return answers.regularity === undefined ? undefined : regularityLabels[answers.regularity];
    case 'feeling':
      return answers.feeling === undefined ? undefined : feelingLabels[answers.feeling];
    case 'goals':
      return answers.goals === undefined || answers.goals.length === 0
        ? undefined
        : goalsChosenLabel(answers.goals.length, goalValues.length);
    case 'focus':
      return answers.focus === undefined || answers.focus.length === 0
        ? undefined
        : focusNamesInASentence(answers.focus);
  }
}
