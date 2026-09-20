import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { colour } from '@emi/tokens';
import { BottomNavigation, bottomNavigationTestID, capsuleTestID, tabTestID } from '@emi/ui';
import { render } from '@testing-library/react-native';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { homeScreenTestID } from '../../src/features/home/HomeScreen';
import { historyScreenTestID } from '../../src/features/history/HistoryScreen';
import { logFlowTestID } from '../../src/features/log/LogFlow';
import { onboardingActionTestID } from '../../src/features/onboarding/OnboardingScreen';
import { settingsScreenTestID } from '../../src/features/settings/SettingsScreen';
import { tabs } from '../../src/features/chrome/tabs';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herPhoneHolds } from '../fixtures/herPhone';
import { OnAPhone } from '../fixtures/theSafeArea';
import { theThemeIsLoaded } from '../fixtures/theTheme';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

/** The role the label is set in, read from the prototype's own configuration rather than typed. */
const [labelSize, labelRest] = JSON.parse(
  readFileSync(
    join(__dirname, '..', '..', '..', '..', 'docs/design/prototype-tailwind-config.json'),
    'utf8',
  ),
).theme.extend.fontSize['label-sm'] as [string, Record<string, string>];

function points(measured: string): number {
  return Number(measured.replace('px', ''));
}

/** The four columns, in the order the prototype draws them. */
const theFourTabs = [
  { name: 'index', label: 'Today', reaches: homeScreenTestID },
  { name: 'log/index', label: 'Log', reaches: logFlowTestID },
  { name: 'history', label: 'Insights', reaches: historyScreenTestID },
  { name: 'settings/index', label: 'Privacy', reaches: settingsScreenTestID },
] as const;

/**
 * Her phone with one period on it, so every tab has something to draw. A tab that reaches an empty
 * screen proves the navigation and nothing about the screen.
 */
async function herPhoneIsSetUp(): Promise<void> {
  await herPhoneHolds(new Date('2026-05-01T09:00:00.000Z'), [
    aBleedingDay(dayOf(new Date('2026-05-09T08:00:00.000Z'))),
    aBleedingDay(dayOf(new Date('2026-05-10T08:00:00.000Z'))),
    aBleedingDay(dayOf(new Date('2026-05-11T08:00:00.000Z'))),
  ]);
}

async function sheOpens(url: string): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: url });
}

interface Drawn {
  readonly props: { readonly children?: unknown; readonly style?: Record<string, unknown> };
}

/** The word under the drawing, which is the second thing in the column. */
function theLabelIn(name: string): Drawn {
  const [, label] = screen.getByTestId(tabTestID(name)).children;

  return label as unknown as Drawn;
}

/**
 * Every label in the dock, in the order they are drawn. The columns are read off the capsule
 * rather than asked for by name, because asking for them by name reads back the order of the ask.
 */
function theLabelsInTheDock(): string[] {
  return screen.getByTestId(capsuleTestID).children.map((column) => {
    const [, label] = (column as unknown as { children: unknown[] }).children;

    return String((label as Drawn).props.children);
  });
}

function theLabelStyleOf(name: string): Record<string, unknown> {
  return theLabelIn(name).props.style ?? {};
}

function theStyleOf(testID: string): Record<string, unknown> {
  return (StyleSheet.flatten(screen.getByTestId(testID).props.style) ?? {}) as Record<
    string,
    unknown
  >;
}

function theLabelColourOf(name: string): unknown {
  return theLabelStyleOf(name)['color'];
}

/**
 * The colour the drawing is stroked in, read off the drawing itself. The word beside it takes its
 * colour from a class and the drawing takes it from a prop, so one of them can go muted while the
 * other stays lit and only reading both catches it.
 */
function theIconColourOf(name: string): unknown {
  const [drawing] = screen.getByTestId(tabTestID(name)).children;

  return (drawing as unknown as { props: { stroke?: unknown } }).props.stroke;
}

function theLabelWeightOf(name: string): unknown {
  return theLabelStyleOf(name)['fontWeight'];
}

