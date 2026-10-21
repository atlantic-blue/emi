import { join } from 'node:path';

import { act, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { fireEvent, renderRouter } from 'expo-router/testing-library';

import { readSetting, writeSetting } from '../../../src/data/settingRepository';
import { migrate } from '../../../src/data/schema';
import { firstForecastActionTestID } from '../../../src/features/onboarding/FirstForecast';
import {
  onboardingActionTestID,
  onboardingBackTestID,
  onboardingSkipTestID,
  onboardingStepLabelTestID,
  onboardingWayPastTestID,
} from '../../../src/features/onboarding/OnboardingScreen';
import {
  reminderLineTestID,
  reminderPreviewWordsTestID,
  reminderTestID,
} from '../../../src/features/onboarding/Reminder';
import { forecastFromHerAnswers } from '../../../src/features/onboarding/firstRun';
import { reminderLeads } from '../../../src/features/reminder/reminder';
import { reminderIdentifier } from '../../../src/services/notifications/localReminder';
import { resetExpoSqlite } from '../../data/expoSqlite';
import {
  resetExpoNotifications,
  theRemindersOnThePhone,
  timesThePhoneAsked,
} from '../../fixtures/expoNotifications';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { herDatabase } from '../../fixtures/herPhone';
import { sheAnswersEveryQuestion, sheReadsWhatEmiDoesWithIt } from '../../fixtures/theFirstRun';
import { sheTapsSaveAndStart } from '../../fixtures/theSave';
import { sheReachesTheReminder } from './theWalkToTheReminder';
import { locksDrawnIn } from '../../fixtures/drawnLocks';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));
jest.mock('expo-notifications', () => jest.requireActual('../../fixtures/expoNotifications'));

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const herPeriodStarted = '2026-05-09';
const herCycleLengthDays = 28;

