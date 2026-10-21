import { type ForecastResult, addDays } from '@emi/cycle';

import type { Database } from '../../data/database';
import { readSetting, writeSetting } from '../../data/settingRepository';
import { words } from '../../language';

/**
 * The three moments she can be reminded at, counted back from the first day of the range her next
 * period is forecast in. The order is the order the screen offers them in.
 */
export const reminderLeads = ['twoDaysBefore', 'oneDayBefore', 'onTheDay'] as const;

export type ReminderLead = (typeof reminderLeads)[number];

/** Days before the range starts. A map, so a fourth lead fails to compile until it has a count. */
export const daysBeforeTheRange: Readonly<Record<ReminderLead, number>> = {
  twoDaysBefore: 2,
  oneDayBefore: 1,
  onTheDay: 0,
};

/**
 * The hour of her own day the reminder is raised at. The redesign draws the reminder on a lock
 * screen at nine in the morning, and the first run asks her no time, so it is this hour for now.
 */
export const reminderHour = 9;

/** Whether the value is one of the three leads, asked of a value from anywhere. */
export function reminderLeadIsOffered(value: string): value is ReminderLead {
  return (reminderLeads as readonly string[]).includes(value);
}

/**
 * The words the lock screen shows, the same for every moment. They name Emi and nothing else, because
 * anybody who picks up the phone can read a lock screen. The screen that asks says what they mean.
 */
export const reminderNotificationWords: string = words('reminder.notification');

/**
 * The moment the reminder is raised at, or nothing at all. Nothing where the forecast has no range
 * yet, and nothing where the moment has already gone, because a reminder raised late tells her
 * nothing she can still act on.
 */
export function whenToRemindHer(
  forecast: ForecastResult,
  lead: ReminderLead,
  now: Date,
): Date | undefined {
  const firstDay = forecast.start?.from;

  if (firstDay === undefined) {
    return undefined;
  }

  const [year, month, day] = addDays(firstDay, -daysBeforeTheRange[lead]).split('-').map(Number);

  if (year === undefined || month === undefined || day === undefined) {
    return undefined;
  }

  const moment = new Date(year, month - 1, day, reminderHour, 0, 0, 0);

  return moment.getTime() > now.getTime() ? moment : undefined;
}

/**
 * The lead she chose, read from the setting table. It is plain text and never leaves the phone:
 * when to be reminded is not a fact about her body, and the moment itself is worked out again from
 * the forecast every time it is scheduled. Nothing at all where she chose none.
 */
export function readReminderLead(db: Database): ReminderLead | undefined {
  const held = readSetting(db, 'reminderLead');

  return held !== undefined && reminderLeadIsOffered(held) ? held : undefined;
}

export function writeReminderLead(db: Database, lead: ReminderLead): void {
  writeSetting(db, 'reminderLead', lead);
}
