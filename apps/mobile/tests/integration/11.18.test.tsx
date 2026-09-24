import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { getLocales } from 'expo-localization';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { render } from '@testing-library/react-native';
import * as TheReactTheApplicationShips from 'react';

import { claimsHeading, prototypeReadme, sectionUnder } from '../../../../tools/pipeline/prototype';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import { dayTestID } from '../../src/features/onboarding/Calendar';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { firstRunCopy } from '../../src/features/onboarding/copy';
import { english } from '../../src/language/english';
import { type Language, languages } from '../../src/language/language';
import { russian } from '../../src/language/russian';
import { spanish } from '../../src/language/spanish';
import { type Catalogue, wordKeys } from '../../src/language/words';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { dayOf, herDatabase } from '../fixtures/herPhone';
import { textIn } from '../fixtures/renderedText';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

/**
 * The words of a screen are read once, when its copy is loaded, so the language is the phone's
 * answer at that moment. Every module imported above holds the English words for that reason, and a
 * case that wants another language loads its own copy of the screen under another phone.
 */
jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageTag: 'en-GB' }]) }));

const asAPhone = getLocales as jest.MockedFunction<typeof getLocales>;

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');
const appDirectory = join(__dirname, '..', '..', 'src', 'app');
const languageDirectory = join(__dirname, '..', '..', 'src', 'language');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

/** A day inside the ninety the first run reaches back over, for the walk through the questions. */
const herPeriodStarted = dayOf(new Date('2026-05-09T12:00:00.000Z'));

/** The key the line was drawn from, which no catalogue holds any more. */
const theKeyThatWent = 'onboarding.focus.line.settings';

/** The key the screen still draws, so a screen drawn empty cannot pass for this. */
const theKeyThatStayed = 'onboarding.focus.line.first';

/**
 * What she is not promised any more, in each language, and the word each promise was made with. A
 * case reads the word as well as the sentence, so a reworded promise fails here too.
 */
const theLineThatWent: Readonly<Record<Language, string>> = {
  en: 'You can change these in Settings.',
  es: 'Puedes cambiarlo en Ajustes.',
  ru: 'Вы можете изменить это в настройках.',
};

const theWordForSettings: Readonly<Record<Language, string>> = {
  en: 'Settings',
  es: 'Ajustes',
  ru: 'настройк',
};

/** What the screen says instead, written out rather than read off the catalogue it is checking. */
const theLineThatStayed: Readonly<Record<Language, string>> = {
  en: 'Emi puts these first when you log a day.',
  es: 'Emi pone esto primero cuando anotas un día.',
  ru: 'Emi ставит это первым, когда вы записываете день.',
};

const thePhoneOf: Readonly<Record<Language, string>> = {
  en: 'en-GB',
  es: 'es-ES',
  ru: 'ru-RU',
};

const theCatalogueOf: Readonly<Record<Language, Catalogue>> = {
  en: english,
  es: spanish,
  ru: russian,
};

const theFileOf: Readonly<Record<Language, string>> = {
  en: 'english',
  es: 'spanish',
  ru: 'russian',
};

/** The screen the question is drawn on, so a case reads the focus and not the stack behind it. */
const theFocusScreen = 'onboarding-focus';

/** The four cards, already read, so the first thing she sees is the first question. */
function theTourIsBehindHer(): void {
  const database = herDatabase();

  migrate(database);
  writeSetting(database, 'tourSeenAt', whenSheOpensIt.toISOString());
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/** Past every question before the focus, standing on the one this step is about. */
async function sheReachesTheFocus(): Promise<{ pathname: () => string }> {
  const app = renderRouter(appDirectory, { initialUrl: '/' });

  await app;

  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(dayTestID(herPeriodStarted));
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);

  return { pathname: () => app.getPathname() };
}

interface FocusProps {
  readonly chosen: readonly never[];
  readonly onBack: () => void;
  readonly onContinue: () => void;
  readonly onPress: () => void;
  readonly onSkip: () => void;
}

/**
 * The focus screen as a woman whose phone reads one language is shown it, drawn from a second load
 * of the screen and of the copy under it.
 *
 * The React the application ships is handed to that load rather than left to resolve again. Two
 * copies of it in one render leave every hook reading a dispatcher nobody set, and the render dies
 * inside the first tile rather than saying which language it was drawing.
 */
