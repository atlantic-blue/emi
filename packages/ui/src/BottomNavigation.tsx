import { ICON_SIZE, type IconName, colour, space, stroke } from '@emi/tokens';
import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from './Icon';
import { Box } from './gluestack/box';
import { HStack } from './gluestack/hstack';
import { Pressable } from './gluestack/pressable';
import { Text } from './gluestack/text';

/**
 * The dock: a bar across the foot of the glass, holding one column for each place she can go.
 *
 * The prototype pins it to the left, the right and the bottom edge, fills it with the card colour,
 * and draws one hairline along its top. So her screen ends where that line begins, nothing of the
 * ground shows beside the bar, and the bar itself takes every press that lands on it.
 *
 * The four measurements the dock owns are written here, because no class carries them and the room
 * a screen leaves at its foot is their sum.
 *
 * The tab she is on is drawn in the accent, icon and word together, and the other three in the
 * quiet colour the design document names for them. A screen reader is told which one is selected,
 * because the accent is the only thing a reader of the screen has to go on.
 *
 * The chrome knows nothing about routing or about words. It is handed the tabs, told which one she
 * is on, and calls back when she picks another, so the one list of tabs lives with the screens it
 * names rather than in here.
 */

/** One column of the dock. */
export interface NavigationTab {
  /** What the route is called, which is what the caller gets back and what the test presses. */
  readonly name: string;
  /** The word under the drawing, already in her language. */
  readonly label: string;
  readonly icon: IconName;
}

interface Props {
  readonly tabs: readonly NavigationTab[];
  /** The name of the tab she is on. Nothing is chosen when she is somewhere else entirely. */
  readonly chosen: string | undefined;
  readonly onChoose: (name: string) => void;
}

/** The dock itself, which a test asks for to prove it is drawn, or that it is not. */
export const bottomNavigationTestID = 'bottom-navigation';

/** The row inside the bar, which holds the four columns and nothing else. */
export const dockPanelTestID = 'bottom-navigation-panel';

/** One column, by the name of the route it reaches. */
export function tabTestID(name: string): string {
  return `bottom-navigation-${name}`;
}

/** Points. One column, above the forty four points contract SEE-3 asks of every target. */
const TAB_HEIGHT = 52;

/** Points. What a column takes where the bar is too narrow to hand it a quarter of itself. */
const TAB_WIDTH = 52;

/** Points. What the bar draws above the room the phone keeps for itself. */
export const dockHeight = space.spaceSm + TAB_HEIGHT;

/**
 * Points. The deepest home indicator a phone keeps for itself, which the dock pads itself by.
 *
 * Nothing here read it off a device. It is the inset an iPhone with a dynamic island reports, and
 * the safe area fixture hands the same number to the provider, so the room the dock claims is held
 * against the room it draws rather than trusted.
 */
export const deepestHomeIndicator = 34;

/**
 * The room a screen leaves at its foot so the dock covers nothing she can read, which is what the
 * dock draws on the phone that keeps the most glass for itself.
 */
export const dockRoom = dockHeight + deepestHomeIndicator;

const RoomAtTheFoot = createContext<number | undefined>(undefined);

/**
 * Says that a dock hangs over the screens inside it, so each of them leaves room at its foot.
 * A screen the dock never reaches asks and is told nothing, and reserves nothing.
 */
export function TheDockHangsOver({ children }: { readonly children: ReactNode }): ReactNode {
  return <RoomAtTheFoot.Provider value={dockRoom}>{children}</RoomAtTheFoot.Provider>;
}

/** The room at the foot of this screen, or nothing where no dock hangs over it. */
export function useRoomAtTheFoot(): number | undefined {
  return useContext(RoomAtTheFoot);
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colour.card,
    borderTopColor: colour.line,
    borderTopWidth: stroke.hairline,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  column: { flex: 1, gap: space.spaceXs, minHeight: TAB_HEIGHT, minWidth: TAB_WIDTH },
  row: { paddingInline: space.spaceSm, paddingTop: space.spaceSm },
});

/** The dock, drawn from the tabs it is handed, with the one she is on lit. */
export function BottomNavigation({ tabs, chosen, onChoose }: Props): ReactNode {
  const insets = useSafeAreaInsets();

  return (
    <Box style={[styles.bar, { paddingBottom: insets.bottom }]} testID={bottomNavigationTestID}>
      <HStack style={styles.row} testID={dockPanelTestID}>
        {tabs.map((tab) => {
          const sheIsHere = tab.name === chosen;

          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: sheIsHere }}
              className="flex-col items-center justify-center"
              key={tab.name}
              onPress={() => {
                onChoose(tab.name);
              }}
              style={styles.column}
              testID={tabTestID(tab.name)}
            >
              <Icon
                colour={sheIsHere ? colour.accent : colour.dockQuiet}
                name={tab.icon}
                size={ICON_SIZE}
              />
              <Text
                className={`font-label-sm text-label-sm ${
                  sheIsHere ? 'text-accent' : 'text-dock-quiet'
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </HStack>
    </Box>
  );
}
