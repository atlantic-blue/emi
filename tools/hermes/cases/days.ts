import { addDays, daysBetween } from '@emi/cycle';

import {
  dayLabel,
  daysBackFrom,
  localDay,
} from '../../../apps/mobile/src/features/onboarding/days';
import { check, isTrue, sameValue } from '../harness';

/**
 * Day arithmetic counts days rather than milliseconds, so no summer time change can move an
 * answer. A bare engine has no `Intl`, and a date written through a locale would be the obvious
 * way to break that, so the labels are worth reading here.
 */
export function collectDayCases(): void {
  check('reads the calendar day off a clock', () => {
    sameValue(localDay(new Date(2026, 2, 14, 23, 45)), '2026-03-14', 'her own local day');
  });

  check('refuses a date that is not a date', () => {
    let refused = false;

    try {
      localDay(new Date(Number.NaN));
    } catch {
      refused = true;
    }

    isTrue(refused, 'a day cannot be read from nothing');
  });

  check('counts days back from a day, most recent first', () => {
    sameValue(
      daysBackFrom('2026-03-02', 4).join(' '),
      '2026-03-02 2026-03-01 2026-02-28 2026-02-27',
      'and it steps over the end of a month',
    );
  });

  check('names today and yesterday and dates the rest', () => {
    sameValue(dayLabel('2026-03-14', '2026-03-14'), 'Today', 'today is named');
    sameValue(dayLabel('2026-03-13', '2026-03-14'), 'Yesterday', 'yesterday is named');
    sameValue(dayLabel('2026-03-11', '2026-03-14'), 'Wednesday 11 March', 'the rest are dated');
  });

  check('counts a leap day like any other day', () => {
    sameValue(addDays('2028-02-28', 1), '2028-02-29', 'the leap day exists');
    sameValue(daysBetween('2028-02-28', '2028-03-01'), 2, 'and it is counted');
  });
}