async function theFocusScreenIn(language: Language): Promise<void> {
  asAPhone.mockReturnValue([
    { languageTag: thePhoneOf[language] } as ReturnType<typeof getLocales>[number],
  ]);

  let drawn: TheReactTheApplicationShips.ReactElement | undefined;

  jest.isolateModules(() => {
    jest.doMock('react', () => TheReactTheApplicationShips);

    const loaded = jest.requireActual('../../src/features/onboarding/Focus') as {
      Focus: TheReactTheApplicationShips.ComponentType<FocusProps>;
    };
    // The phone comes from the same load as the screen. A provider and the screen under it hold
    // the context of whichever copy of the library each was loaded from, and two copies share none.
    const phone = jest.requireActual('../fixtures/theSafeArea') as {
      OnAPhone: TheReactTheApplicationShips.ComponentType<{
        children: TheReactTheApplicationShips.ReactNode;
      }>;
    };

    drawn = TheReactTheApplicationShips.createElement(
      phone.OnAPhone,
      null,
      TheReactTheApplicationShips.createElement(loaded.Focus, {
        chosen: [],
        onBack: () => undefined,
        onContinue: () => undefined,
        onPress: () => undefined,
        onSkip: () => undefined,
      }),
    );
  });

  if (drawn === undefined) {
    throw new Error(`nothing drew the focus screen for a phone reading ${language}`);
  }

  await render(drawn);
}

/** Every word the focus screen puts in front of her, as one run of text to read a promise out of. */
function everythingSheReadsOnTheFocus(): string {
  return textIn(screen.getByTestId(theFocusScreen)).join(' ');
}

describe('the focus screen promises nothing Settings cannot do', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    asAPhone.mockReturnValue([
      { languageTag: thePhoneOf.en } as ReturnType<typeof getLocales>[number],
    ]);
    resetExpoSqlite();
    resetExpoSecureStore();
    theTourIsBehindHer();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the line that promised a way to change her groups', () => {
    it('is gone from the screen she reaches in the first run, which still says what her answer does', async () => {
      const app = await sheReachesTheFocus();

      expect(app.pathname()).toBe('/onboarding/focus');
      expect(screen.getByText(theLineThatStayed.en)).toBeTruthy();
      expect(screen.queryByText(theLineThatWent.en)).toBeNull();
      expect(everythingSheReadsOnTheFocus()).not.toContain(theWordForSettings.en);
      expect(firstRunCopy.focus.lines).toEqual([theLineThatStayed.en]);
    });

    it.each([...languages])(
      'is gone from the screen a phone reading %s draws',
      async (language) => {
        await theFocusScreenIn(language);

        const read = everythingSheReadsOnTheFocus();

        expect(read).toContain(theLineThatStayed[language]);
        expect(read).not.toContain(theLineThatWent[language]);
        expect(read).not.toContain(theWordForSettings[language]);
      },
    );

    it('is gone from all three catalogues, so no screen can draw it again', () => {
      for (const language of languages) {
        expect(Object.keys(theCatalogueOf[language])).not.toContain(theKeyThatWent);
        expect(Object.keys(theCatalogueOf[language])).toContain(theKeyThatStayed);
        expect(theCatalogueOf[language][theKeyThatStayed]).toBe(theLineThatStayed[language]);
      }

      expect(wordKeys as readonly string[]).not.toContain(theKeyThatWent);
      expect(languages).toHaveLength(3);
    });

    it('is in none of the three language files either, key or words', () => {
      for (const language of languages) {
        const file = readFileSync(join(languageDirectory, `${theFileOf[language]}.ts`), 'utf8');

        expect(file).toContain(theKeyThatStayed);
        expect(file).not.toContain(theKeyThatWent);
        expect(file).not.toContain(theLineThatWent[language]);
      }
    });
  });

  describe('the promise the export made on that screen', () => {
    const readme = readFileSync(join(repositoryRoot, prototypeReadme), 'utf8');

    it('is recorded with the copy that is never built while it is false', () => {
      const recorded = sectionUnder(readme, claimsHeading);

      expect(recorded).toContain(theLineThatWent.en);
      expect(recorded).toContain('focus');
      expect(recorded.length).toBeGreaterThan(2000);
    });

    it('is read from under that heading, so the same line written below it records nothing', () => {
      const belowIt = `${claimsHeading}\n\nNothing.\n\n## Later\n\n${theLineThatWent.en}\n`;

      expect(sectionUnder(belowIt, claimsHeading)).not.toContain(theLineThatWent.en);
      expect(readme).toContain(claimsHeading);
    });
  });
});
