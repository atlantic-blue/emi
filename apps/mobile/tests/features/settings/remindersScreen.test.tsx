import { join } from 'node:path';

import { screen } from '@testing-library/react-native';
import { act, fireEvent, renderRouter } from 'expo-router/testing-library';

import { rowValueTestID } from '../../../src/components/SettingsRow';
import { readSetting, writeSetting } from '../../../src/data/settingRepository';
import {
  readReminderLead,
  readReminderTime,
  reminderNotificationWords,
} from '../../../src/features/reminder/reminder';
import {
  remindersBackTestID,
  remindersChoiceTestID,
  remindersEarlierTestID,
  remindersLaterTestID,
  remindersPreviewWordsTestID,
  remindersSaveTestID,
  remindersTimeTestID,
} from '../../../src/features/settings/RemindersScreen';
import {
  settingsRemindersTestID,
  settingsRowTestID,
  settingsRows,
} from '../../../src/features/settings/SettingsScreen';
import { english } from '../../../src/language/english';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { resetExpoNotifications, thePhoneWasAnswered } from '../../fixtures/expoNotifications';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { herDatabase, herPhoneHoldsTheseAnswers } from '../../fixtures/herPhone';
import { textIn } from '../../fixtures/renderedText';
import { herAnswers, whenSheOpensPrivacy } from '../../fixtures/thePrivacyLook';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));
jest.mock('expo-notifications', () => jest.requireActual('../../fixtures/expoNotifications'));

/**
 * Reminders, reached from Privacy: the period reminder, its time of day, or never. Nothing is
 * written until she presses Save, and Privacy reads back what she saved.
 */

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');

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

function whatTheRowReads(): string {
  return textIn(screen.getByTestId(rowValueTestID(settingsRemindersTestID))).join(' ');
}

function saveIsReady(): boolean {
  return screen.getByTestId(remindersSaveTestID).props.accessibilityState?.disabled !== true;
}

describe('she changes the period reminder from Privacy', () => {
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

  it('draws Reminders as the second row of Privacy, under her answers', async () => {
    await sheOpens('/settings');

    expect(settingsRows).toEqual(['answers', 'reminders', 'lock', 'export', 'delete']);
    expect(screen.getByTestId(settingsRowTestID('reminders'))).toBeTruthy();
  });

  it('reads Never on the row where she chose no reminder, and the moment where she chose one', async () => {
    await sheOpens('/settings');

    expect(whatTheRowReads()).toBe(english['settings.reminders.never']);

    writeSetting(herDatabase(), 'reminderLead', 'oneDayBefore');
    await sheOpens('/settings');

    expect(whatTheRowReads()).toBe(english['onboarding.reminder.choice.oneDayBefore']);
  });

  it('opens Reminders from the row', async () => {
    const app = await sheOpens('/settings');

    await shePresses(settingsRemindersTestID);

    expect(app.pathname()).toBe('/settings/reminders');
  });

  it('shows the words the lock screen would show, and what the phone holds now', async () => {
    writeSetting(herDatabase(), 'reminderLead', 'twoDaysBefore');
    await sheOpens('/settings/reminders');

    expect(screen.getByTestId(remindersPreviewWordsTestID)).toHaveTextContent(
      reminderNotificationWords,
    );
    expect(
      screen.getByTestId(remindersChoiceTestID('twoDaysBefore')).props.accessibilityState,
    ).toMatchObject({ checked: true });
    expect(screen.getByTestId(remindersTimeTestID)).toHaveTextContent('09:00');
    expect(saveIsReady()).toBe(false);
  });

  it('offers the three moments and Never, with Never chosen where she chose no reminder', async () => {
    await sheOpens('/settings/reminders');

    for (const choice of ['twoDaysBefore', 'oneDayBefore', 'onTheDay', 'never'] as const) {
      expect(screen.getByTestId(remindersChoiceTestID(choice))).toBeTruthy();
    }
    expect(
      screen.getByTestId(remindersChoiceTestID('never')).props.accessibilityState,
    ).toMatchObject({ checked: true });
  });

  it('moves the time half an hour a press, and round midnight', async () => {
    await sheOpens('/settings/reminders');

    await shePresses(remindersLaterTestID);

    expect(screen.getByTestId(remindersTimeTestID)).toHaveTextContent('09:30');

    for (let press = 0; press < 20; press += 1) {
      await shePresses(remindersEarlierTestID);
    }

    expect(screen.getByTestId(remindersTimeTestID)).toHaveTextContent('23:30');
  });

  it('saves a moment and a time, and Privacy reads the moment back', async () => {
    const app = await sheOpens('/settings');
    await shePresses(settingsRemindersTestID);

    await shePresses(remindersChoiceTestID('oneDayBefore'));
    await shePresses(remindersLaterTestID);
    await shePresses(remindersLaterTestID);

    expect(saveIsReady()).toBe(true);

    await shePresses(remindersSaveTestID);
    await act(async () => {
      await Promise.resolve();
    });

    expect(readReminderLead(herDatabase())).toBe('oneDayBefore');
    expect(readReminderTime(herDatabase())).toBe(10 * 60);
    expect(app.pathname()).toBe('/settings');
    expect(whatTheRowReads()).toBe(english['onboarding.reminder.choice.oneDayBefore']);
  });

  it('saves Never, so no moment is held any more', async () => {
    writeSetting(herDatabase(), 'reminderLead', 'twoDaysBefore');
    await sheOpens('/settings');
    await shePresses(settingsRemindersTestID);

    await shePresses(remindersChoiceTestID('never'));
    await shePresses(remindersSaveTestID);

    expect(readReminderLead(herDatabase())).toBeUndefined();
    expect(whatTheRowReads()).toBe(english['settings.reminders.never']);
  });

  it('writes nothing when she goes back without Save', async () => {
    await sheOpens('/settings');
    await shePresses(settingsRemindersTestID);

    await shePresses(remindersChoiceTestID('onTheDay'));
    await shePresses(remindersBackTestID);

    expect(readSetting(herDatabase(), 'reminderLead')).toBeUndefined();
    expect(readSetting(herDatabase(), 'reminderTime')).toBeUndefined();
  });
});
