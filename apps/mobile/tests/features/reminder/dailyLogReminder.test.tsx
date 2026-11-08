import { join } from 'node:path';

import { addDays } from '@emi/cycle';
import { screen } from '@testing-library/react-native';
import { act, fireEvent, renderRouter } from 'expo-router/testing-library';

import { writeSetting } from '../../../src/data/settingRepository';
import { flowOptionTestID } from '../../../src/features/log/FlowPicker';
import { localDay } from '../../../src/features/onboarding/days';
import {
  DAILY_LOG_REMINDER_DAYS_AHEAD,
  dailyLogReminderWords,
  readDailyLogReminder,
  readDailyLogReminderTime,
  whenToRemindHerToLog,
} from '../../../src/features/reminder/dailyLogReminder';
import {
  reminderNotificationWords,
  reminderTimeSaid,
} from '../../../src/features/reminder/reminder';
import {
  remindersDailyLogEarlierTestID,
  remindersDailyLogTestID,
  remindersDailyLogTimeTestID,
  remindersSaveTestID,
  remindersTimeTestID,
} from '../../../src/features/settings/RemindersScreen';
import { settingsRemindersTestID } from '../../../src/features/settings/SettingsScreen';
import { english } from '../../../src/language/english';
import { russian } from '../../../src/language/russian';
import { spanish } from '../../../src/language/spanish';
import { dailyLogReminderIdentifier } from '../../../src/services/notifications/localReminder';
import { resetExpoSqlite } from '../../data/expoSqlite';
import {
  resetExpoNotifications,
  shePressesTheReminder,
  theRemindersOnThePhone,
  thePhoneWasAnswered,
} from '../../fixtures/expoNotifications';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { herDatabase, herPhoneHoldsTheseAnswers } from '../../fixtures/herPhone';
import { herAnswers, whenSheOpensPrivacy } from '../../fixtures/thePrivacyLook';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));
jest.mock('expo-notifications', () => jest.requireActual('../../fixtures/expoNotifications'));

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');
const today = localDay(whenSheOpensPrivacy);

interface OpenApp {
  readonly pathname: () => string;
}

