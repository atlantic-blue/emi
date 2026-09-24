import { join } from 'node:path';

import { longestName } from '@emi/crypto';

import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { Database } from '../../src/data/database';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import { profileRow, readProfile } from '../../src/data/profileRepository';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import { homeGreetingTestID, homeScreenTestID } from '../../src/features/home/HomeScreen';
import { greeting } from '../../src/features/home/copy';
import { nameFieldTestID, nameTooLongTestID } from '../../src/features/onboarding/HerName';
import {
  onboardingActionTestID,
  onboardingBackTestID,
  onboardingSkipTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import {
  YEAR_ROW_HEIGHT,
  yearTestID,
  yearWheelTestID,
} from '../../src/features/onboarding/YearOfBirth';
import { firstRunCopy, nameTooLongLine } from '../../src/features/onboarding/copy';
import {
  type FirstRunRefusal,
  FirstRunError,
  type FirstRunVaults,
  birthYearsOffered,
  completeFirstRun,
  latestBirthYear,
} from '../../src/features/onboarding/firstRun';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';
import { openTestDatabase } from '../data/nodeDatabase';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { herProfileVault, herVault, theProfileVaultOnHerPhone } from '../fixtures/herVault';
import { sheAnswersEveryQuestion } from '../fixtures/theFirstRun';
import { sheHoldsTheRing } from '../fixtures/theHold';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const herPeriodStarted = '2026-05-09';

const herName = 'Ada';
const herBirthYear = 1991;

/**
 * The years the wheel runs between, written out rather than asked of the screen, because a bound
 * read back off the code it is holding moves with the code and catches nothing.
 *
 * Her clock says 2026, and Emi is not built for a child, so the newest year she may have been born
 * in is 2017. The year after it is the one the screen must not offer.
 */
const theNewestYearOffered = 2017;
const theOldestYearOffered = 1940;
const tooYoungAYear = 2018;

/** One character over the bound the profile holds, typed as one letter repeated. */
const aNameTooLong = 'a'.repeat(longestName + 1);

function herDatabase(): Database {
  return expoDatabase(openDatabaseSync(databaseFileName));
}

/** The four cards, already read, so the first thing she sees is the first question. */
function theTourIsBehindHer(): void {
  const database = herDatabase();

  migrate(database);
  writeSetting(database, 'tourSeenAt', whenSheOpensIt.toISOString());
}

interface OpenApp {
  readonly pathname: () => string;
}

async function sheOpensEmi(): Promise<OpenApp> {
  const app = renderRouter(appDirectory, { initialUrl: '/' });

  await app;

  return { pathname: () => app.getPathname() };
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

async function sheTypes(typed: string): Promise<void> {
  await fireEvent.changeText(screen.getByTestId(nameFieldTestID), typed);
}

/** Her answers as they come back out of the envelope, which is the only place they are kept. */
async function herProfile() {
  return readProfile(herDatabase(), await theProfileVaultOnHerPhone());
}

function herVaults(): FirstRunVaults {
  return { day: herVault(), profile: herProfileVault() };
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

describe('she gives her name and the home screen greets her by it', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
    theTourIsBehindHer();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the two questions between the welcome and her last period', () => {
    it('asks her name first and the year she was born after it', async () => {
      const app = await sheOpensEmi();
      const visited: string[] = [];

      await shePresses(onboardingActionTestID);
      visited.push(app.pathname());
      await sheTypes(herName);
      await shePresses(onboardingActionTestID);
      visited.push(app.pathname());
      await shePresses(yearTestID(herBirthYear));
      await shePresses(onboardingActionTestID);
      visited.push(app.pathname());

      expect(visited).toEqual([
        '/onboarding/name',
        '/onboarding/year-of-birth',
        '/onboarding/last-period',
      ]);
    });

    it('offers a way past each of them, because only the last period is required', async () => {
      await sheOpensEmi();

      await shePresses(onboardingActionTestID);
      expect(screen.getByTestId(onboardingSkipTestID)).toBeTruthy();

      await shePresses(onboardingSkipTestID);
      expect(screen.getByTestId(onboardingSkipTestID)).toBeTruthy();
    });

    it('opens the wheel on the year she picked when she comes back to it', async () => {
      await sheOpensEmi();

      await shePresses(onboardingActionTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(yearTestID(herBirthYear));
      await shePresses(onboardingActionTestID);
      await shePresses(onboardingBackTestID);

      const wheel = screen.getByTestId(yearWheelTestID);
      const travelled = birthYearsOffered(whenSheOpensIt).indexOf(herBirthYear) * YEAR_ROW_HEIGHT;
      expect(wheel.props.contentOffset).toEqual({ x: 0, y: travelled });
      expect(screen.getByTestId(yearTestID(herBirthYear))).toBeSelected();
    });

    it('writes neither answer before the hold, because the hold is the only write', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({
        periodStartedOn: herPeriodStarted,
        name: herName,
        birthYear: herBirthYear,
      });

      expect(profileRow(herDatabase())).toBeUndefined();
    });
  });

  describe('the name and the year she gave', () => {
    it('are both in her profile, and the home screen greets her by the name', async () => {
      const app = await sheOpensEmi();

      await sheAnswersEveryQuestion({
        periodStartedOn: herPeriodStarted,
        name: herName,
        birthYear: herBirthYear,
      });
      await sheHoldsTheRing();

      expect(await herProfile()).toMatchObject({ name: herName, birthYear: herBirthYear });
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      // The sentence is held to carrying her name as well as to being the greeting, because a
      // greeting built without it would still match itself.
      expect(greeting(herName)).toContain(herName);
      expect(screen.getByTestId(homeGreetingTestID)).toHaveTextContent(greeting(herName));
    });

    it('keeps the name without the spaces she typed around it', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({
        periodStartedOn: herPeriodStarted,
        name: `  ${herName}  `,
      });
      await sheHoldsTheRing();

      expect((await herProfile())?.name).toBe(herName);
      expect(screen.getByTestId(homeGreetingTestID)).toHaveTextContent(greeting(herName));
    });
  });

  describe('the two questions she skipped', () => {
    it('leave no name and no year in her profile at all', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({ periodStartedOn: herPeriodStarted });
      await sheHoldsTheRing();

      const held = await herProfile();
      expect(Object.keys(held ?? {}).sort()).toEqual(['cycleLengthDays', 'kind', 'recordedAt']);
    });

    it('leave her home screen with no greeting on it, and not an empty line', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({ periodStartedOn: herPeriodStarted });
      await sheHoldsTheRing();

      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(screen.queryByTestId(homeGreetingTestID)).toBeNull();
    });

    it('forget the year she picked before she pressed the way past it', async () => {
      await sheOpensEmi();

      await shePresses(onboardingActionTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(yearTestID(herBirthYear));
      await shePresses(onboardingSkipTestID);
      await shePresses(`day-${herPeriodStarted}`);
      await shePresses(onboardingActionTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingActionTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await sheHoldsTheRing();

      expect((await herProfile())?.birthYear).toBeUndefined();
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
    });

    it('forget the name she typed before she pressed the way past it', async () => {
      await sheOpensEmi();

      await shePresses(onboardingActionTestID);
      await sheTypes(herName);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(`day-${herPeriodStarted}`);
      await shePresses(onboardingActionTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingActionTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await sheHoldsTheRing();

      expect((await herProfile())?.name).toBeUndefined();
      expect(screen.queryByTestId(homeGreetingTestID)).toBeNull();
    });
  });

  describe('a name longer than a profile holds', () => {
    it('keeps her on the screen and says what the bound is', async () => {
      const app = await sheOpensEmi();

      await shePresses(onboardingActionTestID);
      await sheTypes(aNameTooLong);
      await shePresses(onboardingActionTestID);

      expect(app.pathname()).toBe('/onboarding/name');
      expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();
      expect(screen.getByTestId(nameTooLongTestID)).toHaveTextContent(nameTooLongLine(longestName));
    });

    it('lets her on again as soon as she shortens it', async () => {
      const app = await sheOpensEmi();

      await shePresses(onboardingActionTestID);
      await sheTypes(aNameTooLong);
      await sheTypes(aNameTooLong.slice(1));
      await shePresses(onboardingActionTestID);

      expect(app.pathname()).toBe('/onboarding/year-of-birth');
      expect(screen.queryByTestId(nameTooLongTestID)).toBeNull();
    });

    it('is refused at the hold as well, so the screen is not the only thing holding it', () => {
      const database = openTestDatabase();
      migrate(database);

      expect(
        refusalFrom(() =>
          completeFirstRun(
            database,
            herVaults(),
            { periodStartedOn: herPeriodStarted, cycleLengthDays: 28, name: aNameTooLong },
            whenSheOpensIt,
          ),
        ),
      ).toBe('name-is-out-of-range');
      expect(profileRow(database)).toBeUndefined();
    });
  });

  describe('a year Emi is not built for', () => {
    it('is not on the wheel at all, so she cannot pick it', async () => {
      await sheOpensEmi();

      await shePresses(onboardingActionTestID);
      await shePresses(onboardingSkipTestID);

      expect(screen.getByTestId(yearWheelTestID)).toBeTruthy();
      expect(screen.getByTestId(yearTestID(theNewestYearOffered))).toBeTruthy();
      expect(screen.getByTestId(yearTestID(theOldestYearOffered))).toBeTruthy();
      expect(screen.queryByTestId(yearTestID(tooYoungAYear))).toBeNull();
      expect(latestBirthYear(whenSheOpensIt)).toBe(theNewestYearOffered);
      expect(birthYearsOffered(whenSheOpensIt)).not.toContain(tooYoungAYear);
    });

    it('is refused at the hold as well, so the wheel is not the only thing holding it', () => {
      const database = openTestDatabase();
      migrate(database);

      expect(
        refusalFrom(() =>
          completeFirstRun(
            database,
            herVaults(),
            { periodStartedOn: herPeriodStarted, cycleLengthDays: 28, birthYear: tooYoungAYear },
            whenSheOpensIt,
          ),
        ),
      ).toBe('birth-year-is-out-of-range');
      expect(profileRow(database)).toBeUndefined();
    });

    it('leaves the way on shut until she picks a year, because nothing is chosen for her', async () => {
      const app = await sheOpensEmi();

      await shePresses(onboardingActionTestID);
      await shePresses(onboardingSkipTestID);

      expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();

      await shePresses(yearTestID(herBirthYear));
      await shePresses(onboardingActionTestID);

      expect(app.pathname()).toBe('/onboarding/last-period');
    });
  });

  describe('the words of the two new screens', () => {
    it('say what Emi does with each answer, and claim no reader the year does not have', async () => {
      await sheOpensEmi();

      await shePresses(onboardingActionTestID);
      expect(screen.getByText(firstRunCopy.name.title)).toBeTruthy();
      for (const line of firstRunCopy.name.lines) {
        expect(screen.getByText(line)).toBeTruthy();
      }

      await shePresses(onboardingSkipTestID);
      expect(screen.getByText(firstRunCopy.birthYear.title)).toBeTruthy();
      for (const line of firstRunCopy.birthYear.lines) {
        expect(screen.getByText(line)).toBeTruthy();
      }
    });
  });
});
