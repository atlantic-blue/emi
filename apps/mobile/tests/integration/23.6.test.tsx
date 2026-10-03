import { join } from 'node:path';

import { recoveryCodeLength } from '@emi/crypto';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import {
  approvedDenials,
  describeClaim,
  searchableText,
} from '../../../../tools/pipeline/forbiddenClaims';
import { interfaceClaimsIn } from '../../../../tools/pipeline/interfaceClaims';
import { type Language, type Words, catalogueOf, languages } from '../../src/language';
import { FiguresScreen, figuresQuotedTestID } from '../../src/features/cycle/CitationRow';
import {
  ExportScreen,
  exportActionTestID,
  exportFailedTestID,
} from '../../src/features/export/ExportScreen';
import { LockScreen } from '../../src/features/lock/LockScreen';
import { RecoverySetup } from '../../src/features/recovery/RecoverySetup';
import { recoveryActionTestID } from '../../src/features/recovery/RecoveryScreen';
import {
  DeleteEverything,
  deleteActionTestID,
  deleteRefusedTestID,
  deletedScreenTestID,
  serverNotReachedTestID,
} from '../../src/features/settings/DeleteEverything';
import {
  settingsAnswersTestID,
  settingsDeleteTestID,
} from '../../src/features/settings/SettingsScreen';
import { answerHeldTestID } from '../../src/features/settings/AnswerScreen';
import {
  historyNoCyclesTestID,
  historyWaitingTestID,
} from '../../src/features/history/HistoryScreen';
import { expoKeychain } from '../../src/services/vault/keychain';
import { createVaultKey } from '../../src/services/vault/vaultKey';
import { makeRecovery } from '../../src/services/vault/wrapKey';
import { rowsHeld } from '../../src/services/vault/wipe';
import { publishedFigures } from '@emi/cycle';
import { resetExpoSqlite } from '../data/expoSqlite';
import { itemsInTheKeychain, resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { fixedRandom } from '../fixtures/secureStore';
import { aBleedingDay, dayOf, herDatabase, herPhoneHolds } from '../fixtures/herPhone';
import { textIn } from '../fixtures/renderedText';
import { OnAPhone } from '../fixtures/theSafeArea';

import type { DayRecord } from '@emi/crypto';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

/**
 * The five screens a woman reaches when she asks what Emi holds of hers: Insights, Privacy, the
 * export, the delete, the lock and the recovery code. They are written in the voice
 * `docs/design/voice.md` sets, which talks to her as you and about us as we.
 *
 * The delete screen is the one the whole privacy claim rests on, so it is driven to the end here:
 * pressed for real, through the route, with the words she is left with read off the glass.
 *
 * Every sentence is written out in this file rather than read off the catalogue it checks, because
 * a sentence read off the thing it is holding moves with it and catches nothing.
 */

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, well away from any change of the clocks, so her screens read the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

const sheSaidHerCycleRuns = 28;

/** What the two privacy rows say under their names. */
const thePrivacyRowsSay = {
  answers: 'What you told us when you started',
  delete: "One press, and it's gone for good",
};

/** What the delete screen says before she presses, and what she is left reading after. */
const theDeleteScreenSays = {
  before:
    "One press and it's gone. No undo, no waiting period. Nobody at Emi can bring it back, because nobody at Emi can read it.",
  title: "It's gone.",
  line: 'This phone holds nothing about you now. You can start fresh whenever you like.',
  refused:
    'Your days are gone, but your phone held on to one thing in the keychain. Press again to finish.',
  withoutTheServer:
    "We couldn't reach our server to remove your account. Nothing can open what's left there: the only key was on this phone, and it went with your days.",
};

/** What the insights screen says while it has nothing of hers to show. */
const theInsightsScreenSays = {
  noCycles: 'No cycles yet. Log a day you bled and this fills in.',
  nothingRepeats: "Nothing has come back in 3 cycles yet. Keep logging and we'll show you.",
  patternsNeed: "We'll point out a symptom once it's come back in 3 cycles.",
  quoted: "Each figure is quoted in the paper's own words, so you can check it for yourself.",
};

/** What the export screen says about the two files, before and after it fails to write them. */
const theExportScreenSays = {
  what: 'Two files: one you can read or give to your doctor, and one another app can open.',
  where:
    'Nothing is sent anywhere. The files are made on this phone, and you decide who gets them.',
  failed: "We couldn't save the files. Your phone may be out of space.",
};

const theLockSays = {
  title: 'Emi is locked.',
  line: 'Use your face, your fingerprint or your passcode to open it.',
  refused: 'Still locked. Tap Unlock to try again.',
};

/** What the three recovery screens say, in the order she walks through them. */
const theRecoveryScreensSay = {
  onlyWay:
    "Next, you'll see a recovery code. It's the only way to get your cycles back if you lose this phone.",
  nobody: "We can't recover it for you. If we could, we could read your days.",
  paper: 'Write it on paper and keep it with your other important papers.',
  once: `${recoveryCodeLength} characters. You'll only see them once, and we don't keep a copy.`,
  writeDown: "Write them down now. Next, you'll type them back.",
  written: "I've written it down",
  confirmTitle: 'Type your code back',
  checks: "Just to check you've got it right.",
  letterCase: "Capitals and spaces don't matter.",
  wrong: "That doesn't match. Check your paper and try again.",
};

/** Every key this step rewrites, with the English it holds, so the catalogue is read whole. */
const theWordsUnderTheirKeys: Readonly<Record<string, string>> = {
  'cycle.figures.quoted': theInsightsScreenSays.quoted,
  'export.failed': theExportScreenSays.failed,
  'export.what': theExportScreenSays.what,
  'export.where': theExportScreenSays.where,
  'history.noCycles': theInsightsScreenSays.noCycles,
  'history.nothingRepeats': theInsightsScreenSays.nothingRepeats,
  'history.patternsNeed': "We'll point out a symptom once it's come back in {needs} cycles.",
  'lock.locked.line': theLockSays.line,
  'lock.locked.refused': theLockSays.refused,
  'lock.locked.title': theLockSays.title,
  'recovery.before.line.nobody': theRecoveryScreensSay.nobody,
  'recovery.before.line.onlyWay': theRecoveryScreensSay.onlyWay,
  'recovery.before.line.paper': theRecoveryScreensSay.paper,
  'recovery.code.action': theRecoveryScreensSay.written,
  'recovery.code.line.once':
    "{count} characters. You'll only see them once, and we don't keep a copy.",
  'recovery.code.line.writeDown': theRecoveryScreensSay.writeDown,
  'recovery.confirm.line.case': theRecoveryScreensSay.letterCase,
  'recovery.confirm.line.checks': theRecoveryScreensSay.checks,
  'recovery.confirm.title': theRecoveryScreensSay.confirmTitle,
  'recovery.confirm.wrong': theRecoveryScreensSay.wrong,
  'settings.answer.gaveAtFirstRun': 'You told us {answer} when you started.',
  'settings.delete.line': theDeleteScreenSays.before,
  'settings.delete.refused': theDeleteScreenSays.refused,
  'settings.deleted.line': theDeleteScreenSays.line,
  'settings.deleted.title': theDeleteScreenSays.title,
  'settings.deleted.withoutTheServer': theDeleteScreenSays.withoutTheServer,
  'settings.settings.answersLine': thePrivacyRowsSay.answers,
  'settings.settings.deleteLine': thePrivacyRowsSay.delete,
};

const theKeysOfTheseScreens: readonly string[] = Object.keys(theWordsUnderTheirKeys);

/**
 * The two lines of these screens that name Emi on purpose. The delete screen says who cannot bring
 * her days back, which is the claim itself, and the lock names the application it is holding shut.
 */
const theTwoLinesThatNameEmi: readonly string[] = ['settings.delete.line', 'lock.locked.title'];

/** How each language writes the second person, which is who these screens are talking to. */
const howEachLanguageSaysYou: Readonly<Record<Language, RegExp>> = {
  en: /(?<!\p{Letter})(you|your)(?!\p{Letter})/iu,
  es: /(?<!\p{Letter})(tu|tus|tú|te|ti)(?!\p{Letter})/iu,
  ru: /(?<!\p{Letter})(вы|ваш|ваши|вас|вам)/iu,
};

/** How each language writes the first person plural, which is how these screens name Emi now. */
const howEachLanguageSaysWe: Readonly<Record<Language, RegExp>> = {
  en: /(?<!\p{Letter})(we|our)(?!\p{Letter})/iu,
  es: /(?<!\p{Letter})(nos|nuestro|nuestra)(?!\p{Letter})|mos(?!\p{Letter})/iu,
  ru: /(?<!\p{Letter})(мы|наш)/iu,
};

function formsOf(held: Words): string[] {
  return typeof held === 'string' ? [held] : Object.values(held);
}

/** One language's catalogue, read by key rather than by type, so a new key needs no cast. */
function theCatalogueOf(language: Language): Readonly<Record<string, Words>> {
  return Object.fromEntries(Object.entries(catalogueOf(language)));
}

function theWordsOfTheseScreensIn(
  language: Language,
  keys: readonly string[] = theKeysOfTheseScreens,
): string[] {
  const catalogue = theCatalogueOf(language);

  return keys.flatMap((key) => formsOf(catalogue[key] ?? ''));
}

function whatItSays(testID: string): string {
  return textIn(screen.getByTestId(testID)).join(' ');
}

async function sheOpens(at: string): Promise<void> {
  const app = renderRouter(appDirectory, { initialUrl: at });

  await app;
}

async function shePresses(testID: string): Promise<void> {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
    await Promise.resolve();
  });
}

