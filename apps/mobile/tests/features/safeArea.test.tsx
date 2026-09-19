import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { TestInstance } from 'test-renderer';
import { render, within } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { StatusBar } from 'react-native';
import type { ReactElement } from 'react';

import { ExportScreen, exportScreenTestID } from '../../src/features/export/ExportScreen';
import { HistoryScreen, historyScreenTestID } from '../../src/features/history/HistoryScreen';
import { HomeScreen, homeScreenTestID } from '../../src/features/home/HomeScreen';
import { Cover, coverTestID } from '../../src/features/lock/Cover';
import { LockScreen, lockScreenTestID } from '../../src/features/lock/LockScreen';
import { DayRefused, dayRefusedTestID } from '../../src/features/log/DayRefused';
import { LogFlow, logFlowDoneTestID, logFlowTestID } from '../../src/features/log/LogFlow';
import {
  OnboardingScreen,
  onboardingActionTestID,
  onboardingMarkTestID,
  onboardingProgressTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { RecoveryScreen } from '../../src/features/recovery/RecoveryScreen';
import {
  DeleteEverything,
  deleteScreenTestID,
  deletedScreenTestID,
} from '../../src/features/settings/DeleteEverything';
import { SettingsScreen, settingsScreenTestID } from '../../src/features/settings/SettingsScreen';
import {
  OnAPhone,
  aPhoneWithAnIsland,
  aPhoneWithNoIsland,
  screensDrawingUnderTheIsland,
} from '../fixtures/theSafeArea';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';

/**
 * Where every screen sits on the glass. A phone keeps the top of it for the clock and the island,
 * and the bottom of it for the home indicator, and anything drawn there is drawn under something
 * else.
 *
 * The runner reserves nothing, so a screen that ignored the inset passed every test it had. These
 * cases hand the provider the insets a phone reports, which is what the library documents for a
 * run with no operating system under it, and then measure what each screen reserved.
 */

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

const nothing = (): void => undefined;
const neverRun = async (): Promise<never> => {
  throw new Error('nothing is exported here, because this measures where the screen sits');
};

const learning = { completeCycles: 0, kind: 'learning', needsCycles: 3 } as const;

const theFirstRun = (): ReactElement => (
  <OnboardingScreen
    actionLabel="Continue"
    lines={['It asks for no account and no email address.']}
    onAction={nothing}
    screen="welcome"
    title="Emi"
  />
);

const theLoggingScreen = (): ReactElement => (
  <LogFlow
    day="2026-05-14"
    marked={false}
    onDone={nothing}
    onMark={nothing}
    onPick={nothing}
    ring={undefined}
    today="2026-05-14"
  />
);

/** Every screen root the application has, each named by the testID it carries on the glass. */
const everyScreen: readonly (readonly [string, () => ReactElement])[] = [
  ['onboarding-welcome', theFirstRun],
  [
    'recovery-before',
    (): ReactElement => (
      <RecoveryScreen
        actionLabel="Continue"
        lines={['A code she keeps, because nobody else holds one.']}
        onAction={nothing}
        screen="before"
        title="Your recovery code"
      />
    ),
  ],
  [
    homeScreenTestID,
    (): ReactElement => (
      <HomeScreen
        cycleLengthDays={28}
        forecast={learning}
        onExport={nothing}
        onHistory={nothing}
        onLogToday={nothing}
        onSettings={nothing}
        ring={undefined}
      />
    ),
  ],
  [logFlowTestID, theLoggingScreen],
  [
    dayRefusedTestID,
    (): ReactElement => <DayRefused onBack={nothing} refusal="day-is-in-the-future" />,
  ],
  [
    historyScreenTestID,
    (): ReactElement => (
      <HistoryScreen
        history={{ completeCycles: 0, cycles: [], patterns: [] }}
        onBack={nothing}
        onOpenDay={nothing}
      />
    ),
  ],
  [
    exportScreenTestID,
    (): ReactElement => (
      <ExportScreen canShare={false} onBack={nothing} onExport={neverRun} onShare={neverRun} />
    ),
  ],
  [
    settingsScreenTestID,
    (): ReactElement => <SettingsScreen onBack={nothing} onDelete={nothing} />,
  ],
  [
    deleteScreenTestID,
    (): ReactElement => (
      <DeleteEverything onBack={nothing} onDelete={nothing} onStartAgain={nothing} stage="ready" />
    ),
  ],
  [
    deletedScreenTestID,
    (): ReactElement => (
      <DeleteEverything
        onBack={nothing}
        onDelete={nothing}
        onStartAgain={nothing}
        stage="deleted"
      />
    ),
  ],
  [coverTestID, (): ReactElement => <Cover />],
  [lockScreenTestID, (): ReactElement => <LockScreen onUnlock={nothing} wasRefused={false} />],
];

async function drawnOn(
  screen: () => ReactElement,
  metrics = aPhoneWithAnIsland,
): Promise<TestInstance> {
  const [testID] = everyScreen.find(([, element]) => element === screen) ?? [];
  const view = await render(<OnAPhone metrics={metrics}>{screen()}</OnAPhone>);

  if (testID === undefined) {
    throw new Error('that screen is not one of the screens the application has');
  }

  return view.getByTestId(testID);
}

async function everyScreenDrawnOn(metrics = aPhoneWithAnIsland): Promise<TestInstance[]> {
  const roots: TestInstance[] = [];

  for (const [, screen] of everyScreen) {
    roots.push(await drawnOn(screen, metrics));
  }

  return roots;
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return sourceFiles(path);
    }

    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

describe('every screen respects the safe area', () => {
  describe('on a phone that keeps part of its glass', () => {
    it('reserves what the phone keeps, on every screen the application has', async () => {
      const roots = await everyScreenDrawnOn();

      expect(roots).toHaveLength(everyScreen.length);
      expect(screensDrawingUnderTheIsland(roots)).toEqual([]);
    });

    it('reserves the room the phone asks for and no room it did not', async () => {
      const root = await drawnOn(theFirstRun);

      expect(root.props.style).toContainEqual({
        paddingBottom: aPhoneWithAnIsland.insets.bottom,
        paddingLeft: aPhoneWithAnIsland.insets.left,
        paddingRight: aPhoneWithAnIsland.insets.right,
        paddingTop: aPhoneWithAnIsland.insets.top,
      });
    });
  });

  describe('the first run, where she saw it', () => {
    it('holds the mark and the step label below the top of the reserved room', async () => {
      const root = await drawnOn(theFirstRun);

      expect(within(root).getByTestId(onboardingMarkTestID)).toBeTruthy();
      expect(within(root).getByTestId(onboardingProgressTestID)).toBeTruthy();
      expect(screensDrawingUnderTheIsland([root])).toEqual([]);
    });

    it('holds the one button she can press above the home indicator', async () => {
      const root = await drawnOn(theFirstRun);

      expect(within(root).getByTestId(onboardingActionTestID)).toBeTruthy();
      expect(screensDrawingUnderTheIsland([root])).toEqual([]);
    });

    it('holds the button of the logging screen above it too', async () => {
      const root = await drawnOn(theLoggingScreen);

      expect(within(root).getByTestId(logFlowDoneTestID)).toBeTruthy();
      expect(screensDrawingUnderTheIsland([root])).toEqual([]);
    });
  });

  describe('on a phone that keeps nothing', () => {
    it('reserves nothing of its own, so a phone with no island loses no room', async () => {
      const roots = await everyScreenDrawnOn(aPhoneWithNoIsland);

      expect(roots).toHaveLength(everyScreen.length);

      for (const root of roots) {
        expect(root.props.style).toContainEqual({
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
          paddingTop: 0,
        });
      }
    });
  });

  describe('the clock and the battery, which the phone draws and Emi does not', () => {
    beforeEach(() => {
      resetExpoSqlite();
      resetExpoSecureStore();
    });

    it('are asked for in dark ink, because the ground under them is stone', async () => {
      const asked = jest.spyOn(StatusBar, 'setBarStyle');

      await renderRouter(appDirectory, { initialUrl: '/' });

      expect(asked.mock.calls.map(([style]) => style)).toContain('dark-content');
      asked.mockRestore();
    });
  });

  describe('a thirteenth screen cannot be written without the frame', () => {
    it('leaves the ground in one file, so no screen paints its own', () => {
      const root = join(__dirname, '..', '..', 'src');

      const painting = sourceFiles(root).filter((file) => {
        const source = readFileSync(file, 'utf8');

        return /backgroundColor: colour\.stone/.test(source) && /flex: 1/.test(source);
      });

      expect(painting.map((file) => file.slice(root.length + 1))).toEqual([
        join('components', 'Screen.tsx'),
      ]);
    });

    it('refuses to draw at all when it is rendered outside the provider', async () => {
      await expect(render(<SettingsScreen onBack={nothing} onDelete={nothing} />)).rejects.toThrow(
        /SafeAreaProvider/,
      );
    });
  });
});
