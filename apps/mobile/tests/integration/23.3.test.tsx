import { resolve } from 'node:path';

import { CYCLES_BEFORE_A_FORECAST } from '@emi/cycle';
import { render } from '@testing-library/react-native';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { describeClaim, searchableText } from '../../../../tools/pipeline/forbiddenClaims';
import { interfaceClaimsIn } from '../../../../tools/pipeline/interfaceClaims';
import { type Language, type Words, catalogueOf, languages, wordKeys } from '../../src/language';
import { dayTestID } from '../../src/features/onboarding/Calendar';
import {
  firstForecastActionTestID,
  firstForecastLinesTestID,
  firstForecastNoGuessTestID,
  firstForecastOnThisPhoneTestID,
  firstForecastStillLearningTestID,
  firstForecastTestID,
  firstForecastTitleTestID,
  firstForecastWhyTestID,
} from '../../src/features/onboarding/FirstForecast';
import { focusTestID } from '../../src/features/onboarding/Focus';
import { nameFieldTestID } from '../../src/features/onboarding/HerName';
import {
  HOLD_MILLISECONDS,
  HoldToBegin,
  holdCoreTestID,
  holdRefusedTestID,
  holdScreenTestID,
} from '../../src/features/onboarding/HoldToBegin';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
  onboardingWayPastTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { promiseActionTestID, promiseLineTestID } from '../../src/features/onboarding/ThePromise';
import {
  whatEmiDoesActionTestID,
  whatEmiDoesCardTestID,
  whatEmiDoesTitleTestID,
} from '../../src/features/onboarding/WhatEmiDoesWithIt';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import type { Database } from '../../src/data/database';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { textIn } from '../fixtures/renderedText';
import { OnAPhone } from '../fixtures/theSafeArea';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

/**
 * The four screens between her last answer and the hold, in the voice `docs/design/voice.md` sets.
 * The forecast is the first thing Emi says back to her, so it says it to her by name, and the
 * three screens after it talk to her as you.
 *
 * Every sentence is written out here rather than read off the catalogue it checks, because a
 * sentence read off the thing it is holding moves with it and catches nothing.
 */

const appDirectory = resolve(__dirname, '..', '..', 'src', 'app');

/** Midday, well away from any summer time change, so her first run reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

/** A day inside the ninety the first run reaches back over, for the walk through the questions. */
const herPeriodStarted = '2026-05-09';

const theNameSheGives = 'Ada';

/** The questions after the cycle length: period length, regular, feeling, goals, focus, today. */
const theQuestionsLeftAfterTheCycleLength = 6;

const theTitleOfHerForecast = {
  named: `${theNameSheGives}, here's your next period`,
  plain: "Here's your next period",
};

const theTitleOfWhatWeWillDo = {
  named: `${theNameSheGives}, here's what we'll do with your answers`,
  plain: "Here's what we'll do with your answers",
};

/** What the forecast says under the range, and on the two cards beside it. */
const theForecastSays = {
  learning:
    "We're still getting to know your cycle. After two cycles, we'll tell you how sure we are.",
  why: {
    title: 'Why a range?',
    line: "Cycles shift by a few days from month to month. A single date would pretend they don't.",
  },
  onThisPhone: {
    title: 'Worked out on your phone',
    line: 'This comes from the dates you just gave us, worked out right here on your phone.',
  },
};

/** What a woman who could not name a day reads in place of a range. */
const theForecastWithNoDateSays = {
  title: "We don't have a date to start from yet",
  first: 'Log your next period and your forecast starts there.',
  guess: "We won't guess a date on day one, because a guess would only mislead you.",
  cycles: `We need ${CYCLES_BEFORE_A_FORECAST} full cycles before we can forecast.`,
};

/** The three cards of the promise, each as a title and the line under it. */
const thePromiseSays = {
  title: 'Only you can read your days.',
  encrypted: {
    title: 'Encrypted with a key only you hold',
    line: 'Every day you log is locked on this phone, and only the locked copy is sent.',
  },
  noTracking: {
    title: 'No password, no trackers',
    line: "We don't ask for a password, and Emi carries no tracking tools.",
  },
  delete: {
    title: 'Delete it all, any time',
    line: 'One press removes every day from this phone.',
  },
};

