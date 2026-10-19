import { join } from 'node:path';

import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import type { Database } from '../../src/data/database';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import { pastPeriodsListTestID } from '../../src/features/pastPeriods/PastPeriodsList';
import { sheGivesAPeriod } from '../fixtures/thePastPeriods';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import type { Language } from '../../src/language';
import { english } from '../../src/language/english';
import { russian } from '../../src/language/russian';
import { spanish } from '../../src/language/spanish';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { locksDrawnIn } from '../fixtures/drawnLocks';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const herPeriodStarted = '2026-05-09';

const theKeyOfThePrivacyLine = 'onboarding.encrypts';

/** The line this question drew at its foot, which the pages outside the first run still draw. */
const thePrivacyLine: Readonly<Record<Language, string>> = {
  en: 'Emi encrypts this on the phone before it goes anywhere.',
  es: 'Emi lo cifra en el teléfono antes de que vaya a ningún sitio.',
  ru: 'Emi шифрует это на телефоне, прежде чем оно куда-либо отправится.',
};

/** The line this question carried above the days before the redesign moved it. */
const theOldPrivacyLine = 'Only you can read this.';

function herDatabase(): Database {
  return expoDatabase(openDatabaseSync(databaseFileName));
}

/** The tour is read, so the first thing she is shown is the first question. */
function theTourIsBehindHer(): void {
  const database = herDatabase();

  migrate(database);
  writeSetting(database, 'tourSeenAt', whenSheOpensIt.toISOString());
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/** Past the welcome and past the two questions she may skip, on the question about her last one. */
async function sheReachesHerLastPeriod(): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: '/' });
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
}

describe('her last periods screen draws no padlock line', () => {
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

  describe('what she reads on the screen', () => {
    it('draws no lock and no line about encryption, in the first run', async () => {
      await sheReachesHerLastPeriod();

      expect(screen.getByTestId(pastPeriodsListTestID)).toBeTruthy();
      expect(locksDrawnIn(screen.root)).toBe(0);
      expect(screen.queryByText(thePrivacyLine.en)).toBeNull();
    });

    it('no longer says the old line above the days', async () => {
      await sheReachesHerLastPeriod();

      expect(screen.queryByText(theOldPrivacyLine)).toBeNull();
    });

    it('still takes the period she gives', async () => {
      await sheReachesHerLastPeriod();
      await sheGivesAPeriod(0, herPeriodStarted, 5);
      await shePresses(onboardingActionTestID);

      expect(screen.getByTestId('onboarding-cycleLength')).toBeTruthy();
    });
  });

  describe('the words outside the first run', () => {
    it('stay in all three languages, for the pages that still draw the padlock line', () => {
      for (const [language, catalogue] of [
        ['en', english],
        ['es', spanish],
        ['ru', russian],
      ] as const) {
        expect(Object.entries(catalogue)).toContainEqual([
          theKeyOfThePrivacyLine,
          thePrivacyLine[language],
        ]);
      }
    });
  });
});
