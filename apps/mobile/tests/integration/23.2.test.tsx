import { resolve } from 'node:path';

import { render, screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';

import {
  approvedDenials,
  describeClaim,
  searchableText,
} from '../../../../tools/pipeline/forbiddenClaims';
import { interfaceClaimsIn } from '../../../../tools/pipeline/interfaceClaims';
import { type Language, type Words, catalogueOf, languages, wordKeys } from '../../src/language';
import { Feeling, feelingReplyTestID, feelingTestID } from '../../src/features/onboarding/Feeling';
import {
  Regularity,
  regularityReplyTestID,
  regularityTestID,
} from '../../src/features/onboarding/Regularity';
import { Today } from '../../src/features/onboarding/Today';
import { YearOfBirth } from '../../src/features/onboarding/YearOfBirth';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
  onboardingTitleTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { nameFieldTestID } from '../../src/features/onboarding/HerName';
import { dayTestID } from '../../src/features/onboarding/Calendar';
import { yearTestID } from '../../src/components/YearWheel';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import type { Database } from '../../src/data/database';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { OnAPhone } from '../fixtures/theSafeArea';

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
  named: `${theNameSheGives}, how are you feeling today?`,
  plain: 'How are you feeling today?',
};

/** What each thing she can say about her cycle is answered with. */
const theRepliesAboutHerCycle = {
  regular: "Good to know. We'll still show a range, because even regular cycles move a little.",
  moves: "That's common. We'll start with a wider range and narrow it as we learn yours.",
  unknown: "That's fine. Your log will tell us soon enough.",
} as const;

/** What each thing she can say about how she feels is answered with. */
const theRepliesAboutHowSheFeels = {
  fine: "Then we'll keep things short.",
  hard: "We hear you. We'll show you when it's coming, so you can plan around it.",
  understand: "You're in the right place. The more you log, the more it makes sense.",
} as const;

/** The one line about who can read her answers, in each language she reads Emi in. */
const onlyYouCanReadThis: Readonly<Record<Language, string>> = {
  en: 'Only you can read this.',
  es: 'Solo tú puedes leer esto.',
  ru: 'Это можете прочитать только вы.',
};

const theKeyOfThatLine = 'onboarding.onlyYou';

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
  'Yes, pretty much',
  'No, it moves around',
  "I'm not sure yet",
];

const theAnswersAboutHowSheFeels: readonly string[] = [
  "I'm fine with it",
  "Honestly, it's hard most months",
  'I want to understand it better',
];

/** How each language writes the first person plural, which is how the questions name Emi now. */
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
  'lastPeriod',
  'periodBefore',
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

function formsOf(held: Words): string[] {
  return typeof held === 'string' ? [held] : Object.values(held);
}

function theCatalogueOf(language: Language): Readonly<Record<string, Words>> {
  return Object.fromEntries(Object.entries(catalogueOf(language)));
}

