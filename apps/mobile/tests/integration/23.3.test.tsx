import { resolve } from 'node:path';

import { CYCLES_BEFORE_A_FORECAST } from '@emi/cycle';
import { render } from '@testing-library/react-native';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { sheGivesAPeriod } from '../fixtures/thePastPeriods';

import { describeClaim, searchableText } from '../../../../tools/pipeline/forbiddenClaims';
import { interfaceClaimsIn } from '../../../../tools/pipeline/interfaceClaims';
import { type Language, type Words, catalogueOf, languages, wordKeys } from '../../src/language';
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
  holdButtonTestID,
  holdCoreTestID,
  holdRefusedTestID,
  holdScreenTestID,
} from '../../src/features/onboarding/HoldToBegin';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
  onboardingWayPastTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import {
  promiseActionTestID,
  promiseLineTestID,
  thePromiseTestID,
} from '../../src/features/onboarding/ThePromise';
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
import { cycleLengthDaysTestID } from '../../src/features/onboarding/CycleLength';
import { shePassesTheQuestion } from '../fixtures/theFirstRun';

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

/**
 * The questions after the cycle length: period length, regular, feeling, goals, focus, today and
 * the reminder.
 */
const theQuestionsLeftAfterTheCycleLength = 7;

/**
 * The redesign titles the forecast with a label and the range under it, and greets nobody, so the
 * name she gave is read back on the screen after it and not here.
 */
const theTitleOfHerForecast = {
  plain: 'Your next period',
  theOldGreeting: `${theNameSheGives}, here's your next period`,
};

/** The redesign titles this screen in Emi's name, and greets nobody, so the old two forms are gone. */
const theTitleOfWhatEmiDoes = {
  now: 'Here is what Emi does with what you told it',
  theOldGreeting: `${theNameSheGives}, here's what we'll do with your answers`,
  theOldPlain: "Here's what we'll do with your answers",
};

/** What the forecast says under the range, and on the two cards beside it. */
const theForecastSays = {
  learning: 'Still learning',
  needs: `Emi needs ${String(CYCLES_BEFORE_A_FORECAST)} complete cycles before it forecasts from your own cycles, so this is still learning.`,
  why: {
    title: 'Why a range?',
    line: 'Emi has read 0 complete cycles. Until it reads 2, it counts the 28 days you gave from your last period. The range runs 3 days either side of that day.',
  },
  onThisPhone: {
    title: 'Worked out on this phone',
    line: 'The arithmetic runs here. No cycle of yours is sent anywhere to be worked out.',
  },
};

/** What a woman who could not name a day reads in place of a range. */
const theForecastWithNoDateSays = {
  title: 'Emi has no date to count from',
  first: 'The first period you log starts everything.',
  guess:
    'Emi builds no forecast from a date it guessed, because a guess on day one is a false sentence on day one.',
  cycles: `Emi needs ${String(CYCLES_BEFORE_A_FORECAST)} complete cycles before it forecasts from your own cycles.`,
};

/** The three lines of the promise, one sentence each, as the redesign writes them. */
const thePromiseSays = {
  title: 'Only you can read your days.',
  encrypted: 'Encrypted on this phone, with a key only you hold',
  noTracking: 'No password, no tracking tools',
  delete: 'Delete everything, in one press',
};

/** The three sections that read her own answers back to her, each as a label and a heading. */
const whatEmiDoesSays = {
  forecast: { title: 'Your forecast', line: 'A range, and how sure Emi is' },
  log: {
    title: 'Your log',
    line: 'What you see first',
    chosen: 'Your log shows the groups you chose first: sleep, mood and pain.',
    one: 'Your log shows the group you chose first: sleep.',
    usual: 'Your log opens in the usual order, starting with mood, energy and pain.',
  },
  privacy: { title: 'Your privacy', line: 'Only you can read any of it' },
};

/**
 * The moment she gives her thumb. The redesign writes "the ring" where this writes "the button",
 * because the button is the one thing on the screen she presses and holds.
 */