async function sheOpensEmi(): Promise<{ pathname: () => string }> {
  const app = renderRouter(appDirectory, { initialUrl: '/' });

  await app;

  return { pathname: () => app.getPathname() };
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/** Nine in the morning of the day that many days before the range she was shown. */
function theMomentSheWasPromised(daysBefore: number): Date {
  const forecast = forecastFromHerAnswers({
    periods: [{ startedOn: herPeriodStarted, lengthDays: 1 }],
    cycleLengthDays: herCycleLengthDays,
  });
  const [year, month, day] = (forecast.start?.from ?? '').split('-').map(Number);

  return new Date(year ?? 0, (month ?? 1) - 1, (day ?? 1) - daysBefore, 9, 0, 0, 0);
}

/** The forecast, what Emi does with it and the hold, all the way to her home. */
async function sheFinishesTheFirstRun(): Promise<void> {
  await fireEvent.press(await screen.findByTestId(firstForecastActionTestID));
  await sheReadsWhatEmiDoesWithIt();
  await sheTapsSaveAndStart();
}

describe('the reminder, after the first day she logs', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
    resetExpoNotifications('allow');

    const database = herDatabase();

    migrate(database);
    writeSetting(database, 'tourSeenAt', whenSheOpensIt.toISOString());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the screen', () => {
    it('is where the first day she logs hands her, and it is the last step of twelve', async () => {
      const app = await sheOpensEmi();

      await sheReachesTheReminder(herPeriodStarted);

      expect(app.pathname()).toBe('/onboarding/reminder');
      expect(screen.getByTestId(onboardingStepLabelTestID)).toHaveTextContent('Step 12 of 12');
    });

    it('asks the question, offers its three moments, and chooses none of them for her', async () => {
      await sheOpensEmi();
      await sheReachesTheReminder(herPeriodStarted);

      expect(screen.getByText('Would you like a reminder before your period?')).toBeTruthy();
      expect(screen.getByText('When would you like to be reminded?')).toBeTruthy();
      expect(screen.queryByText('Shall Emi tell you when it is near?')).toBeNull();
      expect(reminderLeads.map((lead) => screen.getByTestId(reminderTestID(lead)))).toHaveLength(3);
      expect(screen.getByTestId(reminderTestID('twoDaysBefore'))).toHaveTextContent(
        '2 days before',
      );
      expect(screen.getByTestId(reminderTestID('oneDayBefore'))).toHaveTextContent('1 day before');
      expect(screen.getByTestId(reminderTestID('onTheDay'))).toHaveTextContent(
        'On the expected start date',
      );
      for (const lead of reminderLeads) {
        expect(screen.getByTestId(reminderTestID(lead))).not.toBeSelected();
      }
      expect(screen.queryByTestId(reminderLineTestID)).toBeNull();
    });

    it('waits for a moment before "Turn on reminders" will go', async () => {
      await sheOpensEmi();
      await sheReachesTheReminder(herPeriodStarted);

      expect(screen.getByTestId(onboardingActionTestID)).toHaveTextContent('Turn on reminders');
      expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();

      await shePresses(reminderTestID('oneDayBefore'));

      expect(screen.getByTestId(reminderTestID('oneDayBefore'))).toBeSelected();
      expect(screen.getByTestId(onboardingActionTestID)).toBeEnabled();
      expect(screen.getByTestId(reminderLineTestID)).toHaveTextContent(
        'The reminder comes at 9 in the morning. Your period may start the next day.',
      );
    });

    it('says the hour the reminder comes at and what it means, for each moment she presses', async () => {
      await sheOpensEmi();
      await sheReachesTheReminder(herPeriodStarted);

      await shePresses(reminderTestID('twoDaysBefore'));
      expect(screen.getByTestId(reminderLineTestID)).toHaveTextContent(
        'The reminder comes at 9 in the morning. Your period may start about 2 days later.',
      );

      await shePresses(reminderTestID('onTheDay'));
      expect(screen.getByTestId(reminderLineTestID)).toHaveTextContent(
        'The reminder comes at 9 in the morning. Your period may start that day.',
      );
    });

    it('shows the lock screen words, which name Emi and never her period, whatever she presses', async () => {
      await sheOpensEmi();
      await sheReachesTheReminder(herPeriodStarted);

      expect(screen.getByTestId(reminderPreviewWordsTestID)).toHaveTextContent(
        'A reminder from Emi',
      );

      await shePresses(reminderTestID('onTheDay'));

      expect(screen.getByTestId(reminderPreviewWordsTestID)).toHaveTextContent(
        'A reminder from Emi',
      );
      expect(screen.getByTestId(reminderPreviewWordsTestID)).not.toHaveTextContent(/period/i);
      expect(screen.queryByText('Your forecast starts today.')).toBeNull();
    });

    it('draws no padlock line, because the welcome links to who can see her records', async () => {
      await sheOpensEmi();
      await sheReachesTheReminder(herPeriodStarted);

      expect(locksDrawnIn(screen.root)).toBe(0);
      expect(
        screen.queryByText(
          'This phone works it out and this phone raises it. Nothing about the reminder is sent anywhere.',
        ),
      ).toBeNull();
    });

    it('offers "Not now" under the button and Skip at the top, and a way back', async () => {
      await sheOpensEmi();
      await sheReachesTheReminder(herPeriodStarted);

      expect(screen.getByTestId(onboardingWayPastTestID)).toHaveTextContent('Not now');
      expect(screen.getByTestId(onboardingSkipTestID)).toBeTruthy();
      expect(screen.getByTestId(onboardingBackTestID)).toBeTruthy();
    });
  });

  describe('"Not now"', () => {
    it('goes on to her first forecast, asks the phone nothing and writes nothing', async () => {
      const app = await sheOpensEmi();
      await sheReachesTheReminder(herPeriodStarted);

      await shePresses(reminderTestID('twoDaysBefore'));
      await shePresses(onboardingWayPastTestID);

      expect(app.pathname()).toBe('/onboarding/first-forecast');
      expect(timesThePhoneAsked()).toBe(0);

      await sheFinishesTheFirstRun();

      expect(readSetting(herDatabase(), 'reminderLead')).toBeUndefined();
      expect(theRemindersOnThePhone()).toEqual([]);
    });
  });

  describe('"Turn on reminders", and the phone allows it', () => {
    it('asks the phone once, after the press and never before it', async () => {
      await sheOpensEmi();
      await sheReachesTheReminder(herPeriodStarted);
      await shePresses(reminderTestID('twoDaysBefore'));

      expect(timesThePhoneAsked()).toBe(0);

      await shePresses(onboardingActionTestID);

      await screen.findByTestId(firstForecastActionTestID);
      expect(timesThePhoneAsked()).toBe(1);
    });

    it('keeps her choice at the hold and puts the reminder on the phone at the moment promised', async () => {
      await sheOpensEmi();
      await sheAnswersEveryQuestion({
        periodStartedOn: herPeriodStarted,
        cycleLengthDays: herCycleLengthDays,
        reminder: 'twoDaysBefore',
      });
      await sheTapsSaveAndStart();

      expect(readSetting(herDatabase(), 'reminderLead')).toBe('twoDaysBefore');
      await waitFor(() => {
        expect(theRemindersOnThePhone()).toEqual([
          {
            identifier: reminderIdentifier,
            body: 'A reminder from Emi',
            at: theMomentSheWasPromised(2),
          },
        ]);
      });
    });
  });

  describe('"Turn on reminders", and the phone refuses', () => {
    beforeEach(() => {
      resetExpoNotifications('refuse');
    });

    it('goes on to her first forecast, and the first run never stops on the answer', async () => {
      const app = await sheOpensEmi();
      await sheReachesTheReminder(herPeriodStarted);
      await shePresses(reminderTestID('oneDayBefore'));
      await shePresses(onboardingActionTestID);

      await screen.findByTestId(firstForecastActionTestID);
      expect(app.pathname()).toBe('/onboarding/first-forecast');
    });

    it('writes no choice and schedules nothing', async () => {
      await sheOpensEmi();
      await sheAnswersEveryQuestion({
        periodStartedOn: herPeriodStarted,
        cycleLengthDays: herCycleLengthDays,
        reminder: 'oneDayBefore',
      });
      await sheTapsSaveAndStart();
      await act(async () => {
        await Promise.resolve();
      });

      expect(readSetting(herDatabase(), 'reminderLead')).toBeUndefined();
      expect(theRemindersOnThePhone()).toEqual([]);
    });

    it('does not ask again when she comes back to the screen in the same first run', async () => {
      await sheOpensEmi();
      await sheReachesTheReminder(herPeriodStarted);
      await shePresses(reminderTestID('oneDayBefore'));
      await shePresses(onboardingActionTestID);
      await screen.findByTestId(firstForecastActionTestID);

      await act(() => {
        router.back();
      });
      await shePresses(reminderTestID('onTheDay'));
      await shePresses(onboardingActionTestID);
      await screen.findByTestId(firstForecastActionTestID);

      expect(timesThePhoneAsked()).toBe(1);
    });
  });
});