/** The three cards that read her own answers back to her. */
const whatWeWillDoSays = {
  forecast: {
    title: 'Your forecast',
    line: 'A range to start with. It gets narrower as we learn your cycle.',
  },
  log: {
    title: 'Your log',
    chosen: 'Sleep, mood and pain come first when you log, just as you asked.',
    one: 'Sleep comes first when you log, just as you asked.',
    usual: "You'll see the usual order when you log.",
  },
  privacy: {
    title: 'Your privacy',
    line: "It's all encrypted on this phone. Nobody else can read it.",
  },
};

/** The moment she gives her thumb, said in three sentences and then explained in one. */
const theHoldSays = {
  title: 'Your cycle. Your data. Your key.',
  instruction: 'Press and hold the ring to begin.',
  sealed:
    "When you hold the ring, we save your answers and lock them with a key that lives in this phone's keychain.",
  held: 'Keep holding',
  refused: "That didn't save. Press and hold the ring again.",
};

/** The four screens this step writes, as the catalogue names them. */
const theScreensSheReads: readonly string[] = [
  'onboarding.firstForecast.',
  'onboarding.promise.',
  'onboarding.whatEmiDoes.',
  'onboarding.hold.',
];

/** How each language writes the first person plural, which is how these four screens name Emi. */
const howEachLanguageSaysWe: Readonly<Record<Language, RegExp>> = {
  en: /(?<!\p{Letter})(we|our)(?!\p{Letter})/iu,
  es: /(?<!\p{Letter})(nos|nuestro|nuestra)(?!\p{Letter})|mos(?!\p{Letter})/iu,
  ru: /(?<!\p{Letter})(мы|наш|нам)/iu,
};

/** The one line of the four that names Emi on purpose, because no password is Emi's promise. */
const theLineThatNamesEmi = 'onboarding.promise.noTracking.line';

function formsOf(held: Words): string[] {
  return typeof held === 'string' ? [held] : Object.values(held);
}

function theCatalogueOf(language: Language): Readonly<Record<string, Words>> {
  return Object.fromEntries(Object.entries(catalogueOf(language)));
}

function theKeysOfTheseScreens(): string[] {
  return wordKeys.filter((key) => theScreensSheReads.some((screen) => key.startsWith(screen)));
}

/** Every word of the four screens in one language, out of that language's own catalogue. */
function theWordsOfTheseScreensIn(language: Language, keys = theKeysOfTheseScreens()): string[] {
  const catalogue = theCatalogueOf(language);

  return keys.flatMap((key) => formsOf(catalogue[key] ?? ''));
}

function herDatabase(): Database {
  return expoDatabase(openDatabaseSync(databaseFileName));
}

