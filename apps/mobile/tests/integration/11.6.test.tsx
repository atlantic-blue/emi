import { join } from 'node:path';

import type { DayRecord, Feeling } from '@emi/crypto';
import { feelingValues } from '@emi/crypto';
import { addDays, symptomGroups } from '@emi/cycle';
import { screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { readDayLog } from '../../src/data/dayLogRepository';
import { words } from '../../src/language';
import { readProfile } from '../../src/data/profileRepository';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import { homePainLineTestID, logTodayTestID } from '../../src/features/home/HomeScreen';
import { homeCopy } from '../../src/features/home/copy';
import { logFlowGroupTestID } from '../../src/features/log/LogFlow';
import { painGroup } from '../../src/features/log/askedGroup';
import { dayTestID } from '../../src/features/onboarding/Calendar';
import { feelingTestID } from '../../src/features/onboarding/Feeling';
import { regularityTestID } from '../../src/features/onboarding/Regularity';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { feelingLabels, firstRunCopy } from '../../src/features/onboarding/copy';
import {
  type FirstRunRefusal,
  FirstRunError,
  completeFirstRun,
  statedFeeling,
} from '../../src/features/onboarding/firstRun';
import { openTestDatabase } from '../data/nodeDatabase';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herDatabase, herPhoneHolds } from '../fixtures/herPhone';
import { herProfileVault, herVault, theProfileVaultOnHerPhone } from '../fixtures/herVault';
import { sheAnswersEveryQuestion } from '../fixtures/theFirstRun';
import { sheHoldsTheRing } from '../fixtures/theHold';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

/** She says her period runs five days, which is the length the ring draws the period arc at. */
const sheSaysHerPeriodRuns = 5;

/** Two days back, so today is the third day of a period she said runs five. */
const insideHerPeriod = addDays(today, -2);

/** Ten days back, so today is the eleventh day of the same five day period, and outside it. */
const outsideHerPeriod = addDays(today, -10);

/** A day inside the ninety the first run reaches back over, for the walk through the questions. */
const herPeriodStarted = addDays(today, -5);

const herCycleLengthDays = 28;

/** The symptom she presses in the group the line opens, which is the first the catalogue offers. */
const theSymptomShePresses = 'cramps';

/**
 * Her phone as it stands when she opens Emi: one period start, the length she said her period
 * runs, and the answer she gave about how it feels.
 */
async function herPhone(periodStartedOn: string, answered: Feeling | undefined): Promise<void> {
  const records: readonly DayRecord[] = [aBleedingDay(periodStartedOn)];

  await herPhoneHolds(
    whenSheOpensIt,
    records,
    herCycleLengthDays,
    sheSaysHerPeriodRuns,
    undefined,
    answered,
  );
}

