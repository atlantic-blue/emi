import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';

import { approvedDenials, describeClaim } from '../../../../tools/pipeline/forbiddenClaims';
import { interfaceClaimsIn } from '../../../../tools/pipeline/interfaceClaims';
import { cycleRingTestID } from '../../src/components/CycleRing';
import type { Database } from '../../src/data/database';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import { migrate } from '../../src/data/schema';
import { readProfile } from '../../src/data/profileRepository';
import { readSetting, writeSetting } from '../../src/data/settingRepository';
import { longerTestID } from '../../src/features/onboarding/CycleLength';
import { dayTestID } from '../../src/features/onboarding/LastPeriod';
import { onboardingActionTestID } from '../../src/features/onboarding/OnboardingScreen';
import {
  tourActionTestID,
  tourBackTestID,
  tourCountTestID,
  tourEmblemTestID,
  tourScreenTestID,
  tourSkipTestID,
} from '../../src/features/onboarding/TourScreen';
import {
  type TourCard,
  firstRunCopy,
  tourCards,
  tourCopy,
  tourCountLabel,
} from '../../src/features/onboarding/copy';
import { defaultCycleLengthDays } from '../../src/features/onboarding/firstRun';
import { markTourSeen, tourIsSeen } from '../../src/features/onboarding/tour';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { theProfileVaultOnHerPhone } from '../fixtures/herVault';
import { controlsTooSmallToPress as tooSmallToPress } from '../fixtures/tapTargets';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');

/**
 * A denial taken off the approved list rather than written out, so this file carries no claim of
 * its own and the repository wide scan reads it with every other file.
 */
function theDenialStartingWith(beginning: string): string {
  const found = approvedDenials.find((denial) => denial.startsWith(beginning));

  if (found === undefined) {
    throw new Error(`no approved denial starts with "${beginning}"`);
  }

  return found;
}
const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Well away from any summer time change, so the calendar below reads the same in any timezone. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const millisecondsInADay = 24 * 60 * 60 * 1000;

function dayOf(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}

const herPeriodStarted = dayOf(new Date(whenSheOpensIt.getTime() - 5 * millisecondsInADay));

interface OpenApp {
  /** The route she is looking at. It is read from the router rather than from the screen. */
  readonly pathname: () => string;
  readonly close: () => Promise<void>;
}

/**
 * renderRouter hangs its own readers on the promise it returns, so the promise is kept and the
 * resolved view is kept beside it.
 */
async function sheOpensEmi(): Promise<OpenApp> {
  const app = renderRouter(appDirectory, { initialUrl: '/' });
  const view = await app;

  return { pathname: () => app.getPathname(), close: () => view.unmount() };
}

function herDatabase(): Database {
  return expoDatabase(openDatabaseSync(databaseFileName));
}

function aMigratedPhone(): Database {
  const database = herDatabase();

  migrate(database);

  return database;
}

