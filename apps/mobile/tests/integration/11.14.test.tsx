import { join } from 'node:path';

import { render } from '@testing-library/react-native';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import type { Database } from '../../src/data/database';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import { calendarTestID, dayTestID } from '../../src/features/onboarding/Calendar';
import { LastPeriod } from '../../src/features/onboarding/LastPeriod';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
  onboardingWayPastTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import type { Language } from '../../src/language';
import { english } from '../../src/language/english';
import { russian } from '../../src/language/russian';
import { spanish } from '../../src/language/spanish';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import {
  type PlacedBox,
  placedOnTheGlass,
  theBoxNamed,
  theBoxSaying,
  theOnlyBoxOfType,
  scrollingView,
} from '../fixtures/theHeightDownTheGlass';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';
import { anIPhone16 } from '../fixtures/theWidthOfARow';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const herPeriodStarted = '2026-05-09';

const theKeyOfThePrivacyLine = 'onboarding.encrypts';

/** The line the redesign draws at the foot of this question, in each language. */
const thePrivacyLine: Readonly<Record<Language, string>> = {
  en: 'Emi encrypts this on the phone before it goes anywhere.',
  es: 'Emi lo cifra en el teléfono antes de que vaya a ningún sitio.',
  ru: 'Emi шифрует это на телефоне, прежде чем оно куда-либо отправится.',
};

/** The line this question carried above the days before the redesign moved it. */
const theOldPrivacyLine = 'Only you can read this.';

interface Instance {
  readonly type: unknown;
  readonly props: Record<string, unknown>;
  readonly children: readonly (Instance | string)[];
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

/** Past the welcome and past the two questions she may skip, on the question about her last one. */
async function sheReachesHerLastPeriod(): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: '/' });
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
}

/** Every box of the screen she is on, in the order the tree draws them. */
function theOrderOfTheScreen(): Instance[] {
  const walk = (node: Instance): Instance[] => [
    node,
    ...node.children
      .filter((child): child is Instance => typeof child !== 'string')
      .flatMap((child) => walk(child)),
  ];

  return walk(screen.getByTestId('onboarding-lastPeriod') as unknown as Instance);
}

function whereTheWordsAre(boxes: readonly Instance[], words: string): number {
  const at = boxes.findIndex((box) => box.children.length === 1 && box.children[0] === words);

  if (at < 0) {
    throw new Error(`the screen never said "${words}"`);
  }

  return at;
}

function whereTheBoxNamed(boxes: readonly Instance[], testID: string): number {
  const at = boxes.findIndex((box) => box.props.testID === testID);

  if (at < 0) {
    throw new Error(`the screen drew no ${testID}`);
  }

  return at;
}

/**
 * The screen as an iPhone 16 lays it out, drawn on a phone that keeps part of its glass for itself.
 *
 * The router hands the screens a phone that reserves nothing, so a measurement taken from the walk
 * above would give the question 93 points of room no iPhone with a dynamic island has. This is the
 * harness the committed picture of this screen is drawn from, so the two show the same thing.
 */
async function theScreenOnAnIPhone16(): Promise<PlacedBox[]> {
  const view = await render(
    <OnAPhone>
      <LastPeriod
        chosen={undefined}
        now={whenSheOpensIt}
        onBack={() => undefined}
        onChoose={() => undefined}
        onContinue={() => undefined}
        onWayPast={() => undefined}
      />
    </OnAPhone>,
  );
  const drawn = placedOnTheGlass(theScreenIn(view), anIPhone16);

  await view.unmount();

  return drawn;
}

describe('she reads that Emi encrypts her last period at the foot of the sheet', () => {
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

  describe('the order she reads the screen in', () => {
    it('draws the days first and says what Emi does with the day under them', async () => {
      await sheReachesHerLastPeriod();

      const drawn = theOrderOfTheScreen();

      expect(whereTheWordsAre(drawn, thePrivacyLine.en)).toBeGreaterThan(
        whereTheBoxNamed(drawn, calendarTestID),
      );
    });

    it('puts the line over the way past and the button, where the redesign draws it', async () => {
      await sheReachesHerLastPeriod();

      const drawn = theOrderOfTheScreen();
      const line = whereTheWordsAre(drawn, thePrivacyLine.en);

      expect(line).toBeLessThan(whereTheBoxNamed(drawn, onboardingWayPastTestID));
      expect(line).toBeLessThan(whereTheBoxNamed(drawn, onboardingActionTestID));
    });

    it('no longer says the old line above the days', async () => {
      await sheReachesHerLastPeriod();

      expect(screen.queryByText(theOldPrivacyLine)).toBeNull();
    });

    it('still takes the day she picks', async () => {
      await sheReachesHerLastPeriod();
      await shePresses(dayTestID(herPeriodStarted));
      await shePresses(onboardingActionTestID);

      expect(screen.getByTestId('onboarding-periodBefore')).toBeTruthy();
    });
  });

  describe('what she is shown on the glass of an iPhone 16', () => {
    it('keeps the line out of the part that scrolls, so it is always in view', async () => {
      const drawn = await theScreenOnAnIPhone16();
      const line = theBoxSaying(drawn, thePrivacyLine.en);
      const shown = theOnlyBoxOfType(drawn, scrollingView);

      expect(line.top).toBeGreaterThanOrEqual(shown.top + shown.height);
    });

    it('draws the calendar above it', async () => {
      const drawn = await theScreenOnAnIPhone16();
      const line = theBoxSaying(drawn, thePrivacyLine.en);
      const calendar = theBoxNamed(drawn, calendarTestID);

      expect(calendar.top).toBeLessThan(line.top);
    });
  });

  describe('the words she reads', () => {
    it('are the ones the first run already carried, in all three languages', () => {
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
