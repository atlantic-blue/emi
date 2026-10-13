import { type WordKey, words } from '../../language';
import type { FertileDates } from '../calendar/herMonthPhases';
import { dateOf, monthOf } from '../onboarding/days';

/** The words of the ovulation popup, from the ovulationPopup board. */
export const ovulationPopupCopy = {
  title: words('ovulation.popup.title'),
  line: words('ovulation.popup.line'),
  save: words('ovulation.popup.save'),
  notNow: words('ovulation.popup.notNow'),
} as const;

/** The label over the question, "Fertile window, 7 to 13 November". */
export function fertileWindowLabel(window: FertileDates): string {
  const sameMonth = window.from.slice(0, 7) === window.to.slice(0, 7);

  const key: WordKey = sameMonth
    ? 'ovulation.popup.window.sameMonth'
    : 'ovulation.popup.window.spansMonths';

  return words(key, undefined, {
    from: dateOf(window.from),
    fromMonth: monthOf(window.from),
    to: dateOf(window.to),
    toMonth: monthOf(window.to),
    month: monthOf(window.to),
  });
}
