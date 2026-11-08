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
 * The hour of her own day the reminder is raised at until she chooses another time on Reminders.
 * The redesign draws the reminder on a lock screen at nine in the morning, and the first run asks
 * her no time.
 */
export const reminderHour = 9;

/** Minutes after midnight, which is how a time of day is held and counted. */
export type MinutesOfTheDay = number;

const MINUTES_IN_A_DAY = 24 * 60;

/** The time of day the reminder comes at when she chose none. */
export const reminderTimeAtFirst: MinutesOfTheDay = reminderHour * 60;

/** How far one press moves the time of day. */
export const REMINDER_TIME_STEP = 30;

/** Whether a value is a time of day the screen can offer: a whole step between midnight and midnight. */
export function reminderTimeIsOffered(minutes: number): boolean {
  return (
    Number.isInteger(minutes) &&
    minutes >= 0 &&
    minutes < MINUTES_IN_A_DAY &&
    minutes % REMINDER_TIME_STEP === 0
  );
}

/** One step later or earlier, round the clock, so the latest time is one press from the earliest. */
export function reminderTimeMovedBy(minutes: MinutesOfTheDay, steps: number): MinutesOfTheDay {
  const moved = minutes + steps * REMINDER_TIME_STEP;

  return ((moved % MINUTES_IN_A_DAY) + MINUTES_IN_A_DAY) % MINUTES_IN_A_DAY;
}

/** "09:00", the way the board writes a time of day, in every language Emi is written in. */
export function reminderTimeSaid(minutes: MinutesOfTheDay): string {
  const hours = Math.floor(minutes / 60);

  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** The time she chose, read from the setting table, or nine in the morning where she chose none. */
export function readReminderTime(db: Database): MinutesOfTheDay {
  const held = Number(readSetting(db, 'reminderTime'));

  return reminderTimeIsOffered(held) ? held : reminderTimeAtFirst;
}

export function writeReminderTime(db: Database, minutes: MinutesOfTheDay): void {
  if (!reminderTimeIsOffered(minutes)) {
    throw new Error(`${minutes} is not a time of day the reminder can be set to`);
  }
  writeSetting(db, 'reminderTime', String(minutes));
}

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
  at: MinutesOfTheDay = reminderTimeAtFirst,
): Date | undefined {
  const firstDay = forecast.start?.from;

  if (firstDay === undefined) {
    return undefined;
  }

  const [year, month, day] = addDays(firstDay, -daysBeforeTheRange[lead]).split('-').map(Number);

  if (year === undefined || month === undefined || day === undefined) {
    return undefined;
  }

  const moment = new Date(year, month - 1, day, Math.floor(at / 60), at % 60, 0, 0);

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

/**
 * Never, chosen on Reminders. It is written as a word the leads do not hold, so a phone that held
 * a lead reads none afterwards, exactly like a phone where she chose none in the first run.
 */
export function writeNoReminder(db: Database): void {
  writeSetting(db, 'reminderLead', 'never');
}
