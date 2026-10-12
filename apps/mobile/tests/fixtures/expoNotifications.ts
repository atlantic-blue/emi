/**
 * The application reaches the scheduler of the operating system through expo-notifications, which
 * has no implementation off a phone. This stands in for it at the module boundary and answers what
 * the phone answers: a permission that is undecided until she is asked, an answer that stands once
 * she gives it, a schedule under one identifier that a second schedule replaces, and a refusal that
 * arrives as a rejected promise.
 *
 * The two calls that would reach a server are here too, and both raise. Emi never makes either, so
 * a test that reaches one fails on the spot rather than passing over a token sent somewhere.
 */

export interface ScheduledReminder {
  readonly identifier: string;
  readonly body: string;
  readonly at: Date;
}

type HerAnswer = 'allow' | 'refuse';

interface PhoneState {
  answer: HerAnswer;
  answered: boolean;
  refuses: boolean;
  asked: number;
}

const phone: PhoneState = { answer: 'allow', answered: false, refuses: false, asked: 0 };
const scheduled = new Map<string, ScheduledReminder>();

/** The trigger types the module exports. Emi schedules by date and by nothing else. */
export const SchedulableTriggerInputTypes = {
  CALENDAR: 'calendar',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  DATE: 'date',
  TIME_INTERVAL: 'timeInterval',
} as const;

interface PermissionAnswer {
  readonly granted: boolean;
  readonly status: 'granted' | 'denied' | 'undetermined';
}

function permissionNow(): PermissionAnswer {
  if (!phone.answered) {
    return { granted: false, status: 'undetermined' };
  }

  return phone.answer === 'allow'
    ? { granted: true, status: 'granted' }
    : { granted: false, status: 'denied' };
}

/** The dialog, drawn once. A phone already answered gives the same answer and draws nothing. */
export async function requestPermissionsAsync(): Promise<PermissionAnswer> {
  if (!phone.answered) {
    phone.asked += 1;
    phone.answered = true;
  }

  return await Promise.resolve(permissionNow());
}

export async function getPermissionsAsync(): Promise<PermissionAnswer> {
  return await Promise.resolve(permissionNow());
}

interface ScheduleRequest {
  readonly identifier?: string;
  readonly content: { readonly body?: string };
  readonly trigger: { readonly type: string; readonly date: Date | number };
}

export async function scheduleNotificationAsync(request: ScheduleRequest): Promise<string> {
  if (phone.refuses) {
    throw new Error('the scheduler refused');
  }
  if (request.trigger.type !== SchedulableTriggerInputTypes.DATE) {
    throw new Error(`Emi schedules by date, and this asked for ${request.trigger.type}`);
  }

  const identifier = request.identifier ?? `scheduled-${String(scheduled.size + 1)}`;

  scheduled.set(identifier, {
    identifier,
    body: request.content.body ?? '',
    at: new Date(request.trigger.date),
  });

  return await Promise.resolve(identifier);
}

export async function cancelScheduledNotificationAsync(identifier: string): Promise<void> {
  if (phone.refuses) {
    throw new Error('the scheduler refused');
  }
  scheduled.delete(identifier);
  await Promise.resolve();
}

export async function getExpoPushTokenAsync(): Promise<never> {
  return await Promise.reject(new Error('Emi asked for a push token, which it never does'));
}

export async function getDevicePushTokenAsync(): Promise<never> {
  return await Promise.reject(new Error('Emi asked for a device token, which it never does'));
}

/** A new phone that has not been asked, which will answer the way it is told to here. */
export function resetExpoNotifications(answer: HerAnswer = 'allow'): void {
  phone.answer = answer;
  phone.answered = false;
  phone.refuses = false;
  phone.asked = 0;
  scheduled.clear();
}

/** A phone she already answered, the way she answered it. */
export function thePhoneWasAnswered(answer: HerAnswer): void {
  phone.answer = answer;
  phone.answered = true;
}

/** A scheduler that refuses every call from now on. */
export function theSchedulerRefuses(): void {
  phone.refuses = true;
}

/** How many times the dialog was drawn. */
export function timesThePhoneAsked(): number {
  return phone.asked;
}

/** Every reminder the phone holds, in the order they were scheduled. */
export function theRemindersOnThePhone(): readonly ScheduledReminder[] {
  return [...scheduled.values()];
}
