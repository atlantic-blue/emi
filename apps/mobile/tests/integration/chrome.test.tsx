import { join } from 'node:path';

import { letterSpacingOf, typeScale } from '@emi/tokens';
import { bottomNavigationTestID, dockPanelTestID, dockRoom, tabTestID } from '@emi/ui';
import { renderRouter, screen } from 'expo-router/testing-library';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { homeScreenTestID } from '../../src/features/home/HomeScreen';
import { onboardingActionTestID } from '../../src/features/onboarding/OnboardingScreen';
import { deleteScreenTestID } from '../../src/features/settings/DeleteEverything';
import { tabs } from '../../src/features/chrome/tabs';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herPhoneHolds } from '../fixtures/herPhone';
import { theThemeIsLoaded } from '../fixtures/theTheme';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

/** The role the label is set in, read off the token package rather than typed here. */
const labelRole = typeScale['label-sm'];

/** The four columns, in the order the prototype draws them. */
const theFourTabs = [
  { name: 'index', label: 'Today' },
  { name: 'log/index', label: 'Log' },
  { name: 'history', label: 'Insights' },
  { name: 'settings/index', label: 'Privacy' },
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
 * Every label in the dock, in the order they are drawn. The columns are read off the bar rather
 * than asked for by name, because asking for them by name reads back the order of the ask.
 */
function theLabelsInTheDock(): string[] {
  return screen.getByTestId(dockPanelTestID).children.map((column) => {
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

    it('sets the label in label small, at the size, leading and tracking the tokens give it', async () => {
      await sheOpens('/');

      // The size and the tracking are the ones that go missing when the class merge in @emi/ui is
      // not told about Emi's own scale, and the leading is the one that goes to 154.
      const drawn = theLabelStyleOf('index');

      expect(drawn['fontSize']).toBe(labelRole.size);
      expect(drawn['lineHeight']).toBe(labelRole.lineHeight);
      expect(drawn['fontWeight']).toBe(labelRole.weight);
      expect(drawn['letterSpacing']).toBe(
        letterSpacingOf(labelRole.size, labelRole.letterSpacingEm),
      );
    });
  });

  describe('the dock hangs over the screen rather than standing beside it', () => {
    it('lets a tab screen reach the bottom edge of the glass, with the dock over it', async () => {
      await sheOpens('/');

      // The runner lays nothing out, so what is read here is the reason the screen reaches the
      // edge: the dock is out of the flow, so the screens beside it are measured without it.
      expect(theStyleOf(bottomNavigationTestID)).toMatchObject({ bottom: 0, position: 'absolute' });
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
    });

    it('clears the dock at the foot of a tab screen, so nothing she can read is covered', async () => {
      await sheOpens('/');

      expect(theStyleOf(homeScreenTestID)['paddingBottom']).toBe(dockRoom);
    });

    it('leaves no room at the foot of a screen no dock reaches', async () => {
      await sheOpens('/settings/delete');

      expect(screen.queryByTestId(bottomNavigationTestID)).toBeNull();
      expect(theStyleOf(deleteScreenTestID)['paddingBottom']).not.toBe(dockRoom);
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
});