/** The four cards are read, so the first thing she is shown is the welcome. */
function theTourIsBehindHer(): void {
  const database = herDatabase();

  migrate(database);
  writeSetting(database, 'tourSeenAt', whenSheOpensIt.toISOString());
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

interface HerWalk {
  /** Nothing at all where she skips the name question, which is a woman Emi cannot greet. */
  readonly name?: string;
  /** Left out where she cannot remember when her last period started. */
  readonly day?: string;
  /** The groups she presses on the focus question, and none where she passes it. */
  readonly focus?: readonly ('sleep' | 'mood' | 'pain')[];
}

/**
 * The first run walked from the welcome to the forecast, which is the screen after her last
 * answer. Every question but her last period is passed, because this step is about the words she
 * reads at the end rather than about the answers themselves.
 */
async function sheWalksToHerForecast(walk: HerWalk = {}): Promise<{
  readonly pathname: () => string;
  readonly close: () => Promise<void>;
}> {
  const app = renderRouter(appDirectory, { initialUrl: '/' });
  const view = await app;

  await shePresses(onboardingActionTestID);

  if (walk.name === undefined) {
    await shePresses(onboardingSkipTestID);
  } else {
    await fireEvent.changeText(screen.getByTestId(nameFieldTestID), walk.name);
    await shePresses(onboardingActionTestID);
  }

  await shePresses(onboardingSkipTestID);

  if (walk.day === undefined) {
    // The way past her last period passes the question about the period before it as well.
    await shePresses(onboardingWayPastTestID);
  } else {
    await shePresses(dayTestID(walk.day));
    await shePresses(onboardingActionTestID);
    await shePresses(onboardingSkipTestID);
  }

  await shePresses(onboardingActionTestID);

  const passed = walk.focus === undefined ? theQuestionsLeftAfterTheCycleLength : 4;

  for (let question = 0; question < passed; question += 1) {
    await shePresses(onboardingSkipTestID);
  }

  if (walk.focus !== undefined) {
    for (const group of walk.focus) {
      await shePresses(focusTestID(group));
    }

    await shePresses(onboardingActionTestID);
    await shePresses(onboardingSkipTestID);
  }

  return { pathname: () => app.getPathname(), close: () => view.unmount() };
}

/** The screen that reads her answers back, which is two presses past the forecast. */
async function sheReadsOnToWhatWeWillDo(): Promise<void> {
  await shePresses(firstForecastActionTestID);
  await shePresses(promiseActionTestID);
}

/** The words of one card, which carries its title and then the line under it. */
function theCardSays(testID: string): string[] {
  return textIn(screen.getByTestId(testID));
}

/** The ring on its own, so what it says can be read without the write under it. */
async function theRing(onHeld: () => Promise<void> = () => Promise.resolve()): Promise<void> {
  await render(
    <OnAPhone>
      <HoldToBegin onHeld={onHeld} />
    </OnAPhone>,
  );
  // The answer about motion arrives from the phone as a promise, so it is in hand before her
  // thumb goes down rather than after it.
  await act(async () => {
    await Promise.resolve();
  });
}

describe('her first forecast is addressed to her', () => {
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

  describe('the first thing Emi says back to her', () => {
    it('greets her by the name she gave twelve questions earlier', async () => {
      const app = await sheWalksToHerForecast({ day: herPeriodStarted, name: theNameSheGives });

      expect(app.pathname()).toBe('/onboarding/first-forecast');
      expect(textIn(screen.getByTestId(firstForecastTitleTestID))).toEqual([
        theTitleOfHerForecast.named,
      ]);
    });

    it('reads as one clean sentence for a woman who gave no name', async () => {
      const app = await sheWalksToHerForecast({ day: herPeriodStarted });

      expect(app.pathname()).toBe('/onboarding/first-forecast');
      expect(textIn(screen.getByTestId(firstForecastTitleTestID))).toEqual([
        theTitleOfHerForecast.plain,
      ]);
      expect(screen.queryByText(theTitleOfHerForecast.named)).toBeNull();
    });

    it('reads the plain sentence for a woman who typed only spaces, because that is no name', async () => {
      await sheWalksToHerForecast({ day: herPeriodStarted, name: '   ' });

      expect(textIn(screen.getByTestId(firstForecastTitleTestID))).toEqual([
        theTitleOfHerForecast.plain,
      ]);
    });

    it('says it is still getting to know her cycle, and when it will say how sure it is', async () => {
      await sheWalksToHerForecast({ day: herPeriodStarted, name: theNameSheGives });

      expect(screen.getByText(theForecastSays.learning)).toBeTruthy();
    });

    it('says why the answer is a range, and that her phone worked it out', async () => {
      await sheWalksToHerForecast({ day: herPeriodStarted });

      expect(theCardSays(firstForecastWhyTestID)).toEqual([
        theForecastSays.why.title,
        theForecastSays.why.line,
      ]);
      expect(theCardSays(firstForecastOnThisPhoneTestID)).toEqual([
        theForecastSays.onThisPhone.title,
        theForecastSays.onThisPhone.line,
      ]);
    });

    it('carries the name in one form of the title and in neither other, in all three languages', () => {
      for (const language of languages) {
        const held = theCatalogueOf(language);

        expect({
          language,
          greets: String(held['onboarding.firstForecast.titleNamed']).includes('{name}'),
        }).toEqual({ language, greets: true });
        expect(String(held['onboarding.firstForecast.title'])).not.toContain('{name}');
        expect(String(held['onboarding.firstForecast.noDate.title'])).not.toContain('{name}');
      }

      expect(languages.length).toBe(3);
    });
  });

  describe('the forecast for a woman who could not name a day', () => {
    it('says they have no date to start from, and never guesses one', async () => {
      const app = await sheWalksToHerForecast({ name: theNameSheGives });

      expect(app.pathname()).toBe('/onboarding/first-forecast');
      expect(textIn(screen.getByTestId(firstForecastTitleTestID))).toEqual([
        theForecastWithNoDateSays.title,
      ]);
      expect(textIn(screen.getByTestId(firstForecastLinesTestID))).toContain(
        theForecastWithNoDateSays.first,
      );
      expect(textIn(screen.getByTestId(firstForecastNoGuessTestID))).toEqual([
        theForecastWithNoDateSays.guess,
      ]);
    });

    it('says how many cycles it needs, in the number the arithmetic asks for', async () => {
      await sheWalksToHerForecast();

      expect(textIn(screen.getByTestId(firstForecastStillLearningTestID))).toContain(
        theForecastWithNoDateSays.cycles,
      );
    });

    it('promises her nothing about a day, which is what the whole screen is for', async () => {
      await sheWalksToHerForecast();
      const read = textIn(screen.getByTestId(firstForecastTestID)).join(' ');

      expect(read).not.toMatch(/between/i);
      expect(read.match(/\b\d{1,2}(?:st|nd|rd|th)\b/g)).toBeNull();
    });
  });

  describe('the promise she reads after the forecast', () => {
    beforeEach(async () => {
      await sheWalksToHerForecast({ day: herPeriodStarted, name: theNameSheGives });
      await shePresses(firstForecastActionTestID);
    });

    it('keeps its one sentence word for word, because it is the whole product', () => {
      expect(screen.getByText(thePromiseSays.title)).toBeTruthy();
    });

    it('says each day is locked on this phone, and only the locked copy is sent', () => {
      expect(theCardSays(promiseLineTestID('encrypted'))).toEqual([
        thePromiseSays.encrypted.title,
        thePromiseSays.encrypted.line,
      ]);
    });

    it('says there is no password and no tracker', () => {
      expect(theCardSays(promiseLineTestID('noTracking'))).toEqual([
        thePromiseSays.noTracking.title,
        thePromiseSays.noTracking.line,
      ]);
    });

    it('says one press removes it all, any time', () => {
      expect(theCardSays(promiseLineTestID('delete'))).toEqual([
        thePromiseSays.delete.title,
        thePromiseSays.delete.line,
      ]);
    });
  });

  describe('the screen that reads her own answers back', () => {
    it('greets her by the name she gave', async () => {
      const app = await sheWalksToHerForecast({ day: herPeriodStarted, name: theNameSheGives });

      await sheReadsOnToWhatWeWillDo();

      expect(app.pathname()).toBe('/onboarding/what-emi-does-with-it');
      expect(textIn(screen.getByTestId(whatEmiDoesTitleTestID))).toEqual([
        theTitleOfWhatWeWillDo.named,
      ]);
    });

    it('reads as one clean sentence for a woman who gave no name', async () => {
      await sheWalksToHerForecast({ day: herPeriodStarted });

      await sheReadsOnToWhatWeWillDo();

      expect(textIn(screen.getByTestId(whatEmiDoesTitleTestID))).toEqual([
        theTitleOfWhatWeWillDo.plain,
      ]);
      expect(screen.queryByText(theTitleOfWhatWeWillDo.named)).toBeNull();
    });

    it('tells her the range starts wide and narrows as they learn her cycle', async () => {
      await sheWalksToHerForecast({ day: herPeriodStarted });

      await sheReadsOnToWhatWeWillDo();

      expect(theCardSays(whatEmiDoesCardTestID('forecast'))).toEqual([
        whatWeWillDoSays.forecast.title,
        whatWeWillDoSays.forecast.line,
      ]);
    });

    it('names the groups she pressed, just as she asked', async () => {
      await sheWalksToHerForecast({ day: herPeriodStarted, focus: ['sleep', 'mood', 'pain'] });

      await sheReadsOnToWhatWeWillDo();

      expect(theCardSays(whatEmiDoesCardTestID('log'))).toEqual([
        whatWeWillDoSays.log.title,
        whatWeWillDoSays.log.chosen,
      ]);
    });

    it('names one group in the singular, so the sentence is her answer and not a form', async () => {
      await sheWalksToHerForecast({ day: herPeriodStarted, focus: ['sleep'] });

      await sheReadsOnToWhatWeWillDo();

      expect(theCardSays(whatEmiDoesCardTestID('log'))).toEqual([
        whatWeWillDoSays.log.title,
        whatWeWillDoSays.log.one,
      ]);
    });

    it('tells a woman who pressed none what she will see instead of reading her an empty list', async () => {
      await sheWalksToHerForecast({ day: herPeriodStarted });

      await sheReadsOnToWhatWeWillDo();

      expect(theCardSays(whatEmiDoesCardTestID('log'))).toEqual([
        whatWeWillDoSays.log.title,
        whatWeWillDoSays.log.usual,
      ]);
    });

    it('says it is all encrypted on this phone, and nobody else can read it', async () => {
      await sheWalksToHerForecast({ day: herPeriodStarted });

      await sheReadsOnToWhatWeWillDo();

      expect(theCardSays(whatEmiDoesCardTestID('privacy'))).toEqual([
        whatWeWillDoSays.privacy.title,
        whatWeWillDoSays.privacy.line,
      ]);
    });

    it('carries the name in one form of the title and not in the other, in all three languages', () => {
      for (const language of languages) {
        const held = theCatalogueOf(language);

        expect({
          language,
          greets: String(held['onboarding.whatEmiDoes.titleNamed']).includes('{name}'),
        }).toEqual({ language, greets: true });
        expect(String(held['onboarding.whatEmiDoes.title'])).not.toContain('{name}');
      }

      expect(languages.length).toBe(3);
    });
  });

  describe('the hold she gives at the end of it', () => {
    it('names the three things the hold is about, and says what the hold does', async () => {
      const app = await sheWalksToHerForecast({ day: herPeriodStarted, name: theNameSheGives });

      await sheReadsOnToWhatWeWillDo();
      await shePresses(whatEmiDoesActionTestID);

      expect(app.pathname()).toBe('/onboarding/hold');
      const read = textIn(screen.getByTestId(holdScreenTestID));
      expect(read).toContain(theHoldSays.title);
      expect(read).toContain(theHoldSays.instruction);
      expect(read).toContain(theHoldSays.sealed);
    });

    it('asks her to keep holding while her thumb is down', async () => {
      await theRing();

      await act(async () => {
        fireEvent(screen.getByTestId(holdCoreTestID), 'pressIn');
      });

      expect(screen.getByTestId(holdCoreTestID)).toHaveTextContent(theHoldSays.held);
    });

    it('says the save did not happen when the write refuses, and asks for the ring again', async () => {
      await theRing(() => Promise.reject(new Error('the write refused')));

      await act(async () => {
        fireEvent(screen.getByTestId(holdCoreTestID), 'pressIn');
      });
      await act(async () => {
        jest.advanceTimersByTime(HOLD_MILLISECONDS);
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByTestId(holdRefusedTestID)).toHaveTextContent(theHoldSays.refused);
    });
  });

  describe('the voice these four screens are written in', () => {
    it('carries no exclamation mark, in any of the three languages', () => {
      for (const language of languages) {
        const loud = theKeysOfTheseScreens().filter((key) =>
          theWordsOfTheseScreensIn(language, [key]).some((line) => line.includes('!')),
        );

        expect({ language, loud }).toEqual({ language, loud: [] });
      }

      expect(theKeysOfTheseScreens().length).toBeGreaterThan(20);
    });

    it('talks to her as we, and names Emi on one line only', () => {
      for (const language of languages) {
        const naming = theKeysOfTheseScreens().filter((key) =>
          searchableText(theWordsOfTheseScreensIn(language, [key]).join('\n')).includes('Emi'),
        );

        expect({ language, naming }).toEqual({ language, naming: [theLineThatNamesEmi] });
        expect({
          language,
          asWe: howEachLanguageSaysWe[language].test(theWordsOfTheseScreensIn(language).join('\n')),
        }).toEqual({ language, asWe: true });
      }
    });

    it('says no word a screen refuses, in any of the three languages', () => {
      for (const language of languages) {
        const claims = interfaceClaimsIn(
          `the four screens in ${language}`,
          theWordsOfTheseScreensIn(language).join('\n'),
        );

        expect(claims.map(describeClaim)).toEqual([]);
      }
    });

    it('is written in every language, and never the English line left behind', () => {
      for (const key of theKeysOfTheseScreens()) {
        const said = languages.map((language) =>
          theWordsOfTheseScreensIn(language, [key]).join('|'),
        );

        expect({ key, missing: said.filter((each) => each.length === 0) }).toEqual({
          key,
          missing: [],
        });
      }
    });
  });
});
