import { join } from 'node:path';

import type { DayRecord, Regularity } from '@emi/crypto';
import { regularityValues } from '@emi/crypto';
import { screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { readProfile } from '../../src/data/profileRepository';
import { listCycles } from '../../src/data/cycleRepository';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import {
  nextPeriodMovesTestID,
  nextPeriodRangeTestID,
} from '../../src/features/forecast/NextPeriod';
import { learningTestID } from '../../src/features/forecast/Learning';
import { forecastCopy, rangeSentence } from '../../src/features/forecast/copy';
import { forecastOf } from '../../src/features/forecast/fromCache';
import { homeForecastTestID } from '../../src/features/home/HomeScreen';
import { dayTestID } from '../../src/features/onboarding/Calendar';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { regularityTestID } from '../../src/features/onboarding/Regularity';
import { firstRunCopy, regularityLabels } from '../../src/features/onboarding/copy';
import {
  type FirstRunRefusal,
  FirstRunError,
  completeFirstRun,
  statedRegularity,
} from '../../src/features/onboarding/firstRun';
import {
  daysOf,
  startsOf,
  veryRegular,
} from '../../../../packages/cycle/tests/fixtures/recordedSets';
import { openTestDatabase } from '../data/nodeDatabase';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { herDatabase, herPhoneHolds } from '../fixtures/herPhone';
import { herProfileVault, herVault, theProfileVaultOnHerPhone } from '../fixtures/herVault';
import { sheAnswersEveryQuestion } from '../fixtures/theFirstRun';
import { sheHoldsTheRing } from '../fixtures/theHold';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/**
 * Midday on the eighth day of the cycle that opens after the six `veryRegular` records, so her
 * phone holds six complete cycles and the forecast is a range rather than the learning state.
 */
const whenSheOpensIt = new Date('2026-06-29T12:00:00.000Z');

/** A day inside the ninety the first run reaches back over, for the walk through the questions. */
const herPeriodStarted = '2026-06-24';

/** Not 28, so a screen showing it read her own answer rather than the number Emi opens on. */
const herCycleLengthDays = 31;

/** The three answers, and the fourth thing she can do, which is to give none of them. */
const theFourWaysPast: readonly (Regularity | undefined)[] = [...regularityValues, undefined];

/** Her days, stamped with the morning of each one, which is how a screen writes them. */
function herSixCycles(): DayRecord[] {
  return daysOf(veryRegular).map((day) => ({ ...day, recordedAt: `${day.day}T08:00:00.000Z` }));
}

/**
 * The period she is in and nothing behind it, which leaves no complete cycle and so leaves the
 * forecast still learning. There is no range on that screen, so there is nothing to sit under.
 */
function herFirstPeriodOnly(): DayRecord[] {
  const theCycleSheIsIn = startsOf(veryRegular)[veryRegular.lengths.length];

  if (theCycleSheIsIn === undefined) {
    throw new Error('the recorded set names no cycle she is still in');
  }

  return herSixCycles().filter((day) => day.day >= theCycleSheIsIn);
}

/** Her phone as it stands when she opens Emi, with the answer she gave sealed in her profile. */
async function herPhone(
  records: readonly DayRecord[],
  answered: Regularity | undefined,
): Promise<void> {
  await herPhoneHolds(whenSheOpensIt, records, herCycleLengthDays, undefined, answered);
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
async function sheReachesTheRegularity(): Promise<void> {
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(dayTestID(herPeriodStarted));
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
}

/** The two ends of the range, as the screen writes them, read off the block she is looking at. */
function theRangeReads(): string {
  return String(screen.getByTestId(nextPeriodRangeTestID).props.children);
}

/** Whether the sentence about a cycle that moves is on the glass at all. */
function theMovesSentence(): string | undefined {
  const found = screen.queryByTestId(nextPeriodMovesTestID);

  return found === null ? undefined : String(found.props.children);
}

/**
 * The range her own days produce, taken from the cache the writes rebuilt rather than from the
 * screen under test, so a case compares two answers and never one answer with itself.
 */
function theRangeHerDaysProduce(): string {
  const forecast = forecastOf(listCycles(herDatabase()));

  if (forecast.kind !== 'forecast') {
    throw new Error('her recorded days left the forecast still learning');
  }

  return rangeSentence(forecast.start);
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

describe('her answer changes the words, never the range', () => {
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

  describe('the question she is asked after her period length', () => {
    beforeEach(() => {
      theTourIsBehindHer();
    });

    it('offers the three answers, with none of them chosen for her', async () => {
      const app = await sheOpensEmi();

      await sheReachesTheRegularity();

      expect(app.pathname()).toBe('/onboarding/regularity');
      for (const answer of regularityValues) {
        expect(screen.getByTestId(regularityTestID(answer))).toHaveTextContent(
          regularityLabels[answer],
        );
        expect(screen.getByTestId(regularityTestID(answer))).not.toBeChecked();
      }
    });

    it('waits for an answer before the way on is hers to press', async () => {
      await sheOpensEmi();

      await sheReachesTheRegularity();

      expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();

      await shePresses(regularityTestID('moves'));

      expect(screen.getByTestId(onboardingActionTestID)).not.toBeDisabled();
    });

    it('marks the answer she pressed, and moves the mark when she changes it', async () => {
      await sheOpensEmi();

      await sheReachesTheRegularity();
      await shePresses(regularityTestID('moves'));

      expect(screen.getByTestId(regularityTestID('moves'))).toBeChecked();
      expect(screen.getByTestId(regularityTestID('regular'))).not.toBeChecked();

      await shePresses(regularityTestID('regular'));

      expect(screen.getByTestId(regularityTestID('regular'))).toBeChecked();
      expect(screen.getByTestId(regularityTestID('moves'))).not.toBeChecked();
    });

    it('says the answer changes how Emi explains the forecast, and promises nothing more', async () => {
      await sheOpensEmi();

      await sheReachesTheRegularity();

      expect(screen.getByText(firstRunCopy.regularity.title)).toBeTruthy();
      for (const line of firstRunCopy.regularity.lines) {
        expect(screen.getByText(line)).toBeTruthy();
      }
      expect(screen.queryByText(forecastCopy.cycleMoves)).toBeNull();
    });

    it('hands her to the hold, whether she answers it or passes it by', async () => {
      const app = await sheOpensEmi();

      await sheReachesTheRegularity();
      await shePresses(onboardingSkipTestID);

      expect(app.pathname()).toBe('/onboarding/hold');
    });
  });

  describe('her answer, at the hold', () => {
    beforeEach(() => {
      theTourIsBehindHer();
    });

    for (const answer of regularityValues) {
      it(`seals ${answer} in her profile, under the key her own phone drew`, async () => {
        await sheOpensEmi();

        await sheAnswersEveryQuestion({
          periodStartedOn: herPeriodStarted,
          regularity: answer,
        });
        await sheHoldsTheRing();

        expect(statedRegularity(herDatabase(), await theProfileVaultOnHerPhone())).toBe(answer);
      });
    }

    it('is left off her profile where she passed the question by', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({ periodStartedOn: herPeriodStarted });
      await sheHoldsTheRing();

      const held = readProfile(herDatabase(), await theProfileVaultOnHerPhone());

      expect(held?.cycleLengthDays).toBe(28);
      expect(held && 'regularity' in held).toBe(false);
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
              regularity: 'sometimes' as Regularity,
            },
            whenSheOpensIt,
          ),
        ),
      ).toBe('regularity-is-not-one-of-the-three');
      expect(readProfile(database, herProfileVault())).toBeUndefined();
    });
  });

  describe('the sentence under the forecast range', () => {
    it('is there where she said her cycle moves', async () => {
      await herPhone(herSixCycles(), 'moves');
      await sheOpensEmi();

      expect(theMovesSentence()).toBe(forecastCopy.cycleMoves);
      expect(screen.getByTestId(homeForecastTestID)).toBeTruthy();
    });

    it('is not there where she said it comes at the same time', async () => {
      await herPhone(herSixCycles(), 'regular');
      await sheOpensEmi();

      expect(theRangeReads()).toBe(theRangeHerDaysProduce());
      expect(theMovesSentence()).toBeUndefined();
    });

    it('is not there where she said she does not know yet', async () => {
      await herPhone(herSixCycles(), 'unknown');
      await sheOpensEmi();

      expect(theMovesSentence()).toBeUndefined();
    });

    it('is not there where she passed the question by', async () => {
      await herPhone(herSixCycles(), undefined);
      await sheOpensEmi();

      expect(theMovesSentence()).toBeUndefined();
    });

    it('is nowhere at all before two cycles, because there is no range to explain', async () => {
      await herPhone(herFirstPeriodOnly(), 'moves');
      await sheOpensEmi();

      expect(screen.getByTestId(learningTestID)).toBeTruthy();
      expect(screen.queryByTestId(nextPeriodRangeTestID)).toBeNull();
      expect(theMovesSentence()).toBeUndefined();
    });
  });

  describe('the range itself', () => {
    for (const answered of theFourWaysPast) {
      it(`reads the same where she answered ${answered ?? 'nothing'}`, async () => {
        await herPhone(herSixCycles(), answered);
        const wanted = theRangeHerDaysProduce();
        await sheOpensEmi();

        expect(theRangeReads()).toBe(wanted);
      });
    }
  });
});