const theHoldSays = {
  title: 'Your cycle, your data, your key.',
  instruction: 'Press and hold the button to begin.',
  sealed:
    "Holding the button saves your answers, sealed with your key. Emi makes the key and keeps it in this phone's keychain.",
  action: 'Hold to begin',
  held: 'Keep holding',
  refused: "That didn't save. Press and hold the button again.",
};

/** The four screens this step writes, as the catalogue names them. */
const theScreensSheReads: readonly string[] = [
  'onboarding.firstForecast.',
  'onboarding.promise.',
  'onboarding.whatEmiDoes.',
  'onboarding.hold.',
];

/** How each language writes the first person plural, which none of these four screens uses. */
const howEachLanguageSaysWe: Readonly<Record<Language, RegExp>> = {
  en: /(?<!\p{Letter})(we|our)(?!\p{Letter})/iu,
  es: /(?<!\p{Letter})(nos|nuestro|nuestra)(?!\p{Letter})|mos(?!\p{Letter})/iu,
  ru: /(?<!\p{Letter})(мы|наш|нам)/iu,
};

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
    await shePresses(onboardingWayPastTestID);
  } else {
    await sheGivesAPeriod(0, walk.day);
    await shePresses(onboardingActionTestID);
  }

  await shePresses(cycleLengthDaysTestID(28));
  await shePresses(onboardingActionTestID);

  const passed = walk.focus === undefined ? theQuestionsLeftAfterTheCycleLength : 4;

  for (let question = 0; question < passed; question += 1) {
    await shePassesTheQuestion();
  }

  if (walk.focus !== undefined) {
    for (const group of walk.focus) {
      await shePresses(focusTestID(group));
    }

    await shePresses(onboardingActionTestID);
    await shePresses(onboardingSkipTestID);
    await shePresses(onboardingSkipTestID);
  }

  return { pathname: () => app.getPathname(), close: () => view.unmount() };
}