async function sheOpensEmi(at = '/'): Promise<{ pathname: () => string }> {
  const app = renderRouter(appDirectory, { initialUrl: at });

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
async function sheReachesTheFeeling(): Promise<void> {
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(dayTestID(herPeriodStarted));
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
}

/** Whether the line is on the glass at all, read by what it says rather than by its presence. */
function thePainLine(): string | undefined {
  const found = screen.queryByTestId(homePainLineTestID);

  return found === null ? undefined : homeCopy.painLine;
}

/** What today's record carries, opened under her own key, and nothing where no row exists. */
function theSymptomsRecordedToday(): readonly string[] {
  const row = readDayLog(herDatabase(), today);

  return row === undefined ? [] : (herVault().open(row.payload).symptoms ?? []);
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

describe('a hard period day offers the pain log first', () => {
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

  describe('the question she is asked after the regularity', () => {
    beforeEach(() => {
      theTourIsBehindHer();
    });

    it('is where the regularity hands her, whether she answered it or passed it by', async () => {
      const app = await sheOpensEmi();

      await shePresses(onboardingActionTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(dayTestID(herPeriodStarted));
      await shePresses(onboardingActionTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingActionTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(regularityTestID('regular'));
      await shePresses(onboardingActionTestID);

      expect(app.pathname()).toBe('/onboarding/feeling');
    });

    it('offers the three answers, with none of them chosen for her', async () => {
      const app = await sheOpensEmi();

      await sheReachesTheFeeling();

      expect(app.pathname()).toBe('/onboarding/feeling');
      for (const answer of feelingValues) {
        expect(screen.getByTestId(feelingTestID(answer))).toHaveTextContent(feelingLabels[answer]);
        expect(screen.getByTestId(feelingTestID(answer))).not.toBeChecked();
      }
    });

    it('waits for an answer before the way on is hers to press', async () => {
      await sheOpensEmi();

      await sheReachesTheFeeling();

      expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();

      await shePresses(feelingTestID('hard'));

      expect(screen.getByTestId(onboardingActionTestID)).not.toBeDisabled();
    });

    it('marks the answer she pressed, and moves the mark when she changes it', async () => {
      await sheOpensEmi();

      await sheReachesTheFeeling();
      await shePresses(feelingTestID('hard'));

      expect(screen.getByTestId(feelingTestID('hard'))).toBeChecked();
      expect(screen.getByTestId(feelingTestID('fine'))).not.toBeChecked();

      await shePresses(feelingTestID('fine'));

      expect(screen.getByTestId(feelingTestID('fine'))).toBeChecked();
      expect(screen.getByTestId(feelingTestID('hard'))).not.toBeChecked();
    });

    it('says the answer changes how Emi talks to her, and promises nothing more', async () => {
      await sheOpensEmi();

      await sheReachesTheFeeling();

      expect(screen.getByText(firstRunCopy.feeling.title)).toBeTruthy();
      // Each line is named on its own rather than read off the copy, so a line taken out of the
      // screen fails here instead of leaving a shorter list that still agrees with itself.
      expect(screen.getByText(words('onboarding.feeling.line.talks'))).toBeTruthy();
      expect(screen.getByText(words('onboarding.feeling.line.encrypted'))).toBeTruthy();
      expect(firstRunCopy.feeling.lines).toHaveLength(2);
    });

    it('hands her on to the goals, whether she answers it or passes it by', async () => {
      const app = await sheOpensEmi();

      await sheReachesTheFeeling();
      await shePresses(onboardingSkipTestID);

      expect(app.pathname()).toBe('/onboarding/goals');
    });
  });

  describe('her answer, at the hold', () => {
    beforeEach(() => {
      theTourIsBehindHer();
    });

    for (const answer of feelingValues) {
      it(`seals ${answer} in her profile, under the key her own phone drew`, async () => {
        await sheOpensEmi();

        await sheAnswersEveryQuestion({ periodStartedOn: herPeriodStarted, feeling: answer });
        await sheHoldsTheRing();

        expect(statedFeeling(herDatabase(), await theProfileVaultOnHerPhone())).toBe(answer);
      });
    }

    it('is left off her profile where she passed the question by', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({ periodStartedOn: herPeriodStarted });
      await sheHoldsTheRing();

      const held = readProfile(herDatabase(), await theProfileVaultOnHerPhone());

      expect(held?.cycleLengthDays).toBe(28);
      expect(held && 'feeling' in held).toBe(false);
    });

    it('is refused at the hold as well, so the screen is not the only thing holding it', () => {
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
              feeling: 'sad' as Feeling,
            },
            whenSheOpensIt,
          ),
        ),
      ).toBe('feeling-is-not-one-of-the-three');
      expect(readProfile(database, herProfileVault())).toBeUndefined();
    });
  });

  describe('the line on her home screen', () => {
    it('is there on a day inside her period, where she said it is hard', async () => {
      await herPhone(insideHerPeriod, 'hard');
      await sheOpensEmi();

      expect(thePainLine()).toBe(homeCopy.painLine);
    });

    it('is not there on the same day where she said she is fine with it', async () => {
      await herPhone(insideHerPeriod, 'fine');
      await sheOpensEmi();

      expect(thePainLine()).toBeUndefined();
      expect(screen.getByTestId(logTodayTestID)).toBeTruthy();
    });

    it('is not there on the same day where she said she wants to understand it', async () => {
      await herPhone(insideHerPeriod, 'understand');
      await sheOpensEmi();

      expect(thePainLine()).toBeUndefined();
    });

    it('is not there on the same day where she passed the question by', async () => {
      await herPhone(insideHerPeriod, undefined);
      await sheOpensEmi();

      expect(thePainLine()).toBeUndefined();
    });

    for (const answered of feelingValues) {
      it(`is not there on a day outside her period, where she said ${answered}`, async () => {
        await herPhone(outsideHerPeriod, answered);
        await sheOpensEmi();

        expect(thePainLine()).toBeUndefined();
      });
    }
  });

  describe('the log the line opens', () => {
    it('opens the pain group, and what she presses there is written to today', async () => {
      const app = await herPhone(insideHerPeriod, 'hard').then(() => sheOpensEmi());

      await shePresses(homePainLineTestID);

      expect(app.pathname()).toBe('/log');
      expect(screen.getByTestId(logFlowGroupTestID(painGroup))).toBeTruthy();

      await shePresses(`symptom-chip-${theSymptomShePresses}`);

      expect(theSymptomsRecordedToday()).toEqual([theSymptomShePresses]);
      expect(screen.getByTestId(`symptom-chip-${theSymptomShePresses}`)).toBeChecked();
    });

    it('takes the symptom off the day again when she presses it a second time', async () => {
      await herPhone(insideHerPeriod, 'hard');
      await sheOpensEmi();

      await shePresses(homePainLineTestID);
      await shePresses(`symptom-chip-${theSymptomShePresses}`);
      await shePresses(`symptom-chip-${theSymptomShePresses}`);

      const row = readDayLog(herDatabase(), today);
      const record = row === undefined ? undefined : herVault().open(row.payload);

      expect(theSymptomsRecordedToday()).toEqual([]);
      // The key comes off the record rather than holding an empty list, because the canonical
      // bytes are what another phone reads back and an empty list is an answer she never gave.
      expect(record !== undefined && 'symptoms' in record).toBe(false);
      expect(screen.getByTestId(`symptom-chip-${theSymptomShePresses}`)).not.toBeChecked();
    });

    it('keeps the flow the day already carries when she presses a symptom', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        [aBleedingDay(insideHerPeriod), aBleedingDay(today)],
        herCycleLengthDays,
        sheSaysHerPeriodRuns,
        undefined,
        'hard',
      );
      await sheOpensEmi();

      await shePresses(homePainLineTestID);
      await shePresses(`symptom-chip-${theSymptomShePresses}`);

      const row = readDayLog(herDatabase(), today);
      const record = row === undefined ? undefined : herVault().open(row.payload);

      expect(record?.flow).toBe('medium');
      expect(record?.symptoms).toEqual([theSymptomShePresses]);
    });

    it('draws no group at all for a woman who pressed the log itself', async () => {
      await herPhone(insideHerPeriod, 'hard');
      await sheOpensEmi();

      await shePresses(logTodayTestID);

      // Every group, not only the pain one, because the log she reached by the tab is the log she
      // reached yesterday and a group she did not ask for is a screen she did not ask for.
      for (const group of symptomGroups) {
        expect(screen.queryByTestId(logFlowGroupTestID(group))).toBeNull();
      }
      expect(screen.queryByTestId(`symptom-chip-${theSymptomShePresses}`)).toBeNull();
    });
  });
});
