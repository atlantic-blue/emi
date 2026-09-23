import { type IconName, colour, radius } from '@emi/tokens';
import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from './Icon';
import { floatingShadow } from './floating';
import { Box } from './gluestack/box';
import { HStack } from './gluestack/hstack';
import { Pressable } from './gluestack/pressable';
import { Text } from './gluestack/text';

/**
 * The dock: a panel standing off the bottom of the glass, holding one column for each place she
 * can go.
 *
 * It is layer 2 of the design system, the one thing in the product that floats over a screen: a
 * card ground, the corner every container takes, a hairline, and the single ambient shadow the
 * document allows. This style has no blur and no glass, so the fill is solid and her screen passes
 * behind the panel rather than through it.
 *
 * The palette, the corner and the padding arrive as class names, which reach points through
 * `apps/mobile/tailwind.config.js` and therefore through @emi/tokens. The three measurements the
 * dock owns are written here, because no class carries them and the room a screen leaves at its
 * foot is their sum.
 *
 * The tab she is on sits in the selected well the document names, so the column she is on differs
 * from the other three by a shape as well as by a colour.
 *
 * The chrome knows nothing about routing or about words. It is handed the tabs, told which one she
 * is on, and calls back when she picks another, so the one list of tabs lives with the screens it
 * names rather than in here.
 *
 * It hangs over the screen rather than standing beside it: her screen fills the glass to the
 * bottom edge and the panel floats over it. The air around the panel lets a press through, and
 * only the panel takes one.
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

/** The panel inside it, which carries the height, the corner, the hairline and the fill. */
export const dockPanelTestID = 'bottom-navigation-panel';

/** The box that stands the panel off the edges of the glass and off the foot. */
export const standOffTestID = 'bottom-navigation-stand-off';

/** One column, by the name of the route it reaches. */
export function tabTestID(name: string): string {
  return `bottom-navigation-${name}`;
}

/** Points. The height the design system fixes the dock at, with the safe area accommodated. */
export const dockHeight = 64;

/** Points. The air between the panel and the bottom edge of the glass. */
export const dockStandOff = 12;

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
export const dockRoom = dockHeight + dockStandOff + deepestHomeIndicator;

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

/** Points. The drawing in a column, which the design system sets smaller than the one in a row. */
const TAB_ICON = 22;

/** Points. One column, above the forty four points contract SEE-3 asks of every target. */
const TAB_HEIGHT = 48;

/** Points. A column is wider than it is deep, so four of them fill the panel evenly. */
const TAB_WIDTH = 52;

const styles = StyleSheet.create({
  column: { height: TAB_HEIGHT, minWidth: TAB_WIDTH },
  // The selected well the document names, so the column she is on differs by a shape and not only
  // by a colour. It is a style rather than a class because a class on this node stops
  // react-native-css resolving the one on the word inside it.
  columnHere: { backgroundColor: colour.surfaceContainerHigh, borderRadius: radius.lg },
  overTheScreen: { bottom: 0, left: 0, position: 'absolute', right: 0 },
  panel: { boxShadow: floatingShadow, height: dockHeight },
  standOff: { paddingBottom: dockStandOff },
});

/** The dock, drawn from the tabs it is handed, with the one she is on lit. */
export function BottomNavigation({ tabs, chosen, onChoose }: Props): ReactNode {
  const insets = useSafeAreaInsets();

  return (
    <Box
      pointerEvents="box-none"
      style={[styles.overTheScreen, { paddingBottom: insets.bottom }]}
      testID={bottomNavigationTestID}
    >
      <Box
        className="px-margin"
        pointerEvents="box-none"
        style={styles.standOff}
        testID={standOffTestID}
      >
        <HStack
          className="items-center justify-around rounded-xl border border-outline-variant bg-surface-container-lowest px-space-sm"
          pointerEvents="auto"
          style={styles.panel}
          testID={dockPanelTestID}
        >
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
                style={sheIsHere ? [styles.column, styles.columnHere] : styles.column}
                testID={tabTestID(tab.name)}
              >
                <Icon
                  colour={sheIsHere ? colour.primary : colour.onSurfaceVariant}
                  name={tab.icon}
                  size={TAB_ICON}
                />
                <Text
                  className={`mt-0.5 font-label-sm text-label-sm ${
                    sheIsHere ? 'text-primary' : 'text-on-surface-variant'
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </HStack>
      </Box>
    </Box>
  );
}
