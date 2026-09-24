import { join } from 'node:path';

import type { DayRecord, Goal } from '@emi/crypto';
import { goalValues } from '@emi/crypto';
import type { Forecast } from '@emi/cycle';
import { addDays } from '@emi/cycle';
import { screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { listCycles } from '../../src/data/cycleRepository';
import { readProfile } from '../../src/data/profileRepository';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import { words } from '../../src/language';
import {
  exportTestID,
  historyTestID,
  homeDoctorRecordTestID,
  homeFertileWindowTestID,
  homeScreenTestID,
  logTodayTestID,
  settingsTestID,
} from '../../src/features/home/HomeScreen';
import { homeCopy } from '../../src/features/home/copy';
import {
  fertileWindowEstimateTestID,
  fertileWindowRangeTestID,
} from '../../src/features/forecast/FertileWindow';
import { fertileWindowSentence, rangeSentence } from '../../src/features/forecast/copy';
import { forecastOf } from '../../src/features/forecast/fromCache';
import { dayTestID } from '../../src/features/onboarding/Calendar';
import { feelingTestID } from '../../src/features/onboarding/Feeling';
import { goalTestID } from '../../src/features/onboarding/Goals';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { firstRunCopy, goalLabels } from '../../src/features/onboarding/copy';
import {
  type FirstRunRefusal,
  FirstRunError,
  completeFirstRun,
  statedGoals,
} from '../../src/features/onboarding/firstRun';
import { openTestDatabase } from '../data/nodeDatabase';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herDatabase, herPhoneHolds } from '../fixtures/herPhone';
import { herProfileVault, herVault, theProfileVaultOnHerPhone } from '../fixtures/herVault';
import { sizedTextIn } from '../fixtures/renderedText';
import { sheAnswersEveryQuestion } from '../fixtures/theFirstRun';
import { sheHoldsTheRing } from '../fixtures/theHold';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

const herCycleLengthDays = 28;

/** Days. How long her period runs, which is what the ring draws until she logs an end of her own. */
const sheSaysHerPeriodRuns = 5;

/** A day inside the ninety the first run reaches back over, for the walk through the questions. */
const herPeriodStarted = addDays(today, -5);

/**
 * The word contract SCREEN-2 keeps small on the home screen, and the size in points it keeps it
 * under. The fertile window card is the first thing in the product to write it there.
 */
const theWordAStrangerWouldRead = 'fertile';
const theLargestItMayBeDrawn = 14;

/**
 * The days she bled, for a woman who has lived the cycles named. Each cycle starts one cycle
 * length before the one after it, so the last start is the cycle she is in today, and the count
 * of complete cycles is one less than the count of starts.
 */
function herCycles(starts: number): DayRecord[] {
  const thisCycleStarted = addDays(today, -1);
  const records: DayRecord[] = [];

  for (let back = starts - 1; back >= 0; back -= 1) {
    const started = addDays(thisCycleStarted, -back * herCycleLengthDays);

    for (let day = 0; day < sheSaysHerPeriodRuns; day += 1) {
      records.push(aBleedingDay(addDays(started, day)));
    }
  }

  return records;
}

/** Her phone before she opens it: the cycles she has lived, and what she asked Emi for. */
async function herPhone(starts: number, asked: readonly Goal[] | undefined): Promise<void> {
  await herPhoneHolds(
    whenSheOpensIt,
    herCycles(starts),
    herCycleLengthDays,
    sheSaysHerPeriodRuns,
    undefined,
    undefined,
    asked,
  );
}

