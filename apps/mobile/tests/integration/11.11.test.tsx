import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Focus } from '@emi/crypto';
import { focusValues } from '@emi/crypto';
import { render, screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';

import { listCycles } from '../../src/data/cycleRepository';
import { listDayLogs } from '../../src/data/dayLogRepository';
import { readProfile } from '../../src/data/profileRepository';
import { migrate } from '../../src/data/schema';
import { readSetting, writeSetting } from '../../src/data/settingRepository';
import { words } from '../../src/language';
import { dayTestID } from '../../src/features/onboarding/Calendar';
import { firstForecastActionTestID } from '../../src/features/onboarding/FirstForecast';
import { focusTestID } from '../../src/features/onboarding/Focus';
import {
  onboardingActionTestID,
  onboardingProgressTestID,
  onboardingSkipTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import {
  ThePromise,
  promiseActionTestID,
  promiseIcons,
  promiseLineTestID,
  thePromiseTestID,
} from '../../src/features/onboarding/ThePromise';
import {
  WhatEmiDoesWithIt,
  whatEmiDoesActionTestID,
  whatEmiDoesCardTestID,
  whatEmiDoesIcons,
  whatEmiDoesTestID,
} from '../../src/features/onboarding/WhatEmiDoesWithIt';
import {
  focusLabels,
  promiseLines,
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

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');
const repositoryRoot = join(__dirname, '..', '..', '..', '..');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

/** A day inside the ninety the first run reaches back over, and not today. */
const herPeriodStarted = '2026-05-09';

/** The two screens this step adds, which the wording gate reads with the rest of the interface. */
const theTwoScreens = [
  join('apps', 'mobile', 'src', 'features', 'onboarding', 'ThePromise.tsx'),
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
 * Standing on the promise: every question answered or passed by, and the forecast read. The groups
 * are pressed on the focus screen where she is given any, because the screen after the promise
 * reads them back to her.
 */
async function sheReachesThePromise(focus: readonly Focus[] = []): Promise<void> {
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

  if (focus.length === 0) {
    await shePresses(onboardingSkipTestID);
  } else {
    for (const group of focus) {
      await shePresses(focusTestID(group));
    }

    await shePresses(onboardingActionTestID);
  }

  await shePresses(onboardingSkipTestID);
  await shePresses(firstForecastActionTestID);
}

/** The screen after the promise, which is the last one before the hold. */
async function sheReachesWhatEmiDoes(focus: readonly Focus[] = []): Promise<void> {
  await sheReachesThePromise(focus);
  await shePresses(promiseActionTestID);
}

/** Every word one of the two screens puts on the glass, and only that screen's words. */
function theWordsOf(testID: string): string {
  return textIn(screen.getByTestId(testID)).join(' ');
}

/** What the log card reads, which is the one card built from an answer she gave. */
function theLogCard(): string[] {
  return textIn(screen.getByTestId(whatEmiDoesCardTestID('log')));
}

/** The file as it stands, with the cipher written into the first line of it. */
function withTheCipherIn(file: string): string {
  return `const said = 'AES';\n${readFileSync(join(repositoryRoot, file), 'utf8')}`;
}

describe('the promise says only what the product does', () => {
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

  describe('the promise, after the forecast', () => {
    it('is where the forecast hands her, and it is the screen she is shown', async () => {
      const app = await sheOpensEmi();

      await sheReachesThePromise();

      expect(app.pathname()).toBe('/onboarding/the-promise');
      expect(screen.getByTestId(thePromiseTestID)).toBeTruthy();
    });

    it('says only she can read her days', async () => {
      await sheOpensEmi();

      await sheReachesThePromise();

      expect(screen.getByText(words('onboarding.promise.title'))).toBeTruthy();
      expect(theWordsOf(thePromiseTestID)).toContain('Only you can read your days.');
    });

    it('carries three lines, each one a thing the product does today', async () => {
      await sheOpensEmi();

      await sheReachesThePromise();

      expect(promiseLines).toEqual(['encrypted', 'noTracking', 'delete']);
      expect(textIn(screen.getByTestId(promiseLineTestID('encrypted')))).toEqual([
        words('onboarding.promise.encrypted.title'),
        words('onboarding.promise.encrypted.line'),
      ]);
      expect(textIn(screen.getByTestId(promiseLineTestID('noTracking')))).toEqual([
        words('onboarding.promise.noTracking.title'),
        words('onboarding.promise.noTracking.line'),
      ]);
      expect(textIn(screen.getByTestId(promiseLineTestID('delete')))).toEqual([
        words('onboarding.promise.delete.title'),
        words('onboarding.promise.delete.line'),
      ]);
    });

    it('says the key stays on the phone and that only the result is sent', async () => {
      await sheOpensEmi();

      await sheReachesThePromise();

      expect(theWordsOf(thePromiseTestID)).toContain(
        'Emi encrypts each day on the phone, with a key that stays on the phone, and sends only the result.',
      );
    });

    it('names no hardware, no audit, no cloud and nobody who could read a day', async () => {
      await sheOpensEmi();

      await sheReachesThePromise();
      const said = theWordsOf(thePromiseTestID);

      expect(said).not.toMatch(/enclave/i);
      expect(said).not.toMatch(/audit/i);
      expect(said).not.toMatch(/zero/i);
      expect(said).not.toMatch(/engineer/i);
      expect(said).not.toMatch(/\bAES\b/i);
    });

    it('draws one thing beside each line, and every line carries one', async () => {
      await sheOpensEmi();

      await sheReachesThePromise();

      expect(Object.keys(promiseIcons).sort()).toEqual([...promiseLines].sort());
      expect(promiseIcons.encrypted).toBe('lock');
    });

    it('hands her to what Emi does with it when she presses Continue', async () => {
      const app = await sheOpensEmi();

      await sheReachesThePromise();

      expect(screen.getByTestId(promiseActionTestID)).toHaveTextContent(
        words('onboarding.promise.action'),
      );

      await shePresses(promiseActionTestID);

      expect(app.pathname()).toBe('/onboarding/what-emi-does-with-it');
      expect(screen.getByTestId(whatEmiDoesTestID)).toBeTruthy();
    });
  });

  describe('what Emi does with what she said', () => {
    it('reads her answers back as three cards', async () => {
      await sheOpensEmi();

      await sheReachesWhatEmiDoes();

      expect(whatEmiDoesCards).toEqual(['forecast', 'log', 'privacy']);
      expect(screen.getByText(words('onboarding.whatEmiDoes.title'))).toBeTruthy();
      expect(textIn(screen.getByTestId(whatEmiDoesCardTestID('forecast')))).toEqual([
        words('onboarding.whatEmiDoes.forecast.title'),
        words('onboarding.whatEmiDoes.forecast.line'),
      ]);
      expect(textIn(screen.getByTestId(whatEmiDoesCardTestID('privacy')))).toEqual([
        words('onboarding.whatEmiDoes.privacy.title'),
        words('onboarding.whatEmiDoes.privacy.line'),
      ]);
    });

    it('names the groups she pressed, in the order she pressed them', async () => {
      await sheOpensEmi();

      await sheReachesWhatEmiDoes(['mood', 'energy']);

      expect(theLogCard()).toEqual([
        words('onboarding.whatEmiDoes.log.title'),
        'Mood and energy come first when you log, as you chose.',
      ]);
    });

    it('names them the other way round where she pressed them the other way round', async () => {
      await sheOpensEmi();

      await sheReachesWhatEmiDoes(['energy', 'mood']);

      expect(theLogCard()[1]).toBe('Energy and mood come first when you log, as you chose.');
    });

    it('names one group on its own, and says comes rather than come', async () => {
      await sheOpensEmi();

      await sheReachesWhatEmiDoes(['sleep']);

      expect(theLogCard()[1]).toBe('Sleep comes first when you log, as you chose.');
    });

    it('names all six where she pressed all six', async () => {
      await sheOpensEmi();

      await sheReachesWhatEmiDoes(focusValues);

      for (const group of focusValues) {
        expect(theLogCard()[1]?.toLowerCase()).toContain(focusLabels[group].toLowerCase());
      }
      expect(theLogCard()[1]).toBe(
        'Sleep, mood, energy, skin and hair, digestion and pain come first when you log, as you chose.',
      );
    });

    it('says the log opens in its usual order where she pressed none', async () => {
      await sheOpensEmi();

      await sheReachesWhatEmiDoes();

      expect(theLogCard()).toEqual([
        words('onboarding.whatEmiDoes.log.title'),
        'The log opens in its usual order.',
      ]);
      expect(theLogCard()[1]).not.toMatch(/as you chose/);
    });

    it('draws one thing beside each card, and every card carries one', async () => {
      expect(Object.keys(whatEmiDoesIcons).sort()).toEqual([...whatEmiDoesCards].sort());
      expect(whatEmiDoesIcons.privacy).toBe('lock');
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

  describe('the two screens, standing between the last question and the hold', () => {
    it('write nothing at all while she reads them', async () => {
      await sheOpensEmi();

      await sheReachesWhatEmiDoes(['mood']);

      expect(listDayLogs(herDatabase())).toEqual([]);
      expect(listCycles(herDatabase())).toEqual([]);
      expect(readProfile(herDatabase(), herProfileVault())).toBeUndefined();
      expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBeUndefined();
    });

    it('ask her nothing, so neither one draws the bar the questions draw', async () => {
      await sheOpensEmi();

      await sheReachesThePromise();

      expect(screen.queryByTestId(onboardingProgressTestID)).toBeNull();
      expect(theWordsOf(thePromiseTestID)).not.toMatch(/\d+ of \d+/);

      await shePresses(promiseActionTestID);

      expect(screen.queryByTestId(onboardingProgressTestID)).toBeNull();
      expect(theWordsOf(whatEmiDoesTestID)).not.toMatch(/\d+ of \d+/);
    });

    it('offer her one way on each, and nothing to skip', async () => {
      await sheOpensEmi();

      await sheReachesThePromise();

      expect(screen.queryByTestId(onboardingSkipTestID)).toBeNull();

      await shePresses(promiseActionTestID);

      expect(screen.queryByTestId(onboardingSkipTestID)).toBeNull();
    });

    it('stand in the order the first run walks: forecast, promise, what Emi does, hold', async () => {
      const app = await sheOpensEmi();
      const visited: string[] = [];

      await sheReachesThePromise();
      visited.push(app.pathname());
      await shePresses(promiseActionTestID);
      visited.push(app.pathname());
      await shePresses(whatEmiDoesActionTestID);
      visited.push(app.pathname());

      expect(visited).toEqual([
        '/onboarding/the-promise',
        '/onboarding/what-emi-does-with-it',
        '/onboarding/hold',
      ]);
    });
  });

  describe('the words the copy review refuses', () => {
    const scanned = scannedInterfaceFiles(repositoryRoot);

    it('are read on both new screens, because the scan holds every file the application draws', () => {
      for (const file of theTwoScreens) {
        expect(scanned).toContain(file);
        expect(interfaceClaimsIn(file, readFileSync(join(repositoryRoot, file), 'utf8'))).toEqual(
          [],
        );
      }
      expect(theTwoScreens).toHaveLength(2);
    });

    it('name the file and the words where the cipher is written into either screen', () => {
      for (const file of theTwoScreens) {
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
          interfaceClaimsIn(theTwoScreens[0] as string, `const said = '${word}';\n`),
        ).toHaveLength(1);
      }
    });
  });

  describe('each screen on its own', () => {
    it('presses Continue under her thumb and nothing else, on the promise', async () => {
      const pressed: string[] = [];

      await render(
        <OnAPhone>
          <ThePromise onContinue={() => pressed.push('continue')} />
        </OnAPhone>,
      );
      await fireEvent.press(screen.getByTestId(promiseActionTestID));

      expect(pressed).toEqual(['continue']);
    });

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
      expect(whatComesFirstWhenSheLogs([])).toBe(whatEmiDoesCopy.log.usual);
      expect(whatComesFirstWhenSheLogs(['pain'])).toBe(
        'Pain comes first when you log, as you chose.',
      );
      expect(whatComesFirstWhenSheLogs(['pain', 'skin'])).toBe(
        'Pain and skin and hair come first when you log, as you chose.',
      );
    });
  });
});