/** Every key of the twelve questions, and the one line the five that keep an answer all read. */
function theKeysOfTheQuestions(): string[] {
  return [
    ...wordKeys.filter((key) =>
      theScreensOfTheQuestions.some((asked) => key.startsWith(`onboarding.${asked}.`)),
    ),
    theKeyOfThatLine,
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
  await shePresses(dayTestID(herPeriodStarted));
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);

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
    it('greets her by the name she gave', async () => {
      const app = await sheWalksTo('birthYear', theNameSheGives);

      expect(app.getPathname()).toBe('/onboarding/year-of-birth');
      expect(theQuestionSheIsReading()).toBe(theQuestionAboutTheYear.named);
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
            name={undefined}
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

    it('carries both forms in all three languages, and only the greeting holds her name', () => {
      for (const language of languages) {
        const held = theCatalogueOf(language);

        expect({
          language,
          greets: String(held['onboarding.birthYear.titleNamed']).includes('{name}'),
        }).toEqual({ language, greets: true });
        expect(String(held['onboarding.birthYear.title'])).not.toContain('{name}');
      }

      expect(languages.length).toBe(3);
    });
  });

  describe('the last question of the first run', () => {
    it('asks how she feels today by the name she gave', async () => {
      await render(
        <OnAPhone>
          <Today
            chosen={[]}
            name={theNameSheGives}
            onBack={() => undefined}
            onPress={() => undefined}
            onSave={() => undefined}
            onSkip={() => undefined}
          />
        </OnAPhone>,
      );

      expect(theQuestionSheIsReading()).toBe(theLastQuestion.named);
    });

    it('asks it plainly of a woman who gave no name', async () => {
      await render(
        <OnAPhone>
          <Today
            chosen={[]}
            name={undefined}
            onBack={() => undefined}
            onPress={() => undefined}
            onSave={() => undefined}
            onSkip={() => undefined}
          />
        </OnAPhone>,
      );

      expect(theQuestionSheIsReading()).toBe(theLastQuestion.plain);
    });

    it('still carries the name she typed eleven questions earlier', async () => {
      const app = await sheWalksTo('today', theNameSheGives);

      expect(app.getPathname()).toBe('/onboarding/today');
      expect(theQuestionSheIsReading()).toBe(theLastQuestion.named);
    });
  });

  describe('the reply under the answers', () => {
    for (const [answer, reply] of Object.entries(theRepliesAboutHerCycle)) {
      it(`answers "${answer}" about her cycle, and says none of the other replies`, async () => {
        await render(
          <OnAPhone>
            <Regularity
              chosen={answer as keyof typeof theRepliesAboutHerCycle}
              onBack={() => undefined}
              onChoose={() => undefined}
              onContinue={() => undefined}
              onSkip={() => undefined}
            />
          </OnAPhone>,
        );

        expect(screen.getByTestId(regularityReplyTestID)).toHaveTextContent(reply);
        expect(
          Object.values(theRepliesAboutHerCycle).filter(
            (each) => screen.queryByText(each) !== null,
          ),
        ).toEqual([reply]);
      });
    }

    for (const [answer, reply] of Object.entries(theRepliesAboutHowSheFeels)) {
      it(`answers "${answer}" about how she feels, and says none of the other replies`, async () => {
        await render(
          <OnAPhone>
            <Feeling
              chosen={answer as keyof typeof theRepliesAboutHowSheFeels}
              onBack={() => undefined}
              onChoose={() => undefined}
              onContinue={() => undefined}
              onSkip={() => undefined}
            />
          </OnAPhone>,
        );

        expect(screen.getByTestId(feelingReplyTestID)).toHaveTextContent(reply);
        expect(
          Object.values(theRepliesAboutHowSheFeels).filter(
            (each) => screen.queryByText(each) !== null,
          ),
        ).toEqual([reply]);
      });
    }

    it('says nothing about her cycle until she picks, because a reply to nothing is Emi talking to itself', async () => {
      await render(
        <OnAPhone>
          <Regularity
            chosen={undefined}
            onBack={() => undefined}
            onChoose={() => undefined}
            onContinue={() => undefined}
            onSkip={() => undefined}
          />
        </OnAPhone>,
      );

      expect(screen.queryByTestId(regularityReplyTestID)).toBeNull();
    });

    it('says nothing about how she feels until she picks, for the same reason', async () => {
      await render(
        <OnAPhone>
          <Feeling
            chosen={undefined}
            onBack={() => undefined}
            onChoose={() => undefined}
            onContinue={() => undefined}
            onSkip={() => undefined}
          />
        </OnAPhone>,
      );

      expect(screen.queryByTestId(feelingReplyTestID)).toBeNull();
    });

    it('answers the answer she holds now, so changing her mind changes the reply', async () => {
      const app = await sheWalksTo('regularity');

      expect(app.getPathname()).toBe('/onboarding/regularity');

      await shePresses(regularityTestID('moves'));

      expect(screen.getByTestId(regularityReplyTestID)).toHaveTextContent(
        theRepliesAboutHerCycle.moves,
      );

      await shePresses(regularityTestID('regular'));

      expect(screen.getByTestId(regularityReplyTestID)).toHaveTextContent(
        theRepliesAboutHerCycle.regular,
      );
      expect(screen.queryByText(theRepliesAboutHerCycle.moves)).toBeNull();
      expect(screen.getByTestId(regularityTestID('moves'))).not.toBeChecked();
    });

    it('is written in every language, and never the English reply left behind', () => {
      const keys = [
        ...Object.keys(theRepliesAboutHerCycle).map(
          (answer) => `onboarding.regularity.reply.${answer}`,
        ),
        ...Object.keys(theRepliesAboutHowSheFeels).map(
          (answer) => `onboarding.feeling.reply.${answer}`,
        ),
      ];

      for (const key of keys) {
        const said = languages.map((language) => String(theCatalogueOf(language)[key]));

        expect({ key, missing: said.filter((each) => each === 'undefined') }).toEqual({
          key,
          missing: [],
        });
        expect({ key, theEnglishOneAgain: said[0] === said[1] || said[0] === said[2] }).toEqual({
          key,
          theEnglishOneAgain: false,
        });
      }

      expect(keys).toHaveLength(6);
    });
  });

  describe('the one line about who can read her answers', () => {
    it('is one line in each of the three languages', () => {
      for (const language of languages) {
        expect({ language, said: theCatalogueOf(language)[theKeyOfThatLine] }).toEqual({
          language,
          said: onlyYouCanReadThis[language],
        });
      }

      expect(languages.length).toBe(3);
    });

    it('took the place of the five lines that each said it in their own words', () => {
      for (const language of languages) {
        const keys = Object.keys(catalogueOf(language));

        expect({ language, left: theKeysThatWent.filter((key) => keys.includes(key)) }).toEqual({
          language,
          left: [],
        });
        expect(keys).toContain(theKeyOfThatLine);
      }

      expect(theKeysThatWent).toHaveLength(5);
    });

    it('is read on the question about her name, and on the question after it', async () => {
      await sheWalksTo('birthYear', theNameSheGives);

      expect(screen.getByText(onlyYouCanReadThis.en)).toBeTruthy();
    });

    it('is read on the question about how she feels', async () => {
      const app = await sheWalksTo('feeling');

      expect(app.getPathname()).toBe('/onboarding/feeling');
      expect(screen.getByText(onlyYouCanReadThis.en)).toBeTruthy();
    });

    it('says nothing about a cipher, a standard or a day that is safe', () => {
      for (const language of languages) {
        const claims = interfaceClaimsIn(`the line in ${language}`, onlyYouCanReadThis[language]);

        expect(claims.map(describeClaim)).toEqual([]);
      }
    });
  });

  describe('the voice the questions are written in', () => {
    it('carries one exclamation mark in the whole first run, which is the greeting', () => {
      for (const language of languages) {
        const keys = theKeysOfTheQuestions();
        const loud = keys.filter((key) =>
          theWordsOfTheQuestionsIn(language, [key]).some((line) => line.includes('!')),
        );

        expect({ language, loud }).toEqual({ language, loud: [theGreeting] });
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

    it('talks to her as you and about Emi as we, in each of the three languages', () => {
      for (const language of languages) {
        const keys = theKeysOfTheQuestions();
        const read = theWordsOfTheQuestionsIn(language).join('\n');

        // A denial names Emi on purpose, so the two of them come out before the rest is read.
        const naming = keys.filter((key) =>
          searchableText(theWordsOfTheQuestionsIn(language, [key]).join('\n')).includes('Emi'),
        );

        expect({ language, naming }).toEqual({ language, naming: [theGreeting] });
        expect({ language, asWe: howEachLanguageSaysWe[language].test(read) }).toEqual({
          language,
          asWe: true,
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
