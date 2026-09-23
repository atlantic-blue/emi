import { join } from 'node:path';

import type { DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import { FULL_TURN_DEGREES, GAP_DEGREES, RING_DIAMETER, phaseLabel, phaseNames } from '@emi/tokens';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { cycleRingTestID, ringArcTestID } from '../../src/components/CycleRing';
import { dayTestID } from '../../src/features/onboarding/Calendar';
import { readProfile } from '../../src/data/profileRepository';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import {
  fewerDaysTestID,
  moreDaysTestID,
  periodLengthTestID,
} from '../../src/features/onboarding/PeriodLength';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { firstRunCopy, periodLengthDaysLabel } from '../../src/features/onboarding/copy';
import {
  type FirstRunRefusal,
  FirstRunError,
  completeFirstRun,
  defaultPeriodLengthDays,
  maximumPeriodLengthDays,
  minimumPeriodLengthDays,
  statedPeriodLengthDays,
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

/** Five days before today, which puts her on the sixth day of the cycle she is in. */
const herPeriodStarted = addDays(today, -5);
const sheIsOnCycleDay = 6;

/** She has no cycle behind this one, so the ring is drawn at the length she stated. */
const herCycleLengthDays = 28;

/** Longer than the days she has logged, so the two answers cannot be mistaken for each other. */
const sheSaysHerPeriodRuns = 7;

/** A day she recorded and did not bleed on, which is the thing that closes a period. */
function aDryDay(day: string): DayRecord {
  return { day, flow: 'none', recordedAt: `${day}T08:00:00.000Z` };
}

/** The first two days of this period, logged, with nothing after them to close it. */
function aPeriodStillRunning(): DayRecord[] {
  return [aBleedingDay(herPeriodStarted), aBleedingDay(addDays(herPeriodStarted, 1))];
}

/** Four days of bleeding and then a day she recorded no bleeding on, which closes the period. */
function aPeriodSheClosedAfter(days: number): DayRecord[] {
  const records: DayRecord[] = [];

  for (let day = 0; day < days; day += 1) {
    records.push(aBleedingDay(addDays(herPeriodStarted, day)));
  }
  records.push(aDryDay(addDays(herPeriodStarted, days)));

  return records;
}

interface OpenApp {
  readonly pathname: () => string;
}

async function sheOpensEmi(at = '/'): Promise<OpenApp> {
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
async function sheReachesThePeriodLength(): Promise<void> {
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(dayTestID(herPeriodStarted));
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingActionTestID);
}

/** What she reads on the stepper, which is the answer this question is asking for. */
function theStepperReads(): string {
  return String(screen.getByTestId(periodLengthTestID).props.children);
}

const centre = RING_DIAMETER / 2;

/** The last point of an arc path, which is where that arc stops on the track. */
const ENDS_AT = /([\d.-]+) ([\d.-]+)$/;

/** Where a point on the track sits, in degrees clockwise from the top, as `pointOnRing` puts it. */
function degreesAt(x: number, y: number): number {
  const turned = (Math.atan2(y - centre, x - centre) * 180) / Math.PI + 90;

  return turned < 0 ? turned + FULL_TURN_DEGREES : turned;
}

/** Every phase the ring drew an arc for, which is every phase her cycle had a day for. */
function thePhasesDrawn(): number {
  return phaseNames.filter(
    (phase) =>
      screen.queryByTestId(ringArcTestID(phase, 'elapsed')) !== null ||
      screen.queryByTestId(ringArcTestID(phase, 'ahead')) !== null,
  ).length;
}

/**
 * How many days the period arc covers, measured off the drawing rather than read out of the
 * arithmetic that made it. The period arc opens the ring at the top, so where it stops is the
 * whole of it, and the days it stands for are that share of the turn the arcs were given.
 */
function thePeriodArcCoversDays(): number {
  const drawn = ['ahead', 'elapsed'] as const;
  const ends = drawn
    .map((strength) => screen.queryByTestId(ringArcTestID('period', strength)))
    .filter((arc) => arc !== null)
    .map((arc) => ENDS_AT.exec(String(arc.props.d)))
    .filter((found) => found !== null)
    .map((found) => degreesAt(Number(found[1]), Number(found[2])));

  const arcs = thePhasesDrawn();
  const forArcs = FULL_TURN_DEGREES - (arcs > 1 ? arcs : 0) * GAP_DEGREES;
  const stops = Math.max(...ends);

  return Math.round((stops * herCycleLengthDays) / forArcs);
}

/** What the ring says about the day she is on, read off the ring and not off the arithmetic. */
function theRingSays(): string {
  return String(screen.getByTestId(cycleRingTestID).props.accessibilityLabel);
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

describe('the period arc follows what she said until she logs her own', () => {
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

  describe('the question she is asked after her cycle length', () => {
    beforeEach(() => {
      theTourIsBehindHer();
    });

    it('opens on five days and moves one day at a time', async () => {
      const app = await sheOpensEmi();

      await sheReachesThePeriodLength();

      expect(app.pathname()).toBe('/onboarding/period-length');
      expect(theStepperReads()).toBe(periodLengthDaysLabel(defaultPeriodLengthDays));

      await shePresses(moreDaysTestID);

      expect(theStepperReads()).toBe(periodLengthDaysLabel(defaultPeriodLengthDays + 1));

      await shePresses(fewerDaysTestID);
      await shePresses(fewerDaysTestID);

      expect(theStepperReads()).toBe(periodLengthDaysLabel(defaultPeriodLengthDays - 1));
    });

    it('stops at one day, because a day of bleeding is already a period', async () => {
      await sheOpensEmi();

      await sheReachesThePeriodLength();
      for (let pressed = defaultPeriodLengthDays; pressed > minimumPeriodLengthDays; pressed -= 1) {
        await shePresses(fewerDaysTestID);
      }

      expect(theStepperReads()).toBe(periodLengthDaysLabel(minimumPeriodLengthDays));
      expect(screen.getByTestId(fewerDaysTestID)).toBeDisabled();

      await shePresses(fewerDaysTestID);

      expect(theStepperReads()).toBe(periodLengthDaysLabel(minimumPeriodLengthDays));
    });

    it('stops at fifteen days, beyond which the number is a typing mistake', async () => {
      await sheOpensEmi();

      await sheReachesThePeriodLength();
      for (let pressed = defaultPeriodLengthDays; pressed < maximumPeriodLengthDays; pressed += 1) {
        await shePresses(moreDaysTestID);
      }

      expect(theStepperReads()).toBe(periodLengthDaysLabel(maximumPeriodLengthDays));
      expect(screen.getByTestId(moreDaysTestID)).toBeDisabled();
    });

    it('says what it is asking for, and what happens if she is not sure', async () => {
      await sheOpensEmi();

      await sheReachesThePeriodLength();

      expect(screen.getByText(firstRunCopy.periodLength.title)).toBeTruthy();
      for (const line of firstRunCopy.periodLength.lines) {
        expect(screen.getByText(line)).toBeTruthy();
      }
      expect(screen.getByTestId(onboardingSkipTestID)).toHaveTextContent(
        firstRunCopy.periodLength.skip,
      );
      expect(screen.getByTestId(onboardingActionTestID)).toHaveTextContent(
        firstRunCopy.periodLength.action,
      );
    });

    it('is the last question, and hands her to the hold either way she answers it', async () => {
      const app = await sheOpensEmi();

      await sheReachesThePeriodLength();
      await shePresses(onboardingSkipTestID);

      expect(app.pathname()).toBe('/onboarding/hold');
    });
  });

  describe('her answer, at the hold', () => {
    beforeEach(() => {
      theTourIsBehindHer();
    });

    it('is sealed in her profile, under the key her own phone drew', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({
        periodStartedOn: herPeriodStarted,
        periodLengthDays: sheSaysHerPeriodRuns,
      });
      await sheHoldsTheRing();

      expect(statedPeriodLengthDays(herDatabase(), await theProfileVaultOnHerPhone())).toBe(
        sheSaysHerPeriodRuns,
      );
    });

    it('is left off her profile where she said she is not sure', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({ periodStartedOn: herPeriodStarted });
      await sheHoldsTheRing();

      const held = readProfile(herDatabase(), await theProfileVaultOnHerPhone());

      expect(held?.cycleLengthDays).toBe(28);
      expect(held && 'periodLengthDays' in held).toBe(false);
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
              periodLengthDays: maximumPeriodLengthDays + 1,
            },
            whenSheOpensIt,
          ),
        ),
      ).toBe('period-length-is-out-of-range');
      expect(readProfile(database, herProfileVault())).toBeUndefined();
    });
  });

  describe('the period arc on her ring', () => {
    it('covers the days she said while she has logged no period end', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        aPeriodStillRunning(),
        herCycleLengthDays,
        sheSaysHerPeriodRuns,
      );
      await sheOpensEmi();

      expect(theRingSays()).toBe(
        `Day ${sheIsOnCycleDay} of ${herCycleLengthDays}, ${phaseLabel.period.toLowerCase()}`,
      );
      expect(thePeriodArcCoversDays()).toBe(sheSaysHerPeriodRuns);
    });

    it('covers the days she logged once she has logged a period end', async () => {
      const sheBledForDays = 4;

      await herPhoneHolds(
        whenSheOpensIt,
        aPeriodSheClosedAfter(sheBledForDays),
        herCycleLengthDays,
        sheSaysHerPeriodRuns,
      );
      await sheOpensEmi();

      expect(thePeriodArcCoversDays()).toBe(sheBledForDays);
      expect(theRingSays()).toBe(
        `Day ${sheIsOnCycleDay} of ${herCycleLengthDays}, ${phaseLabel.follicular.toLowerCase()}`,
      );
    });

    it('is the days she logged where she said she is not sure', async () => {
      await herPhoneHolds(whenSheOpensIt, aPeriodStillRunning(), herCycleLengthDays);
      await sheOpensEmi();

      expect(thePeriodArcCoversDays()).toBe(aPeriodStillRunning().length);
      expect(theRingSays()).toBe(
        `Day ${sheIsOnCycleDay} of ${herCycleLengthDays}, ${phaseLabel.follicular.toLowerCase()}`,
      );
    });

    it('never runs shorter than the days she has already bled', async () => {
      const sheSaidThreeDays = 3;
      const sheHasBledForDays = 5;
      const stillRunning = Array.from({ length: sheHasBledForDays }, (_unused, at) =>
        aBleedingDay(addDays(herPeriodStarted, at)),
      );

      await herPhoneHolds(whenSheOpensIt, stillRunning, herCycleLengthDays, sheSaidThreeDays);
      await sheOpensEmi();

      expect(thePeriodArcCoversDays()).toBe(sheHasBledForDays);
    });
  });
});
