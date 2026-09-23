import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { Database } from '../../src/data/database';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import {
  YEAR_ROW_HEIGHT,
  YearOfBirth,
  yearTestID,
  yearWheelTestID,
} from '../../src/features/onboarding/YearOfBirth';
import { firstRunCopy } from '../../src/features/onboarding/copy';
import { birthYearsOffered } from '../../src/features/onboarding/firstRun';
import { english } from '../../src/language/english';
import { russian } from '../../src/language/russian';
import { spanish } from '../../src/language/spanish';
import { wordKeys } from '../../src/language/words';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { OnAPhone } from '../fixtures/theSafeArea';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');
const languageDirectory = join(__dirname, '..', '..', 'src', 'language');

/** Midday, and well away from any summer time change, so her clock reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

/** A clock five years on, so the year in the middle is read as a rule and not as a constant. */
const whenAnotherWomanOpensIt = new Date('2031-05-14T12:00:00.000Z');

/**
 * The years written out rather than asked of the code, because a bound read back off the code it
 * is holding moves with the code and catches nothing. Her clock says 2026, and the wheel opens
 * thirty years back from that. Five years later it opens on 2001.
 */
const theYearInTheMiddle = 1996;
const theYearInTheMiddleFiveYearsOn = 2001;

/** What she is not told any more, and the key it was drawn from. */
const theLineThatWent = 'Nothing in Emi reads this yet.';
const theKeyThatWent = 'onboarding.birthYear.line.noReader';

/** What the screen still says about the year, so a screen drawn empty cannot pass for this. */
const theLineThatStayed = 'Emi encrypts this on the phone before it goes anywhere.';

interface Wheel {
  readonly props: {
    readonly contentOffset?: { readonly x: number; readonly y: number };
    readonly style?: unknown;
  };
}

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

/** Past the welcome and past her name, on the question about the year she was born. */
async function sheReachesTheYearSheWasBorn(): Promise<{ readonly pathname: () => string }> {
  const app = renderRouter(appDirectory, { initialUrl: '/' });

  await app;
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);

  return { pathname: () => app.getPathname() };
}

/**
 * The year she finds in the middle of the wheel, worked out the way her eye does it: the middle
 * of what the wheel shows, measured down the list of years from where the wheel opens.
 */
function theYearSheFindsInTheMiddle(wheel: Wheel, now: Date): number | undefined {
  const shown = (StyleSheet.flatten(wheel.props.style) ?? {}) as { height?: number };
  const height = shown.height;

  if (height === undefined) {
    throw new Error('the wheel says nothing about how much of the list it shows');
  }

  const middle = (wheel.props.contentOffset?.y ?? 0) + height / 2;

  return birthYearsOffered(now)[Math.floor(middle / YEAR_ROW_HEIGHT)];
}

describe('the year of birth wheel opens on 1996 and chooses nothing for her', () => {
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

  describe('the line that claimed nothing reads the year', () => {
    it('is gone from the screen, which still says what Emi does with the answer', async () => {
      await sheReachesTheYearSheWasBorn();

      expect(screen.getByTestId('onboarding-birthYear')).toBeTruthy();
      expect(screen.queryByText(theLineThatWent)).toBeNull();
      expect(screen.getByText(theLineThatStayed)).toBeTruthy();
      expect(firstRunCopy.birthYear.lines).toEqual([theLineThatStayed]);
    });

    it('is gone from all three languages, so no screen can draw it again', () => {
      for (const catalogue of [english, russian, spanish]) {
        expect(Object.keys(catalogue)).not.toContain(theKeyThatWent);
        expect(Object.keys(catalogue)).toContain('onboarding.birthYear.line.sealed');
      }

      expect(wordKeys as readonly string[]).not.toContain(theKeyThatWent);
    });

    it('is in none of the three language files either, key or words', () => {
      for (const language of ['english', 'russian', 'spanish']) {
        const file = readFileSync(join(languageDirectory, `${language}.ts`), 'utf8');

        expect(file).toContain('onboarding.birthYear.line.sealed');
        expect(file).not.toContain(theKeyThatWent);
      }

      expect(english['onboarding.birthYear.line.sealed']).toBe(theLineThatStayed);
    });
  });

  describe('where the wheel opens', () => {
    it('leaves the year thirty back from this one in the middle of what it shows', async () => {
      await sheReachesTheYearSheWasBorn();

      const wheel = screen.getByTestId(yearWheelTestID) as unknown as Wheel;

      expect(theYearSheFindsInTheMiddle(wheel, whenSheOpensIt)).toBe(theYearInTheMiddle);
      expect(screen.getByTestId(yearTestID(theYearInTheMiddle))).toBeTruthy();
    });

    it('moves with the clock, so the woman who opens Emi in 2031 finds 2001 there', async () => {
      const view = await render(
        <OnAPhone>
          <YearOfBirth
            chosen={undefined}
            now={whenAnotherWomanOpensIt}
            onBack={() => undefined}
            onChoose={() => undefined}
            onContinue={() => undefined}
            onSkip={() => undefined}
          />
        </OnAPhone>,
      );
      const wheel = view.getByTestId(yearWheelTestID) as unknown as Wheel;

      expect(theYearSheFindsInTheMiddle(wheel, whenAnotherWomanOpensIt)).toBe(
        theYearInTheMiddleFiveYearsOn,
      );

      await view.unmount();
    });
  });

  describe('the year the wheel opens on', () => {
    it('is not an answer, so the way on waits until she presses a year', async () => {
      await sheReachesTheYearSheWasBorn();

      expect(screen.getByTestId(yearTestID(theYearInTheMiddle))).not.toBeSelected();
      expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();
    });

    it('becomes one when she presses it, and the way on takes her to her last period', async () => {
      const app = await sheReachesTheYearSheWasBorn();

      await shePresses(yearTestID(theYearInTheMiddle));

      expect(screen.getByTestId(yearTestID(theYearInTheMiddle))).toBeSelected();
      expect(screen.getByTestId(onboardingActionTestID)).toBeEnabled();

      await shePresses(onboardingActionTestID);

      expect(app.pathname()).toBe('/onboarding/last-period');
      expect(screen.getByTestId('onboarding-lastPeriod')).toBeTruthy();
    });
  });
});
