import { join } from 'node:path';

import { type DayRecord } from '@emi/crypto';
import { type Symptom, addDays, symptoms } from '@emi/cycle';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { AccessibilityInfo, AppState } from 'react-native';

import { readSettings } from '../../src/data/settingRepository';
import { historyScreenTestID } from '../../src/features/history/HistoryScreen';
import { cycleSentence } from '../../src/features/history/copy';
import { historyTestID, homeScreenTestID } from '../../src/features/home/HomeScreen';
import { coverTestID } from '../../src/features/lock/Cover';
import { lockScreenTestID, unlockTestID } from '../../src/features/lock/LockScreen';
import { lockCopy } from '../../src/features/lock/copy';
import { lockOn, setLockOnReturn } from '../../src/features/lock/lockSetting';
import { longerTestID } from '../../src/features/onboarding/CycleLength';
import { dayTestID } from '../../src/features/onboarding/LastPeriod';
import { onboardingActionTestID } from '../../src/features/onboarding/OnboardingScreen';
import { tourSkipTestID } from '../../src/features/onboarding/TourScreen';
import { resetExpoSqlite } from '../data/expoSqlite';
import {
  cancelled,
  promptsAsked,
  resetExpoLocalAuthentication,
  sheAnswersThePrompt,
  thePhoneHasNothingEnrolled,
  unlocked,
} from '../fixtures/expoLocalAuthentication';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { sheHoldsTheRing } from '../fixtures/theHold';
import { aBleedingDay, dayOf, herDatabase, herPhoneHolds } from '../fixtures/herPhone';
import { visibleTextIn } from '../fixtures/renderedText';
import {
  listenersOnTheAppState,
  resetTheAppState,
  sheComesBackToEmi,
  sheLeavesEmi,
  sheLeavesEmiWithNoInactiveState,
  sheOpensTheSwitcher,
} from '../fixtures/thePhoneMoves';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));
jest.mock('expo-local-authentication', () =>
  jest.requireActual('../fixtures/expoLocalAuthentication'),
);

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

const today = dayOf(whenSheOpensIt);
const herCycleLengthDays = 28;
const herPeriodDays = 4;

/** Thirteen days behind her, so the cycle she is in today is nowhere near its end. */
const herLastPeriodStarted = addDays(today, -13);

const herPeriodStarts: readonly string[] = [6, 5, 4, 3, 2, 1, 0].map((back) =>
  addDays(herLastPeriodStarted, -back * herCycleLengthDays),
);

const inTheCatalogue = symptoms.find((each) => each.slug === 'cramps');

if (inTheCatalogue === undefined) {
  throw new Error('the catalogue no longer holds cramps, so this test names nothing she logged');
}

/** The one symptom she logs before every period, which is what the history screen names back. */
const theSymptom: Symptom = inTheCatalogue;

/** Her year: seven periods, and cramps three days before the six that closed a cycle. */
function herYear(): DayRecord[] {
  const bleeding = herPeriodStarts.flatMap((start) =>
    Array.from({ length: herPeriodDays }, (_unused, day) => aBleedingDay(addDays(start, day))),
  );
  const cramping = herPeriodStarts.slice(1).map((start) => ({
    day: addDays(start, -3),
    symptoms: [theSymptom.slug],
    recordedAt: `${addDays(start, -3)}T20:00:00.000Z`,
  }));

  return [...bleeding, ...cramping];
}

/** A cycle she lived, written the way the history screen writes it, so the text is not invented. */
function aCycleSheReads(): string {
  const started = herPeriodStarts[0] as string;
  const ended = addDays(herPeriodStarts[1] as string, -1);

  return cycleSentence(started, ended);
}

async function sheOpensEmi(at = '/'): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: at });
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/** Everything she can actually read, which is not everything the tree holds. */
function whatSheCanRead(): string[] {
  return visibleTextIn(screen.toJSON());
}

/**
 * A screen found however well it is hidden, so an assertion that it is out of the layout is an
 * assertion about the layout and not about whether the query could reach it.
 */
function theScreenEvenWhenHidden(testID: string) {
  return screen.getByTestId(testID, { includeHiddenElements: true });
}