/** Six cycles of her own, so the phone she deletes is a phone with something on it. */
function herSixCyclesAndThisOne(): DayRecord[] {
  const thisCycleStarted = dayOf(new Date(whenSheOpensIt.getTime() - 13 * 86400000));
  const records: DayRecord[] = [];

  for (let back = 6; back >= 0; back -= 1) {
    const started = new Date(Date.parse(`${thisCycleStarted}T12:00:00.000Z`));
    started.setUTCDate(started.getUTCDate() - back * sheSaidHerCycleRuns);

    for (let day = 0; day < 4; day += 1) {
      const bleeding = new Date(started);
      bleeding.setUTCDate(bleeding.getUTCDate() + day);
      records.push(aBleedingDay(bleeding.toISOString().slice(0, 10)));
    }
  }

  return records;
}

/** Her phone the moment it made a recovery code, which is the only one she is ever shown. */
async function herPhoneWithARecoveryCode() {
  resetExpoSecureStore();
  const store = expoKeychain();
  const vaultKey = await createVaultKey(store, fixedRandom(11));

  return { store, recovery: makeRecovery(vaultKey, fixedRandom(29)) };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(whenSheOpensIt);
  resetExpoSqlite();
  resetExpoSecureStore();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('delete everything tells her it is gone in plain words', () => {
  describe('the privacy screen she opens', () => {
    beforeEach(async () => {
      await herPhoneHolds(whenSheOpensIt, herSixCyclesAndThisOne(), sheSaidHerCycleRuns);
    });

    it('says the answers are what she told us, rather than counting them for her', async () => {
      await sheOpens('/settings');

      expect(whatItSays(settingsAnswersTestID)).toContain(thePrivacyRowsSay.answers);
    });

    it('says one press and it is gone for good, under the row that deletes everything', async () => {
      await sheOpens('/settings');

      expect(whatItSays(settingsDeleteTestID)).toContain(thePrivacyRowsSay.delete);
    });

    it('reads her own answer back to her as something she told us', async () => {
      await sheOpens('/settings/answers/cycle-length');

      expect(whatItSays(answerHeldTestID)).toBe(
        `You told us ${sheSaidHerCycleRuns} days when you started.`,
      );
    });
  });

  describe('the screen she presses delete on', () => {
    beforeEach(async () => {
      await herPhoneHolds(whenSheOpensIt, herSixCyclesAndThisOne(), sheSaidHerCycleRuns);
      await sheOpens('/settings/delete');
    });

    it('says what one press costs before she presses it, with no cooling off period offered', () => {
      expect(screen.getByText(theDeleteScreenSays.before)).toBeTruthy();
    });

    it('leaves her reading that it is gone, and that she can start fresh whenever she likes', async () => {
      await shePresses(deleteActionTestID);

      expect(whatItSays(deletedScreenTestID)).toContain(theDeleteScreenSays.title);
      expect(whatItSays(deletedScreenTestID)).toContain(theDeleteScreenSays.line);
    });

    it('tells her that on a phone it has emptied, so the words and her data agree', async () => {
      await shePresses(deleteActionTestID);

      expect(rowsHeld(herDatabase())).toBe(0);
      expect(itemsInTheKeychain()).toEqual({});
    });

    it('says nothing about an empty ring, which was about Emi and not about her', async () => {
      await shePresses(deleteActionTestID);

      expect(whatItSays(deletedScreenTestID)).not.toContain('empty ring');
    });
  });

  describe('the two deletes that did not finish cleanly', () => {
    it('tells her the keychain held one thing, and what pressing again does about it', () => {
      render(
        <OnAPhone>
          <DeleteEverything
            onBack={() => undefined}
            onDelete={() => undefined}
            onStartAgain={() => undefined}
            stage="refused"
          />
        </OnAPhone>,
      );

      expect(whatItSays(deleteRefusedTestID)).toBe(theDeleteScreenSays.refused);
    });

    it('tells her our server was not reached, and that the key went with her days', () => {
      render(
        <OnAPhone>
          <DeleteEverything
            onBack={() => undefined}
            onDelete={() => undefined}
            onStartAgain={() => undefined}
            stage="deleted-without-the-server"
          />
        </OnAPhone>,
      );

      expect(whatItSays(serverNotReachedTestID)).toBe(theDeleteScreenSays.withoutTheServer);
    });
  });

  describe('the insights screen with nothing of hers to show yet', () => {
    it('says there are no cycles yet, and what one press of hers would fill in', async () => {
      await herPhoneHolds(whenSheOpensIt, [], sheSaidHerCycleRuns);
      await sheOpens('/history');

      expect(whatItSays(historyNoCyclesTestID)).toBe(theInsightsScreenSays.noCycles);
    });

    it('says we will point out a symptom once it has come back, and names the count', async () => {
      await herPhoneHolds(whenSheOpensIt, [], sheSaidHerCycleRuns);
      await sheOpens('/history');

      expect(whatItSays(historyWaitingTestID)).toContain(theInsightsScreenSays.patternsNeed);
    });

    it('tells her to keep logging where three of her cycles held nothing in common', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixCyclesAndThisOne(), sheSaidHerCycleRuns);
      await sheOpens('/history');

      expect(whatItSays(historyWaitingTestID)).toBe(theInsightsScreenSays.nothingRepeats);
    });

    it('says a figure is quoted in the paper own words, so she can check it herself', () => {
      render(
        <OnAPhone>
          <FiguresScreen figures={publishedFigures} onBack={() => undefined} />
        </OnAPhone>,
      );

      expect(whatItSays(figuresQuotedTestID)).toBe(theInsightsScreenSays.quoted);
    });
  });

  describe('the export screen', () => {
    it('says what the two files are, in terms of who she can hand each one to', () => {
      render(
        <OnAPhone>
          <ExportScreen
            canShare
            onBack={() => undefined}
            onExport={() => Promise.reject(new Error('no room'))}
            onShare={() => Promise.resolve()}
          />
        </OnAPhone>,
      );

      expect(screen.getByText(theExportScreenSays.what)).toBeTruthy();
      expect(screen.getByText(theExportScreenSays.where)).toBeTruthy();
    });

    it('says we could not save them, and names the phone as the likely reason', async () => {
      render(
        <OnAPhone>
          <ExportScreen
            canShare
            onBack={() => undefined}
            onExport={() => Promise.reject(new Error('no room'))}
            onShare={() => Promise.resolve()}
          />
        </OnAPhone>,
      );

      await shePresses(exportActionTestID);

      expect(whatItSays(exportFailedTestID)).toBe(theExportScreenSays.failed);
    });
  });

  describe('the lock she comes back to', () => {
    it('tells her what to use to open it, rather than naming the act of unlocking', () => {
      render(
        <OnAPhone>
          <LockScreen onUnlock={() => undefined} wasRefused={false} />
        </OnAPhone>,
      );

      expect(screen.getByText(theLockSays.title)).toBeTruthy();
      expect(screen.getByText(theLockSays.line)).toBeTruthy();
    });

    it('says it is still locked once she has cancelled the prompt, in four words', () => {
      render(
        <OnAPhone>
          <LockScreen onUnlock={() => undefined} wasRefused />
        </OnAPhone>,
      );

      expect(screen.getByText(theLockSays.refused)).toBeTruthy();
    });
  });

  describe('the recovery code, before and after she sees it', () => {
    it('says we cannot recover it, and why that is the same as not reading her days', async () => {
      const { store, recovery } = await herPhoneWithARecoveryCode();

      render(
        <OnAPhone>
          <RecoverySetup
            now={() => whenSheOpensIt}
            onDone={() => undefined}
            recovery={recovery}
            store={store}
          />
        </OnAPhone>,
      );

      expect(screen.getByText(theRecoveryScreensSay.onlyWay)).toBeTruthy();
      expect(screen.getByText(theRecoveryScreensSay.nobody)).toBeTruthy();
      expect(screen.getByText(theRecoveryScreensSay.paper)).toBeTruthy();
    });

    it('says she will see the characters once, and that we keep no copy', async () => {
      const { store, recovery } = await herPhoneWithARecoveryCode();

      render(
        <OnAPhone>
          <RecoverySetup
            now={() => whenSheOpensIt}
            onDone={() => undefined}
            recovery={recovery}
            store={store}
          />
        </OnAPhone>,
      );
      await shePresses(recoveryActionTestID);

      expect(screen.getByText(theRecoveryScreensSay.once)).toBeTruthy();
      expect(screen.getByText(theRecoveryScreensSay.writeDown)).toBeTruthy();
      expect(screen.getByText(theRecoveryScreensSay.written)).toBeTruthy();
    });

    it('asks her to type her code back, and says the capitals and the spaces do not matter', async () => {
      const { store, recovery } = await herPhoneWithARecoveryCode();

      render(
        <OnAPhone>
          <RecoverySetup
            now={() => whenSheOpensIt}
            onDone={() => undefined}
            recovery={recovery}
            store={store}
          />
        </OnAPhone>,
      );
      await shePresses(recoveryActionTestID);
      await shePresses(recoveryActionTestID);

      expect(screen.getByText(theRecoveryScreensSay.confirmTitle)).toBeTruthy();
      expect(screen.getByText(theRecoveryScreensSay.checks)).toBeTruthy();
      expect(screen.getByText(theRecoveryScreensSay.letterCase)).toBeTruthy();
    });
  });

  describe('the words of these screens, in each of the three languages', () => {
    it('are the English the voice asks for, under the key that holds each one', () => {
      for (const [key, said] of Object.entries(theWordsUnderTheirKeys)) {
        expect({ key, said: theCatalogueOf('en')[key] }).toEqual({ key, said });
      }

      expect(theKeysOfTheseScreens.length).toBeGreaterThan(25);
    });

    it('are said in every language, and never left empty by accident', () => {
      for (const language of languages) {
        const missing = theKeysOfTheseScreens.filter(
          (key) => theWordsOfTheseScreensIn(language, [key]).join('').length === 0,
        );

        expect({ language, missing }).toEqual({ language, missing: [] });
      }

      expect(languages.length).toBe(3);
    });

    it('talk to her as you, and about us as we, in each language', () => {
      for (const language of languages) {
        const read = theWordsOfTheseScreensIn(language).join('\n');

        expect({
          language,
          asWe: howEachLanguageSaysWe[language].test(read),
          asYou: howEachLanguageSaysYou[language].test(read),
        }).toEqual({ language, asWe: true, asYou: true });
      }
    });

    it('name Emi on two lines only, the claim about her days and the lock itself', () => {
      for (const language of languages) {
        const naming = theKeysOfTheseScreens.filter((key) =>
          searchableText(theWordsOfTheseScreensIn(language, [key]).join('\n')).includes('Emi'),
        );

        expect({ language, naming: naming.sort() }).toEqual({
          language,
          naming: [...theTwoLinesThatNameEmi].sort(),
        });
      }
    });

    it('are her own language, and never the English words left behind', () => {
      const english = theWordsOfTheseScreensIn('en');

      for (const language of languages.filter((each) => each !== 'en')) {
        const said = theWordsOfTheseScreensIn(language);
        const same = said.filter((line) => english.includes(line) && !/^Emi/.test(line));

        expect({ language, same }).toEqual({ language, same: [] });
        expect(said).toHaveLength(english.length);
      }
    });

    it('say no word a screen refuses, in any of the three languages', () => {
      for (const language of languages) {
        const claims = interfaceClaimsIn(
          `the privacy screens in ${language}`,
          theWordsOfTheseScreensIn(language).join('\n'),
        );

        expect(claims.map(describeClaim)).toEqual([]);
      }

      expect(approvedDenials.length).toBeGreaterThan(0);
    });
  });
});
