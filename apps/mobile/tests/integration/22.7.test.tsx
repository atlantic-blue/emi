import { join } from 'node:path';

import { ICON_SIZE, colour, space, stroke } from '@emi/tokens';
import {
  BottomNavigation,
  bottomNavigationTestID,
  deepestHomeIndicator,
  dockPanelTestID,
  dockRoom,
  tabTestID,
} from '@emi/ui';
import { render } from '@testing-library/react-native';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { homeScreenTestID } from '../../src/features/home/HomeScreen';
import { historyScreenTestID } from '../../src/features/history/HistoryScreen';
import { logFlowTestID } from '../../src/features/log/LogFlow';
import { settingsScreenTestID } from '../../src/features/settings/SettingsScreen';
import { tabs } from '../../src/features/chrome/tabs';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herPhoneHolds } from '../fixtures/herPhone';
import { OnAPhone, aPhoneWithAnIsland } from '../fixtures/theSafeArea';
import { theThemeIsLoaded } from '../fixtures/theTheme';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

/** The four places the bar reaches, in the order the prototype draws them. */
const theFourTabs = [
  { name: 'index', label: 'Today', reaches: homeScreenTestID },
  { name: 'log/index', label: 'Log', reaches: logFlowTestID },
  { name: 'history', label: 'Insights', reaches: historyScreenTestID },
  { name: 'settings/index', label: 'Privacy', reaches: settingsScreenTestID },
] as const;

/** The three tabs she is not on, whichever one she is on. */
function theOtherThree(here: string): readonly { readonly name: string }[] {
  return theFourTabs.filter((tab) => tab.name !== here);
}

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

/**
 * The bar drawn on its own, on a phone that keeps part of its glass, because the router hands the
 * screens no insets and the room under the columns is one of the measurements.
 */
async function theBarOnAPhone(chosen = 'index'): Promise<void> {
  await render(
    <OnAPhone>
      <BottomNavigation chosen={chosen} onChoose={() => undefined} tabs={tabs} />
    </OnAPhone>,
  );
}

function theStyleOf(testID: string): Record<string, unknown> {
  return (StyleSheet.flatten(screen.getByTestId(testID).props.style) ?? {}) as Record<
    string,
    unknown
  >;
}

interface Drawn {
  readonly props: Record<string, unknown>;
}

/** The drawing and the word of one column, which is everything a column holds. */
function theColumn(name: string): { readonly drawing: Drawn; readonly label: Drawn } {
  const [drawing, label] = screen.getByTestId(tabTestID(name)).children;

  return { drawing: drawing as unknown as Drawn, label: label as unknown as Drawn };
}

/**
 * The colour the drawing is stroked in, read off the drawing itself. The word beside it takes its
 * colour from a class and the drawing takes it from a prop, so one of them can go quiet while the
 * other stays lit and only reading both catches it.
 */
function theIconColourOf(name: string): unknown {
  return theColumn(name).drawing.props['stroke'];
}

function theLabelColourOf(name: string): unknown {
  const style = (StyleSheet.flatten(theColumn(name).label.props['style']) ?? {}) as Record<
    string,
    unknown
  >;

  return style['color'];
}

