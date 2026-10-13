import { addDays } from '@emi/cycle';

import type { Database } from '../../data/database';
import { readSetting, writeSetting } from '../../data/settingRepository';
import type { RingInputFrom } from '../cycle/ringInput';
import { forecastOf } from '../forecast/fromCache';
import { addMonths, startOfMonth } from '../onboarding/days';
import { isAForecastPeriodDay, theCyclesAhead } from './forecastAhead';

/**
 * The sheet that asks for her past periods over a month ahead of her, from the forecastPopup board
 * (issue 271). It shows only where the forecast for that month is missing because Emi has too
 * little data: the month is after the month she is in, Emi is still learning, and no forecast
 * period of hers touches the month.
 *
 * "Not now" closes it for that month for the rest of the day. The issue does not say how often it
 * shows, so it shows at most once a day for each month she opens.
 */

/** Whether any day of a month is a day a forecast period may fall on. */
function aForecastTouches(from: RingInputFrom, month: string): boolean {
  const next = addMonths(month, 1);

  return theCyclesAhead(from).some((cycle) => {
    for (let day = month; day < next; day = addDays(day, 1)) {
      if (isAForecastPeriodDay(cycle, day)) {
        return true;
      }
    }
    return false;
  });
}

/** Whether the forecast for this month is missing because Emi has too little data. */
export function forecastIsMissingFor(from: RingInputFrom, month: string): boolean {
  if (startOfMonth(month) <= startOfMonth(from.today)) {
    return false;
  }
  if (forecastOf(from.cycles, from.statedCycleLengthDays).kind === 'forecast') {
    return false;
  }

  return !aForecastTouches(from, startOfMonth(month));
}

/** What the setting holds: the day she pressed "Not now", and the months she pressed it on. */
interface Closed {
  readonly on: string;
  readonly months: readonly string[];
}

function readClosed(db: Database): Closed | undefined {
  const held = readSetting(db, 'forecastPopupClosed');
  if (held === undefined) {
    return undefined;
  }

  const [on, months] = held.split('|');
  return on === undefined ? undefined : { on, months: months ? months.split(',') : [] };
}

/** Whether she closed the sheet over this month today. */
export function closedTodayFor(db: Database, month: string, today: string): boolean {
  const closed = readClosed(db);

  return closed !== undefined && closed.on === today && closed.months.includes(startOfMonth(month));
}

/** "Not now": the sheet stays closed over this month until tomorrow. */
export function closeForToday(db: Database, month: string, today: string): void {
  const closed = readClosed(db);
  const kept = closed !== undefined && closed.on === today ? closed.months : [];
  const months = [...new Set([...kept, startOfMonth(month)])];

  writeSetting(db, 'forecastPopupClosed', `${today}|${months.join(',')}`);
}

/** Whether the sheet shows over this month now. */
export function forecastPopupShows(db: Database, from: RingInputFrom, month: string): boolean {
  return forecastIsMissingFor(from, month) && !closedTodayFor(db, month, from.today);
}