describe('the app draws its chrome from gluestack, and the bottom navigation is the one the prototype draws', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
    theThemeIsLoaded();
    await herPhoneIsSetUp();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the dock she sees at the bottom of every screen', () => {
    it('draws the four tabs, in order, under the words the prototype gives them', async () => {
      await sheOpens('/');

      expect(screen.getByTestId(bottomNavigationTestID)).toBeTruthy();
      expect(theLabelsInTheDock()).toEqual(['Today', 'Log', 'Insights', 'Privacy']);
    });

    it('keeps the list of tabs in one place, so the fifth the prototype draws is one entry', () => {
      expect(tabs.map((tab) => tab.name)).toEqual(theFourTabs.map((tab) => tab.name));
      expect(tabs.map((tab) => tab.icon)).toEqual(['sun', 'edit', 'chart', 'shield']);
    });

    it('draws the tab she is on in primary and the other three in on surface variant', async () => {
      await sheOpens('/');

      expect(theIconColourOf('index')).toBe(colour.primary);
      expect(theLabelColourOf('index')).toBe(colour.primary.toLowerCase());
      expect(theLabelWeightOf('index')).toBe(600);

      for (const tab of theFourTabs.filter((each) => each.name !== 'index')) {
        expect(theIconColourOf(tab.name)).toBe(colour.onSurfaceVariant);
        expect(theLabelColourOf(tab.name)).toBe(colour.onSurfaceVariant.toLowerCase());
      }
    });

    it('sets the label in label small, at the size, leading and tracking the prototype gives it', async () => {
      await sheOpens('/');

      // The size and the tracking are the ones that go missing when the class merge in @emi/ui is
      // not told about Emi's own scale, and the leading is the one that goes to 154.
      const drawn = theLabelStyleOf('index');

      expect(drawn['fontSize']).toBe(points(labelSize));
      expect(drawn['lineHeight']).toBe(points(labelRest['lineHeight'] ?? ''));
      expect(drawn['fontWeight']).toBe(Number(labelRest['fontWeight']));
      expect(drawn['letterSpacing']).toBe(
        Math.round(points(labelSize) * Number.parseFloat(labelRest['letterSpacing'] ?? '') * 100) /
          100,
      );
    });

    it('moves the primary to the tab she picks, and takes it off the one she left', async () => {
      await sheOpens('/');

      await fireEvent.press(screen.getByTestId(tabTestID('history')));

      expect(theIconColourOf('history')).toBe(colour.primary);
      expect(theLabelColourOf('history')).toBe(colour.primary.toLowerCase());
      expect(theIconColourOf('index')).toBe(colour.onSurfaceVariant);
      expect(theLabelColourOf('index')).toBe(colour.onSurfaceVariant.toLowerCase());
    });
  });

  describe('the measurements the prototype gives the capsule', () => {
    // Drawn on its own, on a phone that keeps part of its glass, because the router hands the
    // screens no insets and the room under the dock is one of the measurements.
    async function theDockOnAPhone(): Promise<void> {
      await render(
        <OnAPhone>
          <BottomNavigation chosen="index" onChoose={() => undefined} tabs={tabs} />
        </OnAPhone>,
      );
    }

    it('keeps the room under it the phone keeps for itself, and twelve points above that', async () => {
      await theDockOnAPhone();

      expect(theStyleOf(bottomNavigationTestID)).toMatchObject({ paddingBottom: 34 });
      expect(theStyleOf(capsuleTestID)).toBeTruthy();
    });

    it('draws a capsule of sixty four points, filled at nine tenths, spaced evenly', async () => {
      await theDockOnAPhone();

      // Nine tenths of the colour the prototype fills the capsule with, which is e5 of 255.
      expect(theStyleOf(capsuleTestID)).toMatchObject({
        backgroundColor: `${colour.surfaceContainerLowest.toLowerCase()}e5`,
        borderRadius: 9999,
        height: 64,
        justifyContent: 'space-around',
        paddingInline: 8,
      });
    });

    it('gives each column forty eight points of height and fifty two of width', async () => {
      await theDockOnAPhone();

      expect(theStyleOf(tabTestID('index'))).toMatchObject({ height: 48, minWidth: 52 });
    });
  });

  describe('where the dock is drawn and where it is not', () => {
    it('draws nothing at all while she is still answering the first run', async () => {
      resetExpoSqlite();
      resetExpoSecureStore();
      await sheOpens('/onboarding/welcome');

      expect(screen.getByTestId(onboardingActionTestID)).toBeTruthy();
      expect(screen.queryByTestId(bottomNavigationTestID)).toBeNull();
    });

    it('draws nothing on a screen no tab leads to, so a fifth tab is never implied', async () => {
      await sheOpens('/export');

      expect(screen.queryByTestId(bottomNavigationTestID)).toBeNull();
    });
  });

  describe('every tab reaches the screen it names', () => {
    it.each(theFourTabs)('$label opens the screen behind it', async (tab) => {
      await sheOpens('/');

      await fireEvent.press(screen.getByTestId(tabTestID(tab.name)));

      expect(screen.getByTestId(tab.reaches)).toBeTruthy();
      expect(screen.getByTestId(bottomNavigationTestID)).toBeTruthy();
    });
  });
});