async function sheOpensEmi(): Promise<{ pathname: () => string }> {
  const app = renderRouter(appDirectory, { initialUrl: '/' });

  await app;

  return { pathname: () => app.getPathname() };
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/** The four cards, already read, so the first thing she sees is the first question. */
function theTourIsBehindHer(): void {
  const database = herDatabase();

  migrate(database);
  writeSetting(database, 'tourSeenAt', whenSheOpensIt.toISOString());
}

/** Past every question before this one, standing on the one the screen cases are about. */
async function sheReachesTheGoals(): Promise<void> {
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(dayTestID(herPeriodStarted));
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
}

/** The forecast the screen was drawn from, read back off the cache the screen itself read. */
function theForecastSheIsLookingAt(): ReturnType<typeof forecastOf> {
  return forecastOf(listCycles(herDatabase()));
}

/** The same answer, where the case is about a woman whose phone has a window to draw. */
function herWindow(): Forecast {
  const result = theForecastSheIsLookingAt();

  if (result.kind !== 'forecast') {
    throw new Error('this phone has not lived cycles enough for a window to be drawn from');
  }

  return result;
}

/** Every run of text on her home screen that carries the word a stranger would read. */
function theWordAStrangerCouldRead(): { text: string; points: number | undefined }[] {
  return sizedTextIn(screen.getByTestId(homeScreenTestID)).filter(({ text }) =>
    text.toLowerCase().includes(theWordAStrangerWouldRead),
  );
}

/** The refusal a call gives, so a case names the rule rather than the wording of a message. */
function refusalFrom(run: () => void): FirstRunRefusal {
  try {
    run();
  } catch (error) {
    if (error instanceof FirstRunError) {
      return error.refusal;
    }
    throw error;
  }
  throw new Error('the first run accepted an answer it is written to refuse');
}

describe('the fertile window shows only for her who asked for it', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the question she is asked after the feeling', () => {
    beforeEach(() => {
      theTourIsBehindHer();
    });

    it('is where the feeling hands her, whether she answered it or passed it by', async () => {
      const app = await sheOpensEmi();

      await shePresses(onboardingActionTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(dayTestID(herPeriodStarted));
      await shePresses(onboardingActionTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingActionTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(feelingTestID('hard'));
      await shePresses(onboardingActionTestID);

      expect(app.pathname()).toBe('/onboarding/goals');
    });

    it('offers the four goals, with none of them chosen for her', async () => {
      const app = await sheOpensEmi();

      await sheReachesTheGoals();

      expect(app.pathname()).toBe('/onboarding/goals');
      for (const goal of goalValues) {
        expect(screen.getByTestId(goalTestID(goal))).toHaveTextContent(goalLabels[goal]);
        expect(screen.getByTestId(goalTestID(goal))).not.toBeChecked();
      }
    });

    it('waits for a goal before the way on is hers to press', async () => {
      await sheOpensEmi();

      await sheReachesTheGoals();

      expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();

      await shePresses(goalTestID('fertileWindow'));

      expect(screen.getByTestId(onboardingActionTestID)).not.toBeDisabled();
    });

    it('keeps every goal she presses, because she may want more than one', async () => {
      await sheOpensEmi();

      await sheReachesTheGoals();
      await shePresses(goalTestID('fertileWindow'));
      await shePresses(goalTestID('doctorRecord'));

      expect(screen.getByTestId(goalTestID('fertileWindow'))).toBeChecked();
      expect(screen.getByTestId(goalTestID('doctorRecord'))).toBeChecked();
      expect(screen.getByTestId(goalTestID('forecast'))).not.toBeChecked();
    });

    it('takes a goal off again when she presses it a second time', async () => {
      await sheOpensEmi();

      await sheReachesTheGoals();
      await shePresses(goalTestID('fertileWindow'));
      await shePresses(goalTestID('fertileWindow'));

      expect(screen.getByTestId(goalTestID('fertileWindow'))).not.toBeChecked();
      expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();
    });

    it('says Emi encrypts her answers on this phone, and promises nothing else', async () => {
      await sheOpensEmi();

      await sheReachesTheGoals();

      expect(screen.getByText(firstRunCopy.goals.title)).toBeTruthy();
      // Each line is named on its own rather than read off the copy, so a line taken out of the
      // screen fails here instead of leaving a shorter list that still agrees with itself.
      expect(screen.getByText(words('onboarding.goals.line.chooseAll'))).toBeTruthy();
      expect(screen.getByText(words('onboarding.goals.line.encrypted'))).toBeTruthy();
      expect(firstRunCopy.goals.lines).toHaveLength(2);
    });

    it('hands her on to the focus, whether she answers it or passes it by', async () => {
      const app = await sheOpensEmi();

      await sheReachesTheGoals();
      await shePresses(onboardingSkipTestID);

      expect(app.pathname()).toBe('/onboarding/focus');
    });
  });

  describe('her answers, at the hold', () => {
    beforeEach(() => {
      theTourIsBehindHer();
    });

    for (const goal of goalValues) {
      it(`seals ${goal} in her profile, under the key her own phone drew`, async () => {
        await sheOpensEmi();

        await sheAnswersEveryQuestion({ periodStartedOn: herPeriodStarted, goals: [goal] });
        await sheHoldsTheRing();

        expect(statedGoals(herDatabase(), await theProfileVaultOnHerPhone())).toEqual([goal]);
      });
    }

    it('keeps the two she pressed and leaves the two she did not off her profile', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({
        periodStartedOn: herPeriodStarted,
        goals: ['doctorRecord', 'fertileWindow'],
      });
      await sheHoldsTheRing();

      expect(statedGoals(herDatabase(), await theProfileVaultOnHerPhone())).toEqual([
        'doctorRecord',
        'fertileWindow',
      ]);
    });

    it('forgets the goals she pressed before she pressed the way past it', async () => {
      await sheOpensEmi();

      await sheReachesTheGoals();
      await shePresses(goalTestID('fertileWindow'));
      await shePresses(goalTestID('doctorRecord'));
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await sheHoldsTheRing();

      const held = readProfile(herDatabase(), await theProfileVaultOnHerPhone());

      expect(held && 'goals' in held).toBe(false);
      // The screen she lands on is read as well, because a Skip that kept her presses would show
      // itself here as a card she never asked for.
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(screen.queryByTestId(homeDoctorRecordTestID)).toBeNull();
    });

    it('is left off her profile where she passed the question by', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({ periodStartedOn: herPeriodStarted });
      await sheHoldsTheRing();

      const held = readProfile(herDatabase(), await theProfileVaultOnHerPhone());

      expect(held?.cycleLengthDays).toBe(28);
      expect(held && 'goals' in held).toBe(false);
    });

    it('refuses a goal Emi never offered, so the screen is not the only thing holding it', () => {
      const database = openTestDatabase();
      migrate(database);

      expect(
        refusalFrom(() =>
          completeFirstRun(
            database,
            { day: herVault(), profile: herProfileVault() },
            {
              periodStartedOn: herPeriodStarted,
              cycleLengthDays: herCycleLengthDays,
              goals: ['loseWeight' as Goal],
            },
            whenSheOpensIt,
          ),
        ),
      ).toBe('goal-is-not-one-of-the-four');
      expect(readProfile(database, herProfileVault())).toBeUndefined();
    });

    it('refuses the same goal twice, because a list she built by tapping holds each one once', () => {
      const database = openTestDatabase();
      migrate(database);

      expect(
        refusalFrom(() =>
          completeFirstRun(
            database,
            { day: herVault(), profile: herProfileVault() },
            {
              periodStartedOn: herPeriodStarted,
              cycleLengthDays: herCycleLengthDays,
              goals: ['symptoms', 'symptoms'],
            },
            whenSheOpensIt,
          ),
        ),
      ).toBe('goal-is-chosen-twice');
      expect(readProfile(database, herProfileVault())).toBeUndefined();
    });
  });

  describe('the fertile window on her home screen', () => {
    it('is there for a woman who asked to see it', async () => {
      await herPhone(3, ['fertileWindow']);
      await sheOpensEmi();

      expect(screen.getByTestId(homeFertileWindowTestID)).toBeTruthy();
      expect(screen.getByTestId(fertileWindowRangeTestID)).toHaveTextContent(
        rangeSentence(herWindow().fertileWindow),
      );
    });

    it('says it is an estimate, and that no day is called a safe one', async () => {
      await herPhone(3, ['fertileWindow']);
      await sheOpensEmi();

      expect(screen.getByTestId(fertileWindowEstimateTestID)).toHaveTextContent(
        fertileWindowSentence(herWindow()),
      );
    });

    it('is not there for a woman who asked for the other three', async () => {
      await herPhone(3, ['forecast', 'symptoms', 'doctorRecord']);
      await sheOpensEmi();

      expect(screen.queryByTestId(homeFertileWindowTestID)).toBeNull();
    });

    it('is not there for a woman who passed the question by', async () => {
      await herPhone(3, undefined);
      await sheOpensEmi();

      expect(screen.queryByTestId(homeFertileWindowTestID)).toBeNull();
    });

    it('is not drawn while Emi is still learning, because there is no window yet', async () => {
      await herPhone(1, ['fertileWindow']);
      await sheOpensEmi();

      expect(theForecastSheIsLookingAt().kind).toBe('learning');
      expect(screen.queryByTestId(homeFertileWindowTestID)).toBeNull();
    });

    it('keeps the word small, because the person beside her on the bus reads it too', async () => {
      await herPhone(3, ['fertileWindow']);
      await sheOpensEmi();

      const runs = theWordAStrangerCouldRead();

      expect(runs.length).toBeGreaterThan(0);
      expect(
        runs.filter((run) => run.points === undefined || run.points > theLargestItMayBeDrawn),
      ).toEqual([]);
    });
  });

  describe('the way to the export on her home screen', () => {
    it('is there for a woman who asked to keep a record for her doctor', async () => {
      await herPhone(3, ['doctorRecord']);
      await sheOpensEmi();

      expect(screen.getByTestId(homeDoctorRecordTestID)).toHaveTextContent(homeCopy.doctorRecord);
    });

    it('opens the export she was offered when she presses it', async () => {
      await herPhone(3, ['doctorRecord']);
      const app = await sheOpensEmi();

      await shePresses(homeDoctorRecordTestID);

      expect(app.pathname()).toBe('/export');
    });

    it('is not there for a woman who asked for the other three', async () => {
      await herPhone(3, ['forecast', 'symptoms', 'fertileWindow']);
      await sheOpensEmi();

      expect(screen.queryByTestId(homeDoctorRecordTestID)).toBeNull();
    });

    it('is not there for a woman who passed the question by', async () => {
      await herPhone(3, undefined);
      await sheOpensEmi();

      expect(screen.queryByTestId(homeDoctorRecordTestID)).toBeNull();
    });
  });

  describe('the home screen of a woman who asked Emi for nothing', () => {
    it('is the screen she read before the question was ever asked', async () => {
      await herPhone(3, undefined);
      await sheOpensEmi();

      expect(screen.queryByTestId(homeFertileWindowTestID)).toBeNull();
      expect(screen.queryByTestId(homeDoctorRecordTestID)).toBeNull();
      // The ways off the screen are named one at a time, so a card that arrived by taking the
      // place of one of them fails here rather than passing on the two absences above.
      expect(screen.getByTestId(logTodayTestID)).toBeTruthy();
      expect(screen.getByTestId(historyTestID)).toBeTruthy();
      expect(screen.getByTestId(exportTestID)).toBeTruthy();
      expect(screen.getByTestId(settingsTestID)).toBeTruthy();
    });

    it('keeps the way to the export she has always had, beside the card she was given', async () => {
      await herPhone(3, ['doctorRecord']);
      await sheOpensEmi();

      expect(screen.getByTestId(exportTestID)).toBeTruthy();
      expect(screen.getByTestId(homeDoctorRecordTestID)).toBeTruthy();
    });
  });
});