function theCard(card: TourCard) {
  return within(screen.getByTestId(tourScreenTestID(card)));
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/** Which card is drawn right now, read off the screen rather than counted by the test. */
function theCardSheIsOn(): TourCard | undefined {
  return tourCards.find((card) => screen.queryByTestId(tourScreenTestID(card)) !== null);
}

async function sheReadsEveryCard(): Promise<TourCard[]> {
  const read: TourCard[] = [];

  for (let pressed = 0; pressed < tourCards.length; pressed += 1) {
    const on = theCardSheIsOn();

    if (on !== undefined) {
      read.push(on);
    }
    await shePresses(tourActionTestID);
  }

  return read;
}

/** The two questions of the first run, answered, so a case can end on her home screen. */
async function sheAnswersBothQuestions(): Promise<void> {
  await shePresses(onboardingActionTestID);
  await shePresses(dayTestID(herPeriodStarted));
  await shePresses(onboardingActionTestID);
  await shePresses(longerTestID);
  await shePresses(onboardingActionTestID);
}

function everyControlOnTheScreen(): string[] {
  return tooSmallToPress([...screen.queryAllByRole('button'), ...screen.queryAllByRole('link')]);
}

/** Every string of the tour, as the file that holds them is read by the wording gate. */
function everyWordOfTheTour(): string {
  return [
    ...tourCards.flatMap((card) => [tourCopy[card].title, ...tourCopy[card].lines]),
    tourCopy.skip,
    tourCopy.back,
  ].join('\n');
}

describe('Skip on any card lands on the welcome screen and the tour does not come back', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the first time she opens Emi', () => {
    it('shows her the first card, because she has been told nothing yet', async () => {
      const app = await sheOpensEmi();

      expect(app.pathname()).toBe('/onboarding/tour');
      expect(theCard('ring').getByTestId(tourCountTestID)).toHaveTextContent('1 of 4');
      expect(screen.queryByTestId('onboarding-welcome')).toBeNull();
    });

    it('draws the ring on the first card, so she sees one before she is asked for a day', async () => {
      await sheOpensEmi();

      expect(theCard('ring').getByTestId(cycleRingTestID)).toBeTruthy();
    });

    it('carries no progress bar, because a card asks her for nothing', async () => {
      await sheOpensEmi();

      expect(theCard('ring').queryByTestId('onboarding-progress')).toBeNull();
      expect(screen.queryByTestId('onboarding-progress')).toBeNull();
    });

    it('offers no way back from the first card, because nothing is behind it', async () => {
      await sheOpensEmi();

      expect(theCard('ring').queryByTestId(tourBackTestID)).toBeNull();

      await shePresses(tourActionTestID);
      expect(theCard('range').getByTestId(tourBackTestID)).toBeTruthy();
    });
  });

  describe('the four cards', () => {
    it('are read in the order the tour names them, and end on the welcome screen', async () => {
      const app = await sheOpensEmi();

      const read = await sheReadsEveryCard();

      expect(read).toEqual([...tourCards]);
      expect(app.pathname()).toBe('/onboarding/welcome');
      expect(screen.getByTestId('onboarding-welcome')).toBeTruthy();
    });

    it('carry the title, every line and the count each one holds in the copy', async () => {
      await sheOpensEmi();

      for (const card of tourCards) {
        const shown = theCard(card);

        expect(shown.getByText(tourCopy[card].title)).toBeTruthy();
        for (const line of tourCopy[card].lines) {
          expect(shown.getByText(line)).toBeTruthy();
        }
        expect(shown.getByTestId(tourCountTestID)).toHaveTextContent(tourCountLabel(card));
        expect(shown.getByTestId(tourActionTestID)).toHaveTextContent(tourCopy[card].action);
        await shePresses(tourActionTestID);
      }
    });

    it('draw the emblem on the last card and none on the two in the middle', async () => {
      await sheOpensEmi();

      expect(screen.queryByTestId(tourEmblemTestID)).toBeNull();
      await shePresses(tourActionTestID);
      expect(screen.queryByTestId(cycleRingTestID)).toBeNull();
      expect(screen.queryByTestId(tourEmblemTestID)).toBeNull();
      await shePresses(tourActionTestID);
      expect(screen.queryByTestId(tourEmblemTestID)).toBeNull();
      await shePresses(tourActionTestID);
      expect(theCard('yours').getByTestId(tourEmblemTestID)).toBeTruthy();
    });

    it('let her read a card again, and put her back where she was', async () => {
      await sheOpensEmi();

      await shePresses(tourActionTestID);
      await shePresses(tourActionTestID);
      expect(theCardSheIsOn()).toBe('records');

      await shePresses(tourBackTestID);
      expect(theCardSheIsOn()).toBe('range');

      await shePresses(tourActionTestID);
      expect(theCardSheIsOn()).toBe('records');
    });

    it('hold every control at 44 points or more on both axes', async () => {
      await sheOpensEmi();

      const measured: string[][] = [];

      for (let pressed = 0; pressed < tourCards.length; pressed += 1) {
        measured.push(everyControlOnTheScreen());
        await shePresses(tourActionTestID);
      }

      expect(measured).toEqual([[], [], [], []]);
    });
  });

  describe('the action on the last card', () => {
    it('leaves her on the welcome screen with the instant written', async () => {
      const app = await sheOpensEmi();

      await sheReadsEveryCard();

      expect(app.pathname()).toBe('/onboarding/welcome');
      expect(readSetting(herDatabase(), 'tourSeenAt')).toBe(whenSheOpensIt.toISOString());
    });
  });

  describe('Skip, pressed on a card', () => {
    for (const card of tourCards) {
      it(`on ${card} lands her on the welcome screen with the instant written`, async () => {
        const app = await sheOpensEmi();

        for (const before of tourCards.slice(0, tourCards.indexOf(card))) {
          expect(theCardSheIsOn()).toBe(before);
          await shePresses(tourActionTestID);
        }
        expect(theCardSheIsOn()).toBe(card);

        await shePresses(tourSkipTestID);

        expect(app.pathname()).toBe('/onboarding/welcome');
        expect(screen.getByTestId('onboarding-welcome')).toBeTruthy();
        expect(readSetting(herDatabase(), 'tourSeenAt')).toBe(whenSheOpensIt.toISOString());
      });
    }

    it('never steps over the two questions and reaches her home screen', async () => {
      const app = await sheOpensEmi();

      await shePresses(tourSkipTestID);

      expect(app.pathname()).not.toBe('/');
      expect(screen.queryByTestId('home-screen')).toBeNull();
      expect(screen.getByText(firstRunCopy.welcome.title)).toBeTruthy();
    });
  });

  describe('the launch after she has seen it', () => {
    it('shows the first question and no card at all', async () => {
      writeSetting(aMigratedPhone(), 'tourSeenAt', whenSheOpensIt.toISOString());

      const app = await sheOpensEmi();

      expect(app.pathname()).toBe('/onboarding/welcome');
      expect(theCardSheIsOn()).toBeUndefined();
    });

    it('shows her home screen once she has answered the two questions', async () => {
      const app = await sheOpensEmi();

      await shePresses(tourSkipTestID);
      await sheAnswersBothQuestions();

      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId('home-screen')).toBeTruthy();
      expect(readProfile(herDatabase(), await theProfileVaultOnHerPhone())?.cycleLengthDays).toBe(
        defaultCycleLengthDays + 1,
      );
    });
  });

  describe('the instant the tour was left', () => {
    it('is the first one, however many times the tour is left again', async () => {
      const database = aMigratedPhone();
      const later = new Date(whenSheOpensIt.getTime() + 60_000);

      markTourSeen(database, whenSheOpensIt);
      markTourSeen(database, later);

      expect(readSetting(database, 'tourSeenAt')).toBe(whenSheOpensIt.toISOString());
      expect(tourIsSeen(database)).toBe(true);
    });

    it('is absent on a phone that has never been through it', () => {
      expect(tourIsSeen(aMigratedPhone())).toBe(false);
    });
  });

  describe('the words of the four cards', () => {
    it('carry none of the wording a screen refuses, and are more than twelve of them', () => {
      const said = everyWordOfTheTour();

      expect(interfaceClaimsIn('the tour', said).map(describeClaim)).toEqual([]);
      expect(said.split('\n').length).toBeGreaterThan(12);
    });

    it('deny the two claims on the card that names a forecast, each after a full stop', () => {
      const theFirstDenial = theDenialStartingWith('Emi is not a c');
      const theSecondDenial = theDenialStartingWith('Emi is not a m');
      const denying = tourCopy.range.lines.filter((line) => line.includes(theFirstDenial));

      expect(denying).toHaveLength(1);
      expect(denying[0]).toContain(theSecondDenial);
      // A denial is read as a claim unless a full stop comes before it, so the line opens with a
      // sentence of its own and the wording gate accepts the two that follow.
      expect(denying[0]?.startsWith(theFirstDenial)).toBe(false);
    });

    it('name the four cards in the copy and nowhere else, so a screen writes no word', () => {
      const source = readFileSync(
        join(repositoryRoot, 'apps/mobile/src/features/onboarding/TourScreen.tsx'),
        'utf8',
      );

      for (const card of tourCards) {
        expect(source).not.toContain(tourCopy[card].title);
      }
    });
  });
});
