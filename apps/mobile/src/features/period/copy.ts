import { words } from '../../language';
import { dateOf, monthOf, weekdayOf } from '../onboarding/days';
import type { PeriodGroup } from './answers';

/** The words of the Period page, from the periodPage board. */
export const periodPageCopy = {
  title: words('period.title'),
  heading: words('period.heading'),
  back: words('period.back'),
  save: words('period.save'),
  date: {
    group: words('period.group.date'),
    today: words('calendar.today'),
    yesterday: words('calendar.yesterday'),
    pick: words('period.date.pick'),
  },
  lock: words('onboarding.encrypts'),
  groups: {
    flow: words('period.group.flow'),
    discharge: words('period.group.discharge'),
    products: words('period.group.products'),
  } satisfies Record<PeriodGroup, string>,
} as const;

/** The date above the title, "Thursday, 12 November", for today and for a past day alike. */
export function periodDayLabel(day: string): string {
  return words('period.day', undefined, {
    weekday: weekdayOf(day),
    date: dateOf(day),
    month: monthOf(day),
  });
}
