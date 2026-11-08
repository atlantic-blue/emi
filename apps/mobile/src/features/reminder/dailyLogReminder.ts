import { addDays } from '@emi/cycle';

import type { Database } from '../../data/database';
import { readSetting, writeSetting } from '../../data/settingRepository';
import { words } from '../../language';
import { type MinutesOfTheDay, reminderTimeIsOffered } from './reminder';

export type DailyLogReminder = 'on' | 'off';

/**
 * How many days ahead the phone holds a reminder. Each day she opens Emi schedules them again, so
 * the run only ends if she stays away for longer than this.
 */
export const DAILY_LOG_REMINDER_DAYS_AHEAD = 14;

/** Eight in the evening, when most of the day is there to log. */
export const dailyLogReminderTimeAtFirst: MinutesOfTheDay = 20 * 60;

/** The words on the lock screen. Like the period reminder, they say nothing about her body. */
export const dailyLogReminderWords: string = words('reminder.dailyLog.notification');

/** Where a press on the reminder takes her: the entry of today. */
export const theEntryOfToday = '/log';

export function readDailyLogReminder(db: Database): DailyLogReminder {
  return readSetting(db, 'dailyLogReminder') === 'on' ? 'on' : 'off';
}

export function writeDailyLogReminder(db: Database, value: DailyLogReminder): void {
  writeSetting(db, 'dailyLogReminder', value);
}

export function readDailyLogReminderTime(db: Database): MinutesOfTheDay {
  const held = Number(readSetting(db, 'dailyLogReminderTime'));

  return reminderTimeIsOffered(held) ? held : dailyLogReminderTimeAtFirst;
}

export function writeDailyLogReminderTime(db: Database, minutes: MinutesOfTheDay): void {
  if (!reminderTimeIsOffered(minutes)) {
    throw new Error(`${minutes} is not a time of day the reminder can be set to`);
  }
  writeSetting(db, 'dailyLogReminderTime', String(minutes));
}

export interface LogReminderFrom {
  readonly today: string;
  readonly now: Date;
  readonly at: MinutesOfTheDay;
  readonly hasLoggedToday: boolean;
}

/** The moments ahead, one on each day from today, leaving out today when she has logged it. */
export function whenToRemindHerToLog(from: LogReminderFrom): Date[] {
  const moments: Date[] = [];

  for (let offset = 0; offset < DAILY_LOG_REMINDER_DAYS_AHEAD; offset += 1) {
    if (offset === 0 && from.hasLoggedToday) {
      continue;
    }

    const [year, month, day] = addDays(from.today, offset).split('-').map(Number);

    if (year === undefined || month === undefined || day === undefined) {
      continue;
    }

    const moment = new Date(year, month - 1, day, Math.floor(from.at / 60), from.at % 60, 0, 0);

    if (moment.getTime() > from.now.getTime()) {
      moments.push(moment);
    }
  }

  return moments;
}