describe('the dock takes the redesign look and keeps its routes', () => {
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

  describe('the bar across the foot of her screen', () => {
    it('reaches both edges of the glass and sits on the bottom one', async () => {
      await theBarOnAPhone();

      expect(theStyleOf(bottomNavigationTestID)).toMatchObject({
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
      });
    });

    it('is white across the whole of that width, so no band of the ground shows beside it', async () => {
      await theBarOnAPhone();

      expect(theStyleOf(bottomNavigationTestID)['backgroundColor']).toBe(colour.card);
    });

    it('is separated from her screen by one hairline along its top and nothing else', async () => {
      await theBarOnAPhone();

      const drawn = theStyleOf(bottomNavigationTestID);

      expect(drawn).toMatchObject({
        borderTopColor: colour.line,
        borderTopWidth: stroke.hairline,
      });
      // A bar, not a capsule standing over her screen: no corner, no hairline on the other three
      // edges, and none of the shadow layer 2 of the design system allows.
      expect(drawn['borderRadius']).toBeUndefined();
      expect(drawn['borderWidth']).toBeUndefined();
      expect(drawn['boxShadow']).toBeUndefined();
    });

    it('keeps the room under the columns that the phone keeps for itself', async () => {
      await theBarOnAPhone();

      expect(theStyleOf(bottomNavigationTestID)['paddingBottom']).toBe(
        aPhoneWithAnIsland.insets.bottom,
      );
      expect(deepestHomeIndicator).toBe(aPhoneWithAnIsland.insets.bottom);
    });
  });

  describe('the four columns it holds', () => {
    it('gives each of the four an equal share of the width and the same height', async () => {
      await theBarOnAPhone();

      for (const tab of theFourTabs) {
        expect(theStyleOf(tabTestID(tab.name))).toMatchObject({ flex: 1, minHeight: 52 });
      }
    });

    it('draws the word under the drawing in every one of them', async () => {
      await theBarOnAPhone();

      for (const tab of theFourTabs) {
        const column = theColumn(tab.name);

        expect(column.drawing.props['width']).toBe(ICON_SIZE);
        expect(column.drawing.props['height']).toBe(ICON_SIZE);
        expect(column.label.props['children']).toBe(tab.label);
      }
    });

    it('paints nothing behind the column she is on, because the bar is one surface', async () => {
      await theBarOnAPhone();

      for (const tab of theFourTabs) {
        const drawn = theStyleOf(tabTestID(tab.name));

        expect(drawn['backgroundColor']).toBeUndefined();
        expect(drawn['borderRadius']).toBeUndefined();
      }
    });
  });

  describe('which of the four she is on', () => {
    it('draws that one in the accent, the drawing and the word together', async () => {
      await sheOpens('/');

      expect(theIconColourOf('index')).toBe(colour.accent);
      expect(theLabelColourOf('index')).toBe(colour.accent.toLowerCase());
    });

    it('draws the other three in the quiet colour the dock keeps for them', async () => {
      await sheOpens('/');

      for (const tab of theOtherThree('index')) {
        expect(theIconColourOf(tab.name)).toBe(colour.dockQuiet);
        expect(theLabelColourOf(tab.name)).toBe(colour.dockQuiet.toLowerCase());
      }
    });

    it('tells a screen reader which one it is, because the accent is all she can see', async () => {
      await sheOpens('/');

      expect(screen.getByTestId(tabTestID('index')).props['accessibilityState']).toEqual({
        selected: true,
      });
      expect(screen.getByTestId(tabTestID('history')).props['accessibilityState']).toEqual({
        selected: false,
      });
    });

    it('moves the accent onto the tab she presses and takes it off the one she left', async () => {
      await sheOpens('/');

      await fireEvent.press(screen.getByTestId(tabTestID('history')));

      expect(theIconColourOf('history')).toBe(colour.accent);
      expect(theLabelColourOf('history')).toBe(colour.accent.toLowerCase());
      expect(theIconColourOf('index')).toBe(colour.dockQuiet);
      expect(theLabelColourOf('index')).toBe(colour.dockQuiet.toLowerCase());
    });
  });

  describe('the four places it still reaches', () => {
    it.each(theFourTabs)(
      '$label opens the screen behind it, with the bar still there',
      async (tab) => {
        await sheOpens('/');

        await fireEvent.press(screen.getByTestId(tabTestID(tab.name)));

        expect(screen.getByTestId(tab.reaches)).toBeTruthy();
        expect(screen.getByTestId(bottomNavigationTestID)).toBeTruthy();
      },
    );
  });

  describe('the room a screen leaves at its foot', () => {
    it('is what the bar draws, and not a number typed beside it', async () => {
      await theBarOnAPhone();

      const drawn =
        Number(theStyleOf(dockPanelTestID)['paddingTop']) +
        Number(theStyleOf(tabTestID('index'))['minHeight']) +
        Number(theStyleOf(bottomNavigationTestID)['paddingBottom']);

      expect(drawn).toBe(space.spaceSm + 52 + aPhoneWithAnIsland.insets.bottom);
      expect(dockRoom).toBe(drawn);
    });

    it('is the room the screen she opens on actually reserves', async () => {
      await sheOpens('/');

      expect(theStyleOf(homeScreenTestID)['paddingBottom']).toBe(dockRoom);
    });
  });
});