/** The screen that reads her answers back, which is two presses past the forecast. */
async function sheReadsOnToWhatEmiDoes(): Promise<void> {
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
    it('reads the redesign label for a woman who gave her name, and no longer greets her by it', async () => {
      const app = await sheWalksToHerForecast({ day: herPeriodStarted, name: theNameSheGives });

      expect(app.pathname()).toBe('/onboarding/first-forecast');
      expect(textIn(screen.getByTestId(firstForecastTitleTestID))).toEqual([
        theTitleOfHerForecast.plain,
      ]);
      expect(screen.queryByText(theTitleOfHerForecast.theOldGreeting)).toBeNull();
    });

    it('reads as one clean sentence for a woman who gave no name', async () => {
      const app = await sheWalksToHerForecast({ day: herPeriodStarted });

      expect(app.pathname()).toBe('/onboarding/first-forecast');
      expect(textIn(screen.getByTestId(firstForecastTitleTestID))).toEqual([
        theTitleOfHerForecast.plain,
      ]);
      expect(screen.queryByText(theTitleOfHerForecast.theOldGreeting)).toBeNull();
    });

    it('reads the plain sentence for a woman who typed only spaces, because that is no name', async () => {
      await sheWalksToHerForecast({ day: herPeriodStarted, name: '   ' });

      expect(textIn(screen.getByTestId(firstForecastTitleTestID))).toEqual([
        theTitleOfHerForecast.plain,
      ]);
    });

    it('tags the range Still learning, and says how many complete cycles Emi needs', async () => {
      await sheWalksToHerForecast({ day: herPeriodStarted, name: theNameSheGives });

      expect(screen.getByText(theForecastSays.learning)).toBeTruthy();
      expect(screen.getByText(theForecastSays.needs)).toBeTruthy();
    });

    it('says why the answer is a range, and that her phone worked it out', async () => {
      await sheWalksToHerForecast({ day: herPeriodStarted });

      // The circles of the days come first in the card, and the words follow them.
      expect(theCardSays(firstForecastWhyTestID).slice(-2)).toEqual([
        theForecastSays.why.title,
        theForecastSays.why.line,
      ]);
      expect(theCardSays(firstForecastOnThisPhoneTestID)).toEqual([
        theForecastSays.onThisPhone.title,
        theForecastSays.onThisPhone.line,
      ]);
    });

    it('carries no name in either title, and no greeting key, in all three languages', () => {
      for (const language of languages) {
        const held = theCatalogueOf(language);

        expect({
          language,
          greeting: held['onboarding.firstForecast.titleNamed'],
        }).toEqual({ language, greeting: undefined });
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

    it('says her days are encrypted on this phone, and says nothing is sent', () => {
      expect(theCardSays(promiseLineTestID('encrypted'))).toEqual([thePromiseSays.encrypted]);
      expect(textIn(screen.getByTestId(thePromiseTestID)).join(' ')).not.toMatch(/sent|copy/i);
    });

    it('says there is no password and no tracking tool', () => {
      expect(theCardSays(promiseLineTestID('noTracking'))).toEqual([thePromiseSays.noTracking]);
    });

    it('says one press deletes everything', () => {
      expect(theCardSays(promiseLineTestID('delete'))).toEqual([thePromiseSays.delete]);
    });
  });

  describe('the screen that reads her own answers back', () => {
    it('titles itself in the name of Emi and greets nobody, even a woman who gave her name', async () => {
      const app = await sheWalksToHerForecast({ day: herPeriodStarted, name: theNameSheGives });

      await sheReadsOnToWhatEmiDoes();

      expect(app.pathname()).toBe('/onboarding/what-emi-does-with-it');
      expect(textIn(screen.getByTestId(whatEmiDoesTitleTestID))).toEqual([
        theTitleOfWhatEmiDoes.now,
      ]);
      expect(screen.queryByText(theTitleOfWhatEmiDoes.theOldGreeting)).toBeNull();
    });

    it('reads the same title for a woman who gave no name', async () => {
      await sheWalksToHerForecast({ day: herPeriodStarted });

      await sheReadsOnToWhatEmiDoes();

      expect(textIn(screen.getByTestId(whatEmiDoesTitleTestID))).toEqual([
        theTitleOfWhatEmiDoes.now,
      ]);
      expect(screen.queryByText(theTitleOfWhatEmiDoes.theOldPlain)).toBeNull();
    });

    it('says the forecast is a range, and says how sure Emi is', async () => {
      await sheWalksToHerForecast({ day: herPeriodStarted });

      await sheReadsOnToWhatEmiDoes();

      expect(theCardSays(whatEmiDoesCardTestID('forecast'))).toEqual([
        whatEmiDoesSays.forecast.title,
        whatEmiDoesSays.forecast.line,
      ]);
    });

    it('names the groups she pressed back to her', async () => {
      await sheWalksToHerForecast({ day: herPeriodStarted, focus: ['sleep', 'mood', 'pain'] });

      await sheReadsOnToWhatEmiDoes();

      expect(theCardSays(whatEmiDoesCardTestID('log'))).toEqual([
        whatEmiDoesSays.log.title,
        whatEmiDoesSays.log.line,
        'Sleep',
        'Mood',
        'Pain',
        whatEmiDoesSays.log.chosen,
      ]);
    });

    it('names one group in the singular, so the sentence is her answer and not a form', async () => {
      await sheWalksToHerForecast({ day: herPeriodStarted, focus: ['sleep'] });

      await sheReadsOnToWhatEmiDoes();

      expect(theCardSays(whatEmiDoesCardTestID('log')).at(-1)).toBe(whatEmiDoesSays.log.one);
    });

    it('shows a woman who pressed none what everybody opens with, instead of an empty list', async () => {
      await sheWalksToHerForecast({ day: herPeriodStarted });

      await sheReadsOnToWhatEmiDoes();

      expect(theCardSays(whatEmiDoesCardTestID('log'))).toEqual([
        whatEmiDoesSays.log.title,
        whatEmiDoesSays.log.line,
        'Mood',
        'Energy',
        'Pain',
        whatEmiDoesSays.log.usual,
      ]);
    });

    it('says only she can read any of it', async () => {
      await sheWalksToHerForecast({ day: herPeriodStarted });

      await sheReadsOnToWhatEmiDoes();

      expect(theCardSays(whatEmiDoesCardTestID('privacy'))).toEqual([
        whatEmiDoesSays.privacy.title,
        whatEmiDoesSays.privacy.line,
      ]);
    });

    it('carries no name and no greeting key, in all three languages', () => {
      for (const language of languages) {
        const held = theCatalogueOf(language);

        expect({ language, title: String(held['onboarding.whatEmiDoes.title']) }).not.toEqual({
          language,
          title: expect.stringContaining('{name}'),
        });
        expect(Object.keys(held)).not.toContain('onboarding.whatEmiDoes.titleNamed');
      }

      expect(languages.length).toBe(3);
    });
  });

  describe('the hold she gives at the end of it', () => {
    it('names the three things the hold is about, and says what the hold does', async () => {
      const app = await sheWalksToHerForecast({ day: herPeriodStarted, name: theNameSheGives });

      await sheReadsOnToWhatEmiDoes();
      await shePresses(whatEmiDoesActionTestID);

      expect(app.pathname()).toBe('/onboarding/hold');
      const read = textIn(screen.getByTestId(holdScreenTestID));
      expect(read).toContain(theHoldSays.title);
      expect(read).toContain(theHoldSays.instruction);
      expect(read).toContain(theHoldSays.sealed);
      expect(screen.getByTestId(holdButtonTestID)).toHaveTextContent(theHoldSays.action);
    });

    it('asks her to keep holding while her thumb is down', async () => {
      await theRing();

      await act(async () => {
        fireEvent(screen.getByTestId(holdButtonTestID), 'pressIn');
      });

      expect(screen.getByTestId(holdButtonTestID)).toHaveTextContent(theHoldSays.held);
      expect(screen.getByTestId(holdCoreTestID)).toHaveTextContent(theHoldSays.instruction);
    });

    it('says the save did not happen when the write refuses, and asks for the button again', async () => {
      await theRing(() => Promise.reject(new Error('the write refused')));

      await act(async () => {
        fireEvent(screen.getByTestId(holdButtonTestID), 'pressIn');
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

    it('never talks as we after the forecast either, and names Emi on each of those screens', () => {
      const theScreensAfterTheForecast = [
        'onboarding.promise.',
        'onboarding.whatEmiDoes.',
        'onboarding.hold.',
      ];

      for (const language of languages) {
        const read = theWordsOfTheseScreensIn(
          language,
          theKeysOfTheseScreens().filter((key) => !key.startsWith('onboarding.firstForecast.')),
        ).join('\n');

        expect({ language, asWe: howEachLanguageSaysWe[language].test(read) }).toEqual({
          language,
          asWe: false,
        });

        const naming = theScreensAfterTheForecast.filter((prefix) =>
          searchableText(
            theWordsOfTheseScreensIn(
              language,
              theKeysOfTheseScreens().filter((key) => key.startsWith(prefix)),
            ).join('\n'),
          ).includes('Emi'),
        );

        expect({ language, naming }).toEqual({
          language,
          naming: ['onboarding.whatEmiDoes.', 'onboarding.hold.'],
        });
      }
    });

    it('names Emi on the forecast and never talks as we there, as the redesign writes it', () => {
      const theForecastKeys = theKeysOfTheseScreens().filter((key) =>
        key.startsWith('onboarding.firstForecast.'),
      );

      for (const language of languages) {
        const read = theWordsOfTheseScreensIn(language, theForecastKeys).join('\n');

        expect({ language, namesEmi: read.includes('Emi') }).toEqual({ language, namesEmi: true });
        expect({ language, asWe: howEachLanguageSaysWe[language].test(read) }).toEqual({
          language,
          asWe: false,
        });
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