describe('the lock shows when she comes back to the application', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
    resetExpoLocalAuthentication();
    resetTheAppState();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('a fresh install', () => {
    it('holds the lock on, read from the settings the first run wrote', async () => {
      await sheOpensEmi();

      // A fresh install opens on the tour, so the way out of it comes before the first question.
      await shePresses(tourSkipTestID);
      await shePresses(onboardingActionTestID);
      await shePresses(dayTestID(addDays(today, -2)));
      await shePresses(onboardingActionTestID);
      await shePresses(longerTestID);
      await shePresses(onboardingActionTestID);
      await sheHoldsTheRing();

      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(readSettings(herDatabase()).lockOnReturn).toBe(lockOn);
    });

    it('locks when she comes back, without her ever having chosen it', async () => {
      await herPhoneHolds(whenSheOpensIt, herYear(), herCycleLengthDays);
      await sheOpensEmi();
      sheAnswersThePrompt(unlocked);

      await sheLeavesEmi();
      await sheComesBackToEmi();

      expect(promptsAsked()).toHaveLength(1);
    });
  });

  describe('the moment Emi leaves the foreground', () => {
    beforeEach(async () => {
      await herPhoneHolds(whenSheOpensIt, herYear(), herCycleLengthDays);
      await sheOpensEmi();
      await shePresses(historyTestID);
    });

    it('covers her screen before the picture of Emi is taken', async () => {
      expect(screen.getByTestId(historyScreenTestID)).toBeVisible();

      await sheOpensTheSwitcher();

      expect(screen.getByTestId(coverTestID)).toBeVisible();
      expect(theScreenEvenWhenHidden(historyScreenTestID)).not.toBeVisible();
      expect(whatSheCanRead()).not.toContain(aCycleSheReads());
      // Nothing under the cover can be reached by a screen reader either, which is why no default
      // query finds it.
      expect(screen.queryByTestId(historyScreenTestID)).toBeNull();
    });

    it('carries no day, no date and no symptom on the cover', async () => {
      expect(whatSheCanRead()).toContain(aCycleSheReads());
      expect(whatSheCanRead()).toContain(theSymptom.name);

      await sheOpensTheSwitcher();

      expect(whatSheCanRead()).toEqual([lockCopy.cover.wordmark]);
    });

    it('covers her screen on a phone that never reports inactive', async () => {
      await sheLeavesEmiWithNoInactiveState();

      expect(screen.getByTestId(coverTestID)).toBeVisible();
      expect(whatSheCanRead()).toEqual([lockCopy.cover.wordmark]);
    });
  });

  describe('when she comes back', () => {
    beforeEach(async () => {
      await herPhoneHolds(whenSheOpensIt, herYear(), herCycleLengthDays);
      await sheOpensEmi();
      await shePresses(historyTestID);
    });

    it('gives her her own screen back once the phone says yes', async () => {
      sheAnswersThePrompt(unlocked);

      await sheLeavesEmi();
      await sheComesBackToEmi();

      expect(screen.getByTestId(historyScreenTestID)).toBeVisible();
      expect(screen.queryByTestId(lockScreenTestID)).toBeNull();
      expect(screen.queryByTestId(coverTestID)).toBeNull();
      expect(whatSheCanRead()).toContain(theSymptom.name);
    });

    it('asks the phone with a prompt Emi wrote, and leaves the passcode fallback on', async () => {
      sheAnswersThePrompt(unlocked);

      await sheLeavesEmi();
      await sheComesBackToEmi();

      expect(promptsAsked()).toEqual([
        {
          promptMessage: lockCopy.prompt,
          cancelLabel: lockCopy.cancel,
          disableDeviceFallback: false,
        },
      ]);
    });

    it('keeps her own screen out of the layout while the phone has not said yes', async () => {
      sheAnswersThePrompt(cancelled);

      await sheLeavesEmi();
      await sheComesBackToEmi();

      expect(screen.getByTestId(lockScreenTestID)).toBeVisible();
      expect(theScreenEvenWhenHidden(historyScreenTestID)).not.toBeVisible();
      expect(whatSheCanRead()).not.toContain(theSymptom.name);
    });

    it('says Emi is still locked, and asks the phone again when she presses Unlock', async () => {
      sheAnswersThePrompt(cancelled, unlocked);

      await sheLeavesEmi();
      await sheComesBackToEmi();

      expect(screen.getByText(lockCopy.locked.refused)).toBeVisible();

      await shePresses(unlockTestID);

      expect(promptsAsked()).toHaveLength(2);
      expect(screen.getByTestId(historyScreenTestID)).toBeVisible();
    });
  });

  describe('a phone with nothing enrolled', () => {
    it('does not hold her out of her own history', async () => {
      await herPhoneHolds(whenSheOpensIt, herYear(), herCycleLengthDays);
      await sheOpensEmi();
      await shePresses(historyTestID);
      thePhoneHasNothingEnrolled();

      await sheLeavesEmi();
      await sheComesBackToEmi();

      expect(screen.getByTestId(historyScreenTestID)).toBeVisible();
      expect(promptsAsked()).toEqual([]);
    });
  });

  describe('a lock she has turned off', () => {
    it('gives her her screen back with no prompt at all', async () => {
      await herPhoneHolds(whenSheOpensIt, herYear(), herCycleLengthDays);
      setLockOnReturn(herDatabase(), false);
      await sheOpensEmi();
      await shePresses(historyTestID);

      await sheLeavesEmi();
      await sheComesBackToEmi();

      expect(screen.getByTestId(historyScreenTestID)).toBeVisible();
      expect(promptsAsked()).toEqual([]);
    });

    it('still covers her screen while Emi is not in front', async () => {
      await herPhoneHolds(whenSheOpensIt, herYear(), herCycleLengthDays);
      setLockOnReturn(herDatabase(), false);
      await sheOpensEmi();
      await shePresses(historyTestID);

      await sheOpensTheSwitcher();

      expect(whatSheCanRead()).toEqual([lockCopy.cover.wordmark]);
    });
  });

  describe('the listener Emi holds on the phone', () => {
    it('is one, and it goes when Emi does', async () => {
      await herPhoneHolds(whenSheOpensIt, herYear(), herCycleLengthDays);
      const app = renderRouter(appDirectory, { initialUrl: '/' });
      const view = await app;

      expect(listenersOnTheAppState()).toBe(1);

      const subscription = (AppState.addEventListener as unknown as jest.Mock).mock.results[0]
        ?.value as { remove: jest.Mock };
      await view.unmount();

      expect(subscription.remove).toHaveBeenCalled();
    });
  });
});
