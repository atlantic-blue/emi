import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { sheGivesAPeriod } from '../fixtures/thePastPeriods';

import type { Focus } from '@emi/crypto';
import { focusValues } from '@emi/crypto';
import { render, screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';

import { listCycles } from '../../src/data/cycleRepository';
import { listDayLogs } from '../../src/data/dayLogRepository';
import { readProfile } from '../../src/data/profileRepository';
import { migrate } from '../../src/data/schema';
import { readSetting, writeSetting } from '../../src/data/settingRepository';
import { wordKeys, words } from '../../src/language';
import { firstForecastActionTestID } from '../../src/features/onboarding/FirstForecast';
import { focusTestID } from '../../src/features/onboarding/Focus';
import {
  onboardingActionTestID,
  onboardingProgressTestID,
  onboardingSkipTestID,
  onboardingWayPastTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import {
  WhatEmiDoesWithIt,
  whatEmiDoesActionTestID,
  whatEmiDoesCardTestID,
  whatEmiDoesChipTestID,
  whatEmiDoesLabelInks,
  whatEmiDoesLogLineTestID,
  whatEmiDoesRangeTestID,
  whatEmiDoesTestID,
  whatEmiDoesTitleTestID,
} from '../../src/features/onboarding/WhatEmiDoesWithIt';
import {
  whatComesFirstWhenSheLogs,
  whatEmiDoesCards,
  whatEmiDoesCopy,
} from '../../src/features/onboarding/copy';
import {
  interfaceClaimsIn,
  scannedInterfaceFiles,
} from '../../../../tools/pipeline/interfaceClaims';
import { describeClaim, interfaceOnlyWording } from '../../../../tools/pipeline/forbiddenClaims';
import { falseClaimsOfTheCopyReview } from '../../../../tools/pipeline/prototype';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { herDatabase } from '../fixtures/herPhone';
import { herProfileVault, theProfileVaultOnHerPhone } from '../fixtures/herVault';
import { textIn } from '../fixtures/renderedText';
import { OnAPhone } from '../fixtures/theSafeArea';
import { sheHoldsTheRing } from '../fixtures/theHold';
import { cycleLengthDaysTestID } from '../../src/features/onboarding/CycleLength';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');
const repositoryRoot = join(__dirname, '..', '..', '..', '..');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

/** A day inside the ninety the first run reaches back over, and not today. */
const herPeriodStarted = '2026-05-09';

/** The screen this step adds, which the wording gate reads with the rest of the interface. */
const theScreens = [
  join('apps', 'mobile', 'src', 'features', 'onboarding', 'WhatEmiDoesWithIt.tsx'),
];

/**
 * The words the copy review refuses outright, written as the review's own rule writes them. The
 * rule is prose and this is the list, so the case below holds the two against each other.
 */
const theWordsTheReviewRefuses = [
  'AES',
  'enclave',
  'hardware key',
  'audited',
  'zero knowledge',
  'zero cloud',
];

async function sheOpensEmi(): Promise<{ pathname: () => string }> {
  const app = renderRouter(appDirectory, { initialUrl: '/' });

  await app;

  return { pathname: () => app.getPathname() };
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/** The four cards, already read, so the first thing she sees is the first question. */
function theTourIsBehindHer(): void {
  const database = herDatabase();

  migrate(database);
  writeSetting(database, 'tourSeenAt', whenSheOpensIt.toISOString());
}

/**
 * Standing on what Emi does with it: every question answered or passed by, and the forecast read.
 * The groups are pressed on the focus screen where she is given any, because the screen reads them
 * back to her.
 */
async function sheReachesWhatEmiDoes(focus: readonly Focus[] = []): Promise<void> {
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await sheGivesAPeriod(0, herPeriodStarted);
  await shePresses(onboardingActionTestID);
  await shePresses(cycleLengthDaysTestID(28));
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingWayPastTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);

  if (focus.length === 0) {
    await shePresses(onboardingSkipTestID);
  } else {
    for (const group of focus) {
      await shePresses(focusTestID(group));
    }

    await shePresses(onboardingActionTestID);
  }

  await shePresses(onboardingSkipTestID);
  // The reminder stands after the last question, and "Not now" passes it.
  await shePresses(onboardingSkipTestID);
  await shePresses(firstForecastActionTestID);
}

/** Every word the screen puts on the glass, and only that screen's words. */
function theWordsOf(testID: string): string {
  return textIn(screen.getByTestId(testID)).join(' ');
}

/** What the log section reads, which is the one section built from an answer she gave. */
function theLogCard(): string[] {
  return textIn(screen.getByTestId(whatEmiDoesCardTestID('log')));
}

/** The sentence under her chips. */
function theLogLine(): string {
  return textIn(screen.getByTestId(whatEmiDoesLogLineTestID)).join(' ');
}

/** The file as it stands, with the cipher written into the first line of it. */
function withTheCipherIn(file: string): string {
  return `const said = 'AES';\n${readFileSync(join(repositoryRoot, file), 'utf8')}`;
}

describe('what Emi does with what she said, after the forecast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
    theTourIsBehindHer();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the promise step, which the page about who can see her records replaced', () => {
    it('is not where the forecast hands her: she goes straight to what Emi does with it', async () => {
      const app = await sheOpensEmi();

      await sheReachesWhatEmiDoes();

      expect(app.pathname()).toBe('/onboarding/what-emi-does-with-it');
      expect(screen.getByTestId(whatEmiDoesTestID)).toBeTruthy();
      expect(screen.queryByText('Only you can read your days.')).toBeNull();
    });

    it('has no route any more, and no file under the first run draws it', () => {
      const routes = readdirSync(join(appDirectory, 'onboarding'));
      const screens = readdirSync(join(__dirname, '..', '..', 'src', 'features', 'onboarding'));

      expect(routes).not.toContain('the-promise.tsx');
      expect(screens).not.toContain('ThePromise.tsx');
    });

    it('has no words left in any of the three languages', () => {
      expect(wordKeys.filter((key) => key.startsWith('onboarding.promise.'))).toEqual([]);
    });

    it('sends an old link to it to the first run, where she has not finished the first run', async () => {
      const app = renderRouter(appDirectory, { initialUrl: '/onboarding/the-promise' });

      await app;

      expect(app.getPathname()).toBe('/onboarding/welcome');
      expect(screen.queryByText('Only you can read your days.')).toBeNull();
    });

    it('sends an old link to it home, where she finished the first run', async () => {
      await sheOpensEmi();
      await sheReachesWhatEmiDoes();
      await shePresses(whatEmiDoesActionTestID);
      await sheHoldsTheRing();
      await screen.unmount();

      const app = renderRouter(appDirectory, { initialUrl: '/onboarding/the-promise' });

      await app;

      expect(app.getPathname()).toBe('/');
      expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBeDefined();
    });
  });

  describe('what Emi does with what she said', () => {
    it('reads her answers back as three labelled sections, in the redesign words', async () => {
      await sheOpensEmi();

      await sheReachesWhatEmiDoes();

      expect(whatEmiDoesCards).toEqual(['forecast', 'log', 'privacy']);
      expect(textIn(screen.getByTestId(whatEmiDoesTitleTestID))).toEqual(['Your settings in Emi']);
      expect(textIn(screen.getByTestId(whatEmiDoesCardTestID('forecast')))).toEqual([
        'Your forecast',
        'Estimated start dates of your period, from your records',
      ]);
      expect(textIn(screen.getByTestId(whatEmiDoesCardTestID('privacy')))).toEqual([
        'Your privacy',
        'Only you can read any of it',
      ]);
    });

    it('draws the forecast as a range rather than as one day', async () => {
      await sheOpensEmi();

      await sheReachesWhatEmiDoes();

      expect(
        screen.getByTestId(whatEmiDoesRangeTestID, { includeHiddenElements: true }),
      ).toBeTruthy();
    });

    it('draws a chip for each group she pressed, in the order she pressed them', async () => {
      await sheOpensEmi();

      await sheReachesWhatEmiDoes(['mood', 'energy']);

      expect(theLogCard()).toEqual([
        'Your log',
        'What you see first',
        'Mood',
        'Energy',
        'Your log shows the groups you chose first: mood and energy.',
      ]);
    });

    it('names them the other way round where she pressed them the other way round', async () => {
      await sheOpensEmi();

      await sheReachesWhatEmiDoes(['energy', 'mood']);

      expect(theLogLine()).toBe('Your log shows the groups you chose first: energy and mood.');
      expect(theLogCard().slice(2, 4)).toEqual(['Energy', 'Mood']);
    });

    it('names one group on its own, and says group rather than groups', async () => {
      await sheOpensEmi();

      await sheReachesWhatEmiDoes(['sleep']);

      expect(theLogLine()).toBe('Your log shows the group you chose first: sleep.');
    });

    it('names all six where she pressed all six', async () => {
      await sheOpensEmi();

      await sheReachesWhatEmiDoes(focusValues);

      for (const group of focusValues) {
        expect(screen.getByTestId(whatEmiDoesChipTestID(group))).toBeTruthy();
      }
      expect(theLogLine()).toBe(
        'Your log shows the groups you chose first: sleep, mood, energy, skin and hair, digestion and pain.',
      );
    });

    it('shows the groups the log opens with for everybody where she pressed none, with no gap', async () => {
      await sheOpensEmi();

      await sheReachesWhatEmiDoes();

      expect(theLogCard()).toEqual([
        'Your log',
        'What you see first',
        'Mood',
        'Energy',
        'Pain',
        'Your log opens in the usual order, starting with mood, energy and pain.',
      ]);
      expect(theLogLine()).not.toMatch(/you chose/);
    });

    it('names no group she did not press, where she pressed some', async () => {
      await sheOpensEmi();

      await sheReachesWhatEmiDoes(['sleep']);

      expect(screen.queryByTestId(whatEmiDoesChipTestID('mood'))).toBeNull();
      expect(screen.queryByTestId(whatEmiDoesChipTestID('pain'))).toBeNull();
    });

    it('labels every section in an ink of its own, and every section carries one', () => {
      expect(Object.keys(whatEmiDoesLabelInks).sort()).toEqual([...whatEmiDoesCards].sort());
    });

    it('no longer greets her by name, because the redesign title names Emi and not her', async () => {
      await sheOpensEmi();

      await sheReachesWhatEmiDoes();

      expect(theWordsOf(whatEmiDoesTestID)).not.toMatch(/we'll|your answers/i);
    });

    it('names no slot, no cipher and no store that is ready', async () => {
      await sheOpensEmi();

      await sheReachesWhatEmiDoes(['mood']);
      const said = theWordsOf(whatEmiDoesTestID);

      expect(said).not.toMatch(/slot/i);
      expect(said).not.toMatch(/\bAES\b/i);
      expect(said).not.toMatch(/repository/i);
      expect(said).not.toMatch(/model/i);
    });

    it('hands her to the hold when she presses Continue', async () => {
      const app = await sheOpensEmi();

      await sheReachesWhatEmiDoes();

      expect(screen.getByTestId(whatEmiDoesActionTestID)).toHaveTextContent(
        words('onboarding.whatEmiDoes.action'),
      );

      await shePresses(whatEmiDoesActionTestID);

      expect(app.pathname()).toBe('/onboarding/hold');
    });

    it('leaves her answers where they were, so the hold still writes them', async () => {
      await sheOpensEmi();

      await sheReachesWhatEmiDoes(['mood', 'energy']);
      await shePresses(whatEmiDoesActionTestID);
      await sheHoldsTheRing();

      expect(readProfile(herDatabase(), await theProfileVaultOnHerPhone())?.focus).toEqual([
        'mood',
        'energy',
      ]);
      expect(listDayLogs(herDatabase())).toHaveLength(1);
    });
  });

  describe('the one screen, standing between the forecast and the hold', () => {
    it('writes nothing at all while she reads it', async () => {
      await sheOpensEmi();

      await sheReachesWhatEmiDoes(['mood']);

      expect(listDayLogs(herDatabase())).toEqual([]);
      expect(listCycles(herDatabase())).toEqual([]);
      expect(readProfile(herDatabase(), herProfileVault())).toBeUndefined();
      expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBeUndefined();
    });

    it('asks her nothing, so it draws no bar the questions draw', async () => {
      await sheOpensEmi();

      await sheReachesWhatEmiDoes();

      expect(screen.queryByTestId(onboardingProgressTestID)).toBeNull();
      expect(theWordsOf(whatEmiDoesTestID)).not.toMatch(/\d+ of \d+/);
    });

    it('offers her one way on, and nothing to skip', async () => {
      await sheOpensEmi();

      await sheReachesWhatEmiDoes();

      expect(screen.queryByTestId(onboardingSkipTestID)).toBeNull();
    });

    it('stands in the order the first run walks: forecast, what Emi does, hold', async () => {
      const app = await sheOpensEmi();
      const visited: string[] = [];

      await sheReachesWhatEmiDoes();
      visited.push(app.pathname());
      await shePresses(whatEmiDoesActionTestID);
      visited.push(app.pathname());

      expect(visited).toEqual(['/onboarding/what-emi-does-with-it', '/onboarding/hold']);
    });
  });

  describe('the words the copy review refuses', () => {
    const scanned = scannedInterfaceFiles(repositoryRoot);

    it('are read on the screen, because the scan holds every file the application draws', () => {
      for (const file of theScreens) {
        expect(scanned).toContain(file);
        expect(interfaceClaimsIn(file, readFileSync(join(repositoryRoot, file), 'utf8'))).toEqual(
          [],
        );
      }
      expect(theScreens).toHaveLength(1);
    });

    it('name the file and the words where the cipher is written into the screen', () => {
      for (const file of theScreens) {
        const [described] = interfaceClaimsIn(file, withTheCipherIn(file)).map(describeClaim);

        expect(described).toContain(file);
        expect(described).toContain('aes');
      }
    });

    it('are every word the review names, so the document and the gate say the same thing', () => {
      const theRule = falseClaimsOfTheCopyReview.find((claim) => claim.startsWith('Never write'));

      expect(theRule).toBeDefined();

      for (const word of theWordsTheReviewRefuses) {
        expect(theRule).toContain(word);
        expect(interfaceOnlyWording).toContain(word.toLowerCase());
        expect(
          interfaceClaimsIn(theScreens[0] as string, `const said = '${word}';\n`),
        ).toHaveLength(1);
      }
    });
  });

  describe('each screen on its own', () => {
    it('presses Continue under her thumb and nothing else, on what Emi does with it', async () => {
      const pressed: string[] = [];

      await render(
        <OnAPhone>
          <WhatEmiDoesWithIt focus={[]} onContinue={() => pressed.push('continue')} />
        </OnAPhone>,
      );
      await fireEvent.press(screen.getByTestId(whatEmiDoesActionTestID));

      expect(pressed).toEqual(['continue']);
    });

    it('builds the log line from the groups it is given and from nothing else', () => {
      expect(whatComesFirstWhenSheLogs([])).toBe(
        'Your log opens in the usual order, starting with mood, energy and pain.',
      );
      expect(whatComesFirstWhenSheLogs(['pain'])).toBe(
        'Your log shows the group you chose first: pain.',
      );
      expect(whatComesFirstWhenSheLogs(['pain', 'skin'])).toBe(
        'Your log shows the groups you chose first: pain and skin and hair.',
      );
      expect(whatEmiDoesCopy.log.line).toBe('What you see first');
    });
  });
});
