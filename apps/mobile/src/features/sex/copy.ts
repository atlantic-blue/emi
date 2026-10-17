import { daysBetween } from '@emi/cycle';

import { type WordKey, words } from '../../language';
import type { FertileDates } from '../calendar/herMonthPhases';
import { dateOf, monthOf, weekdayOf } from '../onboarding/days';
import type { SexGroup } from './answers';

/** The words of the Sex page, from the sexPage board. */
export const sexPageCopy = {
  title: words('sex.title'),
  back: words('sex.back'),
  chooseDay: words('sex.chooseDay'),
  save: words('sex.save'),
  lock: words('onboarding.encrypts'),
  groups: {
    sex: words('sex.group.sex'),
    sexDrive: words('sex.group.sexDrive'),
    orgasm: words('sex.group.orgasm'),
  } satisfies Record<SexGroup, string>,
} as const;

/** The date above the question, "Thursday, 12 November", for today and for a past day alike. */
export function sexDayHeading(day: string): string {
  return words('sex.day', undefined, {
    weekday: weekdayOf(day),
    date: dateOf(day),
    month: monthOf(day),
  });
}

/** The question, in the words that are true for the day she opened. */
export function sexQuestion(day: string, today: string): string {
  const back = daysBetween(day, today);

  if (back === 0) {
    return words('sex.question.today');
  }

  return back === 1 ? words('sex.question.yesterday') : words('sex.question.thatDay');
}

/**
 * The note inside the fertile window. Today she is in it, and a past day she was in it, so the
 * sentence is in the tense that is true for the day she opened.
 */
export function fertileNote(window: FertileDates, day: string, today: string): string {
  const isToday = day === today;
  const sameMonth = window.from.slice(0, 7) === window.to.slice(0, 7);
  const key: WordKey = isToday
    ? sameMonth
      ? 'sex.fertile.now.sameMonth'
      : 'sex.fertile.now.spansMonths'
    : sameMonth
      ? 'sex.fertile.then.sameMonth'
      : 'sex.fertile.then.spansMonths';

  return words(key, undefined, {
    from: dateOf(window.from),
    fromMonth: monthOf(window.from),
    to: dateOf(window.to),
    toMonth: monthOf(window.to),
    month: monthOf(window.to),
  });
}
