import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { Focus } from '@emi/crypto';
import { tabTestID } from '@emi/ui';
import { getLocales } from 'expo-localization';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { claimsHeading, prototypeReadme, sectionUnder } from '../../../../tools/pipeline/prototype';
import { readProfile } from '../../src/data/profileRepository';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import { dayTestID } from '../../src/features/onboarding/Calendar';
import { firstForecastActionTestID } from '../../src/features/onboarding/FirstForecast';
import { focusTestID } from '../../src/features/onboarding/Focus';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { firstRunCopy, focusNamesInASentence } from '../../src/features/onboarding/copy';
import { answerSaveTestID, answerScreenTestID } from '../../src/features/settings/AnswerScreen';
import { changeFocusTestID } from '../../src/features/settings/ChangeFocus';
import {
  settingsAnswersTestID,
  settingsScreenTestID,
} from '../../src/features/settings/SettingsScreen';
import {
  yourAnswerRowTestID,
  yourAnswersScreenTestID,
} from '../../src/features/settings/YourAnswers';
import { yourAnswersCopy } from '../../src/features/settings/copy';
import { type Language, languages } from '../../src/language/language';
import { english } from '../../src/language/english';
import { russian } from '../../src/language/russian';
import { spanish } from '../../src/language/spanish';
import { type Catalogue, wordKeys } from '../../src/language/words';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { everythingSheReadsOnTheFocus, theFocusScreenIn } from '../fixtures/theFocusScreen';
import { dayOf, herDatabase } from '../fixtures/herPhone';
import { theProfileVaultOnHerPhone } from '../fixtures/herVault';
import { textIn } from '../fixtures/renderedText';
import { sheReadsThePromise } from '../fixtures/theFirstRun';
import { sheHoldsTheRing } from '../fixtures/theHold';

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

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

/** A day inside the ninety the first run reaches back over, for the walk through the questions. */
const herPeriodStarted = dayOf(new Date('2026-05-09T12:00:00.000Z'));

/** The key the promise is drawn from, which the first run screen reads after the question. */
const theKeyOfThePromise = 'onboarding.focus.line.privacy';

/** The key the screen already drew, so a screen drawn empty cannot pass for this. */
const theKeyThatStayed = 'onboarding.focus.line.first';

/** What she is promised, in each language, written out rather than read off what it checks. */
const thePromise: Readonly<Record<Language, string>> = {
  en: 'You can change these in Privacy.',
  es: 'Puedes cambiarlo en Privacidad.',
  ru: 'Вы можете изменить это в разделе Приватность.',
};

/** The name of the screen the promise sends her to, which is the word the dock carries. */
const theWordForPrivacy: Readonly<Record<Language, string>> = {
  en: 'Privacy',
  es: 'Privacidad',
  ru: 'Приватность',
};

/** The word the promise used to name, which named a screen the dock stopped carrying. */
const theWordThatWent: Readonly<Record<Language, string>> = {
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

/** The column of the dock that opens Privacy, named by its route rather than counted to. */
const theColumnThatOpensPrivacy = 'settings/index';

/** The group she names at the first run, and the one she adds once she takes the promise up. */
const theGroupSheNamesFirst: Focus = 'sleep';
const theGroupSheAdds: Focus = 'energy';

/** Her groups afterwards. A group she presses goes on the end, because the order is the answer. */
const herGroupsAfterwards: readonly Focus[] = [theGroupSheNamesFirst, theGroupSheAdds];

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

/**
 * From the focus question to the home screen: she names one group, passes today by, reads the
 * forecast and the two screens after it, and holds the ring, which is where her answers are
 * written.
 */
async function sheFinishesTheFirstRun(): Promise<void> {
  await shePresses(focusTestID(theGroupSheNamesFirst));
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(firstForecastActionTestID);
  await sheReadsThePromise();
  await sheHoldsTheRing();
}

/** Her answers, opened with the key the keychain holds and a handle nothing on screen is using. */
async function herSealedFocus(): Promise<readonly Focus[] | undefined> {
  const held = readProfile(herDatabase(), await theProfileVaultOnHerPhone());

  if (held === undefined) {
    throw new Error('her phone holds no profile at all');
  }

  return held.focus;
}

describe('the focus screen promises Privacy and Privacy does it', () => {
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

  describe('the promise on the focus screen', () => {
    it('names Privacy on the screen she reaches in the first run, under the line that was always there', async () => {
      const app = await sheReachesTheFocus();

      expect(app.pathname()).toBe('/onboarding/focus');
      expect(screen.getByText(theLineThatStayed.en)).toBeTruthy();
      expect(screen.getByText(thePromise.en)).toBeTruthy();
      expect(everythingSheReadsOnTheFocus()).toContain(theWordForPrivacy.en);
      expect(firstRunCopy.focus.lines).toEqual([theLineThatStayed.en, thePromise.en]);
    });

    it.each([...languages])(
      'names Privacy on the screen a phone reading %s draws',
      async (language) => {
        await theFocusScreenIn(language);

        const read = everythingSheReadsOnTheFocus();

        expect(read).toContain(theLineThatStayed[language]);
        expect(read).toContain(thePromise[language]);
        expect(read).toContain(theWordForPrivacy[language]);
      },
    );

    it('names the screen the dock carries, and never the name that screen used to have', () => {
      for (const language of languages) {
        expect(theCatalogueOf[language][theKeyOfThePromise]).toBe(thePromise[language]);
        expect(thePromise[language]).toContain(theWordForPrivacy[language]);
        expect(thePromise[language]).not.toContain(theWordThatWent[language]);
        expect(theCatalogueOf[language][theKeyThatStayed]).toBe(theLineThatStayed[language]);
      }

      expect(wordKeys as readonly string[]).toContain(theKeyOfThePromise);
      expect(languages).toHaveLength(3);
    });
  });

  describe('the walk the promise sends her on', () => {
    it('reaches her focus through Privacy and her answers, and changes it', async () => {
      await sheReachesTheFocus();

      expect(screen.getByText(thePromise.en)).toBeTruthy();

      await sheFinishesTheFirstRun();

      expect(await herSealedFocus()).toEqual([theGroupSheNamesFirst]);

      await shePresses(tabTestID(theColumnThatOpensPrivacy));

      expect(screen.getByTestId(settingsScreenTestID)).toBeTruthy();

      await shePresses(settingsAnswersTestID);
      await shePresses(yourAnswerRowTestID('focus'));

      expect(screen.getByTestId(answerScreenTestID)).toBeTruthy();

      await shePresses(changeFocusTestID(theGroupSheAdds));
      await shePresses(answerSaveTestID);

      expect(screen.getByTestId(yourAnswersScreenTestID)).toBeTruthy();
      expect(textIn(screen.getByTestId(yourAnswerRowTestID('focus')))).toEqual([
        yourAnswersCopy.rows.focus,
        focusNamesInASentence(herGroupsAfterwards),
      ]);
      expect(await herSealedFocus()).toEqual(herGroupsAfterwards);
    });
  });

  describe('the claim the readme recorded while nothing could keep it', () => {
    const readme = readFileSync(join(repositoryRoot, prototypeReadme), 'utf8');

    it('is off the list of copy that is never built, which still holds the rest', () => {
      const recorded = sectionUnder(readme, claimsHeading);

      expect(readme).toContain(claimsHeading);
      expect(recorded).not.toContain('You can change these in');
      expect(recorded.length).toBeGreaterThan(2000);
    });
  });
});