async function sheOpens(at: string): Promise<OpenApp> {
  const app = renderRouter(appDirectory, { initialUrl: at });

  await app;

  return { pathname: () => app.getPathname() };
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/** Waits out the reschedule that Save and a log start in the background. */
async function theSchedulerAnswers(): Promise<void> {
  await act(async () => {
    await jest.runOnlyPendingTimersAsync();
  });
}

function said(at: Date): string {
  return `${localDay(at)} ${reminderTimeSaid(at.getHours() * 60 + at.getMinutes())}`;
}

function theLogReminders(): readonly { readonly when: string; readonly body: string }[] {
  return theRemindersOnThePhone()
    .filter((held) => held.identifier.startsWith(dailyLogReminderIdentifier(1).slice(0, -1)))
    .map((held) => ({ when: said(held.at), body: held.body }))
    .sort((one, other) => one.when.localeCompare(other.when));
}

function theDaysAhead(from: string, count: number): string[] {
  return Array.from({ length: count }, (_, offset) => addDays(from, offset));
}

describe('when Emi reminds her to log', () => {
  const at = 20 * 60;

  it('gives a moment on each of the next days at her time, from today', () => {
    const now = new Date(2026, 4, 14, 12, 0);

    const moments = whenToRemindHerToLog({ at, hasLoggedToday: false, now, today: '2026-05-14' });

    expect(moments.map(said)).toEqual(
      theDaysAhead('2026-05-14', DAILY_LOG_REMINDER_DAYS_AHEAD).map((day) => `${day} 20:00`),
    );
  });

  it('gives no moment today on a day she already logged', () => {
    const now = new Date(2026, 4, 14, 12, 0);

    const moments = whenToRemindHerToLog({ at, hasLoggedToday: true, now, today: '2026-05-14' });

    expect(moments.map(said)[0]).toBe('2026-05-15 20:00');
    expect(moments).toHaveLength(DAILY_LOG_REMINDER_DAYS_AHEAD - 1);
  });

  it('gives no moment today once her time today has gone', () => {
    const now = new Date(2026, 4, 14, 20, 30);

    const moments = whenToRemindHerToLog({ at, hasLoggedToday: false, now, today: '2026-05-14' });

    expect(moments.map(said)[0]).toBe('2026-05-15 20:00');
  });
});

describe('the words of the daily log reminder', () => {
  it('are neutral and name Emi, in three languages', () => {
    expect(english['reminder.dailyLog.notification']).toBe('A moment to log your day in Emi');
    expect(spanish['reminder.dailyLog.notification']).toBe(
      'Un momento para registrar tu día en Emi',
    );
    expect(russian['reminder.dailyLog.notification']).toBe('Время отметить ваш день в Emi');
    expect(english['settings.reminders.dailyLog']).toBe('Remind me to log each day');
    expect(spanish['settings.reminders.dailyLog']).toBe('Recordarme registrar cada día');
    expect(russian['settings.reminders.dailyLog']).toBe('Напоминать отмечать каждый день');
  });
});

describe('she turns on the daily log reminder on Reminders', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensPrivacy);
    resetExpoSqlite();
    resetExpoSecureStore();
    resetExpoNotifications();
    thePhoneWasAnswered('allow');
    await herPhoneHoldsTheseAnswers(whenSheOpensPrivacy, herAnswers);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('is off at first, with no time of its own shown', async () => {
    await sheOpens('/settings/reminders');

    expect(screen.getByTestId(remindersDailyLogTestID).props.accessibilityState).toMatchObject({
      checked: false,
    });
    expect(screen.getByTestId(remindersDailyLogTestID)).toHaveTextContent(
      english['settings.reminders.dailyLog'],
    );
    expect(screen.queryByTestId(remindersDailyLogTimeTestID)).toBeNull();
  });

  it('shows its own time when she turns it on, apart from the period reminder time', async () => {
    await sheOpens('/settings/reminders');

    await shePresses(remindersDailyLogTestID);
    await shePresses(remindersDailyLogEarlierTestID);

    expect(screen.getByTestId(remindersDailyLogTestID).props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(screen.getByTestId(remindersDailyLogTimeTestID)).toHaveTextContent('19:30');
    expect(screen.getByTestId(remindersTimeTestID)).toHaveTextContent('09:00');
  });

  it('puts a reminder on each of the next days after Save, with the neutral words', async () => {
    const app = await sheOpens('/settings');
    await shePresses(settingsRemindersTestID);

    await shePresses(remindersDailyLogTestID);
    await shePresses(remindersSaveTestID);
    await theSchedulerAnswers();

    expect(app.pathname()).toBe('/settings');
    expect(readDailyLogReminder(herDatabase())).toBe('on');
    expect(readDailyLogReminderTime(herDatabase())).toBe(20 * 60);
    expect(theLogReminders()).toEqual(
      theDaysAhead(today, DAILY_LOG_REMINDER_DAYS_AHEAD).map((day) => ({
        when: `${day} 20:00`,
        body: dailyLogReminderWords,
      })),
    );
    expect(theRemindersOnThePhone().map((held) => held.body)).not.toContain(
      reminderNotificationWords,
    );
  });

  it('takes every daily reminder off the phone when she turns it off again', async () => {
    await sheOpens('/settings');
    await shePresses(settingsRemindersTestID);
    await shePresses(remindersDailyLogTestID);
    await shePresses(remindersSaveTestID);
    await theSchedulerAnswers();
    expect(theLogReminders()).toHaveLength(DAILY_LOG_REMINDER_DAYS_AHEAD);

    await shePresses(settingsRemindersTestID);
    await shePresses(remindersDailyLogTestID);
    await shePresses(remindersSaveTestID);
    await theSchedulerAnswers();

    expect(readDailyLogReminder(herDatabase())).toBe('off');
    expect(theLogReminders()).toEqual([]);
  });
});

describe('she logs today with the daily log reminder on', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensPrivacy);
    resetExpoSqlite();
    resetExpoSecureStore();
    resetExpoNotifications();
    thePhoneWasAnswered('allow');
    await herPhoneHoldsTheseAnswers(whenSheOpensPrivacy, herAnswers);
    writeSetting(herDatabase(), 'dailyLogReminder', 'on');
    writeSetting(herDatabase(), 'dailyLogReminderTime', String(23 * 60));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('takes the reminder of today off the phone and keeps tomorrow', async () => {
    await sheOpens('/log');
    await theSchedulerAnswers();
    await shePresses(flowOptionTestID('light'));
    await theSchedulerAnswers();

    const days = theLogReminders().map((held) => held.when.slice(0, 10));

    expect(days).not.toContain(today);
    expect(days[0]).toBe(addDays(today, 1));
  });
});

describe('she presses the daily log reminder', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensPrivacy);
    resetExpoSqlite();
    resetExpoSecureStore();
    resetExpoNotifications();
    thePhoneWasAnswered('allow');
    await herPhoneHoldsTheseAnswers(whenSheOpensPrivacy, herAnswers);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens the entry of today', async () => {
    const app = await sheOpens('/settings');

    await act(async () => {
      shePressesTheReminder(dailyLogReminderIdentifier(1), { url: '/log' });
      await jest.runOnlyPendingTimersAsync();
    });

    expect(app.pathname()).toBe('/log');
    expect(screen.getByTestId(flowOptionTestID('light'))).toBeTruthy();
  });

  it('leaves her where she is when she presses the period reminder', async () => {
    const app = await sheOpens('/settings');

    await act(async () => {
      shePressesTheReminder('emi-period-reminder', {});
      await jest.runOnlyPendingTimersAsync();
    });

    expect(app.pathname()).toBe('/settings');
  });
});
