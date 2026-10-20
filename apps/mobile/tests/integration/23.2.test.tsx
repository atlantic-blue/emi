import { resolve } from 'node:path';

import { render, screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';
import { sheGivesAPeriod } from '../fixtures/thePastPeriods';

import {
  approvedDenials,
  describeClaim,
  searchableText,
} from '../../../../tools/pipeline/forbiddenClaims';
import { interfaceClaimsIn } from '../../../../tools/pipeline/interfaceClaims';
import { type Language, type Words, catalogueOf, languages, wordKeys } from '../../src/language';
import { Feeling, feelingTestID } from '../../src/features/onboarding/Feeling';
import { Regularity } from '../../src/features/onboarding/Regularity';
import { Today } from '../../src/features/onboarding/Today';
import { YearOfBirth } from '../../src/features/onboarding/YearOfBirth';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
  onboardingTitleTestID,
  onboardingWayPastTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { nameFieldTestID } from '../../src/features/onboarding/HerName';
import { yearTestID } from '../../src/components/YearWheel';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import type { Database } from '../../src/data/database';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { OnAPhone } from '../fixtures/theSafeArea';
import { cycleLengthDaysTestID } from '../../src/features/onboarding/CycleLength';
import { locksDrawnIn } from '../fixtures/drawnLocks';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

/**
 * The questions of the first run, in the voice `docs/design/voice.md` sets. The name she gives
 * comes back at the question after it, an answer she gives is answered where she gave it, and one
 * line tells her who can read what she keeps.
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

/** The year the wheel offers her, pressed where a walk answers that question rather than passing it. */
const theYearSheWasBornIn = 1994;

const theQuestionAboutTheYear = {
  named: `Nice to meet you, ${theNameSheGives}. What year were you born?`,
  plain: 'What year were you born?',
};

const theLastQuestion = {
  plain: 'How are you today?',
  oldNamed: `${theNameSheGives}, how are you feeling today?`,
  oldPlain: 'How are you feeling today?',
};

/** What the question about her cycle answered her with, before the redesign took the reply away. */
const theOldRepliesAboutHerCycle: readonly string[] = [
  "Good to know. We'll still show a range, because even regular cycles move a little.",
  "That's common. We'll start with a wider range and narrow it as we learn yours.",
  "That's fine. Your log will tell us soon enough.",
];

/** What each thing she could say about how she feels was answered with, before the redesign. */
const theOldRepliesAboutHowSheFeels = {
  fine: "Then we'll keep things short.",
  hard: "We hear you. We'll show you when it's coming, so you can plan around it.",
  understand: "You're in the right place. The more you log, the more it makes sense.",
} as const;

/** The line the questions about how she feels and her goals read, before the redesign. */
const onlyYouCanReadThis: Readonly<Record<Language, string>> = {
  en: 'Only you can read this.',
  es: 'Solo tú puedes leer esto.',
  ru: 'Это можете прочитать только вы.',
};

const theKeyOfThatLine = 'onboarding.onlyYou';

/** The line the question about how she feels drew at its foot, before the welcome linked the page. */
const encryptedOnThisPhone: Readonly<Record<Language, string>> = {
  en: 'Encrypted on this phone.',
  es: 'Cifrado en este teléfono.',
  ru: 'Зашифровано на этом телефоне.',
};
const theKeyOfEncryptedOnThisPhone = 'onboarding.encryptedHere';

/** The line the question about her goals drew at its foot, before the welcome linked the page. */
const theKeyOfEmiEncryptsYourAnswers = 'onboarding.encryptsYourAnswers';

/** The line the first questions drew at their foot, which the pages outside the first run keep. */
const theLineAboutEncryption = 'Emi encrypts this on the phone before it goes anywhere.';

/** The five keys that each said it in their own words, and are gone now one line says it. */
const theKeysThatWent: readonly string[] = [
  'onboarding.name.line.sealed',
  'onboarding.birthYear.line.sealed',
  'onboarding.lastPeriod.line.privacy',
  'onboarding.feeling.line.encrypted',
  'onboarding.goals.line.encrypted',
];

/** The answers she picks from on the two questions that answer her, in her own words. */
const theAnswersAboutHerCycle: readonly string[] = [
  'Yes, most months',
  'No, it moves',
  'I do not know yet',
];

const theAnswersAboutHowSheFeels: readonly string[] = [
  'I am fine with it',
  'It is hard, most months',
  'I want to understand it',
];

/** How each language writes the first person plural, which the questions no longer speak in. */
const howEachLanguageSaysWe: Readonly<Record<Language, RegExp>> = {
  en: /(?<!\p{Letter})(we|our|let's)(?!\p{Letter})/iu,
  es: /(?<!\p{Letter})(nos|nuestro|nuestra)(?!\p{Letter})|mos(?!\p{Letter})/iu,
  ru: /(?<!\p{Letter})(мы|наш|нам)/iu,
};

/** The twelve questions, which is the first run without the three screens she only reads. */
const theScreensOfTheQuestions: readonly string[] = [
  'welcome',
  'name',
  'birthYear',
  'cycleLength',
  'periodLength',
  'regularity',
  'feeling',
  'goals',
  'focus',
  'today',
];

/** The one line that names Emi on purpose, because the product's name is the point of it. */
const theGreeting = 'onboarding.welcome.title';

/**
 * The screens the redesign has redrawn are written as the design writes them, and the design names
 * Emi in them by name: the welcome, the question about her name, the line about encryption, and
 * the lines under her period length and her regularity.
 */
const theWelcomeNamingEmi = [
  'onboarding.feeling.line.hard',
  'onboarding.focus.line.first',
  'onboarding.goals.title',
  'onboarding.name.line.greets',
  'onboarding.name.title',
  'onboarding.periodLength.line.logged',
  'onboarding.regularity.line.explains',
  'onboarding.welcome.line.noAccount',
  'onboarding.welcome.line.whatEmiIs',
  theGreeting,
  'pastPeriods.line.forecast',
];

function formsOf(held: Words): string[] {
  return typeof held === 'string' ? [held] : Object.values(held);
}

function theCatalogueOf(language: Language): Readonly<Record<string, Words>> {
  return Object.fromEntries(Object.entries(catalogueOf(language)));
}

/** Every key of the twelve questions. */
function theKeysOfTheQuestions(): string[] {
  return [
    ...wordKeys.filter((key) =>
      theScreensOfTheQuestions.some((asked) => key.startsWith(`onboarding.${asked}.`)),
    ),
    // Her last three periods are asked in one step whose words are shared with the screen the
    // calendar opens, so they sit under their own name rather than under the first run's.
    ...wordKeys.filter((key) => key.startsWith('pastPeriods.')),
  ];
}

/** Every word of the twelve questions in one language, out of that language's own catalogue. */
function theWordsOfTheQuestionsIn(language: Language, keys = theKeysOfTheQuestions()): string[] {
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

function theQuestionSheIsReading(): string {
  return String(screen.getByTestId(onboardingTitleTestID).props.children);
}

/** Where a walk through the questions can stop, which is at one of the two that answer her. */
type AQuestion = 'birthYear' | 'regularity' | 'feeling' | 'today';

/**
 * The first run walked from the welcome to the question named, answering her last period, which is
 * the one answer it cannot do without, and passing by the rest.
 */
async function sheWalksTo(
  question: AQuestion,
  name?: string,
): Promise<{ readonly getPathname: () => string }> {
  const app = renderRouter(appDirectory, { initialUrl: '/' });
  const whereSheIs = { getPathname: () => app.getPathname() };

  await app;
  await shePresses(onboardingActionTestID);

  if (name === undefined) {
    await shePresses(onboardingSkipTestID);
  } else {
    await fireEvent.changeText(screen.getByTestId(nameFieldTestID), name);
    await shePresses(onboardingActionTestID);
  }

  if (question === 'birthYear') {
    return whereSheIs;
  }

  await shePresses(yearTestID(theYearSheWasBornIn));
  await shePresses(onboardingActionTestID);
  await sheGivesAPeriod(0, herPeriodStarted);
  await shePresses(onboardingActionTestID);
  await shePresses(cycleLengthDaysTestID(28));
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingWayPastTestID);

  if (question === 'regularity') {
    return whereSheIs;
  }

  await shePresses(onboardingSkipTestID);

  if (question === 'feeling') {
    return whereSheIs;
  }

  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);

  return whereSheIs;
}

describe('the first run questions use her name and reply to her answers', () => {
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

  describe('the question after she gives her name', () => {
    it('asks the plain question after she gives her name, as the redesign draws it', async () => {
      const app = await sheWalksTo('birthYear', theNameSheGives);

      expect(app.getPathname()).toBe('/onboarding/year-of-birth');
      expect(theQuestionSheIsReading()).toBe(theQuestionAboutTheYear.plain);
      expect(screen.queryByText(theQuestionAboutTheYear.named)).toBeNull();
    });

    it('asks the plain question of a woman who gave no name', async () => {
      const app = await sheWalksTo('birthYear');

      expect(app.getPathname()).toBe('/onboarding/year-of-birth');
      expect(theQuestionSheIsReading()).toBe(theQuestionAboutTheYear.plain);
    });

    it('asks the plain question of a woman who typed only spaces, because that is no name', async () => {
      const app = await sheWalksTo('birthYear', '   ');

      expect(app.getPathname()).toBe('/onboarding/year-of-birth');
      expect(theQuestionSheIsReading()).toBe(theQuestionAboutTheYear.plain);
    });

    it('is the plain question on the screen that asks it again later, which greets nobody', async () => {
      await render(
        <OnAPhone>
          <YearOfBirth
            chosen={undefined}
            now={whenSheOpensIt}
            onBack={() => undefined}
            onChoose={() => undefined}
            onContinue={() => undefined}
            onSkip={() => undefined}
          />
        </OnAPhone>,
      );

      expect(theQuestionSheIsReading()).toBe(theQuestionAboutTheYear.plain);
    });

    it('carries only the plain form in all three languages, so no screen can greet her there', () => {
      for (const language of languages) {
        const held = theCatalogueOf(language);

        expect({ language, named: 'onboarding.birthYear.titleNamed' in held }).toEqual({
          language,
          named: false,
        });
        expect(String(held['onboarding.birthYear.title'])).not.toContain('{name}');
      }

      expect(languages.length).toBe(3);
    });
  });

  describe('the last question of the first run', () => {
    it('asks the plain question of a woman who gave her name, as the redesign draws it', async () => {
      const app = await sheWalksTo('today', theNameSheGives);

      expect(app.getPathname()).toBe('/onboarding/today');
      expect(theQuestionSheIsReading()).toBe(theLastQuestion.plain);
      expect(screen.queryByText(theLastQuestion.oldNamed)).toBeNull();
      expect(screen.queryByText(theLastQuestion.oldPlain)).toBeNull();
    });

    it('asks the same plain question of a woman who gave no name', async () => {
      await render(
        <OnAPhone>
          <Today
            chosen={[]}
            onAllSymptoms={() => undefined}
            onBack={() => undefined}
            onPress={() => undefined}
            onSave={() => undefined}
            onSkip={() => undefined}
          />
        </OnAPhone>,
      );

      expect(theQuestionSheIsReading()).toBe(theLastQuestion.plain);
    });

    it('carries only the plain form in all three languages, so no screen can greet her there', () => {
      for (const language of languages) {
        const held = theCatalogueOf(language);

        expect({ language, named: 'onboarding.today.titleNamed' in held }).toEqual({
          language,
          named: false,
        });
        expect(String(held['onboarding.today.title'])).not.toContain('{name}');
      }

      expect(languages.length).toBe(3);
    });
  });

  describe('the reply under the answers', () => {
    for (const answer of ['regular', 'moves', 'unknown'] as const) {
      it(`says nothing back about her cycle once she picks "${answer}", as the redesign draws it`, async () => {
        await render(
          <OnAPhone>
            <Regularity
              chosen={answer}
              onBack={() => undefined}
              onChoose={() => undefined}
              onContinue={() => undefined}
              onSkip={() => undefined}
            />
          </OnAPhone>,
        );

        expect(screen.queryByTestId('regularity-reply')).toBeNull();
        expect(
          theOldRepliesAboutHerCycle.filter((each) => screen.queryByText(each) !== null),
        ).toEqual([]);
      });
    }

    for (const answer of Object.keys(theOldRepliesAboutHowSheFeels)) {
      it(`says nothing back about how she feels once she picks "${answer}", as the redesign draws it`, async () => {
        await render(
          <OnAPhone>
            <Feeling
              chosen={answer as keyof typeof theOldRepliesAboutHowSheFeels}
              onBack={() => undefined}
              onChoose={() => undefined}
              onContinue={() => undefined}
              onSkip={() => undefined}
            />
          </OnAPhone>,
        );

        expect(screen.getByTestId(feelingTestID(answer as 'fine'))).toBeChecked();
        expect(screen.queryByTestId('feeling-reply')).toBeNull();
        expect(
          Object.values(theOldRepliesAboutHowSheFeels).filter(
            (each) => screen.queryByText(each) !== null,
          ),
        ).toEqual([]);
      });
    }

    it('keeps no reply about how she feels in any language, so no screen can draw one again', () => {
      const keys = Object.keys(theOldRepliesAboutHowSheFeels).map(
        (answer) => `onboarding.feeling.reply.${answer}`,
      );

      for (const language of languages) {
        const held = Object.keys(theCatalogueOf(language));

        expect({ language, left: keys.filter((key) => held.includes(key)) }).toEqual({
          language,
          left: [],
        });
      }

      expect(keys).toHaveLength(3);
    });
  });

  describe('the padlock lines, which the first run no longer draws', () => {
    it('are gone from each of the three languages', () => {
      for (const language of languages) {
        const keys = Object.keys(catalogueOf(language));

        expect({
          language,
          left: [theKeyOfEncryptedOnThisPhone, theKeyOfEmiEncryptsYourAnswers].filter((key) =>
            keys.includes(key),
          ),
        }).toEqual({ language, left: [] });
      }

      expect(languages.length).toBe(3);
    });

    it('keep out the line only you can read this, which no catalogue holds now', () => {
      for (const language of languages) {
        const keys = Object.keys(catalogueOf(language));

        expect({ language, left: keys.includes(theKeyOfThatLine) }).toEqual({
          language,
          left: false,
        });
      }
    });

    it('keep out the five lines that each said it in their own words before', () => {
      for (const language of languages) {
        const keys = Object.keys(catalogueOf(language));

        expect({ language, left: theKeysThatWent.filter((key) => keys.includes(key)) }).toEqual({
          language,
          left: [],
        });
      }

      expect(theKeysThatWent).toHaveLength(5);
    });

    it('leave the question after her name with no line about encryption and no lock', async () => {
      await sheWalksTo('birthYear', theNameSheGives);

      expect(screen.queryByText(theLineAboutEncryption)).toBeNull();
      expect(screen.queryByText(onlyYouCanReadThis.en)).toBeNull();
      expect(locksDrawnIn(screen.root)).toBe(0);
    });

    it('leave the question about how she feels with no line about encryption and no lock', async () => {
      const app = await sheWalksTo('feeling');

      expect(app.getPathname()).toBe('/onboarding/feeling');
      expect(screen.queryByText(encryptedOnThisPhone.en)).toBeNull();
      expect(screen.queryByText(onlyYouCanReadThis.en)).toBeNull();
      expect(locksDrawnIn(screen.root)).toBe(0);
    });
  });

  describe('the voice the questions are written in', () => {
    it('carries no exclamation mark in the whole first run', () => {
      for (const language of languages) {
        const keys = theKeysOfTheQuestions();
        const loud = keys.filter((key) =>
          theWordsOfTheQuestionsIn(language, [key]).some((line) => line.includes('!')),
        );

        expect({ language, loud }).toEqual({ language, loud: [] });
      }
    });

    it('writes her answers about her cycle in her own words, in the first person', async () => {
      await sheWalksTo('regularity');

      for (const answer of theAnswersAboutHerCycle) {
        expect(screen.getByText(answer)).toBeTruthy();
      }

      expect(theAnswersAboutHerCycle).toHaveLength(3);
    });

    it('writes her answers about how she feels in her own words too', async () => {
      await sheWalksTo('feeling');

      for (const answer of theAnswersAboutHowSheFeels) {
        expect(screen.getByText(answer)).toBeTruthy();
      }

      expect(screen.getByTestId(feelingTestID('hard'))).toBeTruthy();
      expect(theAnswersAboutHowSheFeels).toHaveLength(3);
    });

    it('names Emi where the redesign names it and never speaks as we, in each of the three languages', () => {
      for (const language of languages) {
        const keys = theKeysOfTheQuestions();
        const read = theWordsOfTheQuestionsIn(language).join('\n');

        const naming = keys.filter((key) =>
          searchableText(theWordsOfTheQuestionsIn(language, [key]).join('\n')).includes('Emi'),
        );

        expect({ language, naming: [...naming].sort() }).toEqual({
          language,
          naming: theWelcomeNamingEmi,
        });
        expect({ language, asWe: howEachLanguageSaysWe[language].test(read) }).toEqual({
          language,
          asWe: false,
        });
      }
    });

    it('still denies the two claims on the welcome, each after a full stop', () => {
      const denial = (beginning: string): string => {
        const found = approvedDenials.find((each) => each.startsWith(beginning));

        if (found === undefined) {
          throw new Error(`no approved denial starts with "${beginning}"`);
        }

        return found;
      };

      const denying = theWordsOfTheQuestionsIn('en').filter((line) =>
        line.includes(denial('Emi is not a c')),
      );

      expect(denying).toHaveLength(1);

      for (const line of denying) {
        expect(line).toContain(denial('Emi is not a m'));
        // The gate reads a denial as a claim unless a full stop comes before it.
        expect(line.startsWith(denial('Emi is not a c'))).toBe(false);
      }
    });

    it('says no word a screen refuses, in any of the three languages', () => {
      for (const language of languages) {
        const claims = interfaceClaimsIn(
          `the first run in ${language}`,
          theWordsOfTheQuestionsIn(language).join('\n'),
        );

        expect(claims.map(describeClaim)).toEqual([]);
      }
    });
  });
});
