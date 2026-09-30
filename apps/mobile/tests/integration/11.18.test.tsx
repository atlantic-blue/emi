import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getLocales } from 'expo-localization';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

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
import { everythingSheReadsOnTheFocus, theFocusScreenIn } from '../fixtures/theFocusScreen';
import { dayOf, herDatabase } from '../fixtures/herPhone';

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

/** What the screen says first, written out rather than read off the catalogue it is checking. */
const theLineThatStayed: Readonly<Record<Language, string>> = {
  en: 'Emi puts these first when you log a day.',
  es: 'Emi pone esto primero cuando anotas un día.',
  ru: 'Emi ставит это первым, когда вы записываете день.',
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

describe('the focus screen promises nothing Settings cannot do', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    asAPhone.mockReturnValue([{ languageTag: 'en-GB' } as ReturnType<typeof getLocales>[number]]);
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
      expect(firstRunCopy.focus.lines).not.toContain(theLineThatWent.en);
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
});
