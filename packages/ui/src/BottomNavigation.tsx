import { REM_IN_POINTS, type IconName, colour, radius } from '@emi/tokens';
import { BlurView } from 'expo-blur';
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
 * The dock the prototype draws: a capsule of glass standing off the bottom of the glass, holding
 * one column for each place she can go.
 *
 * Every measurement here is a class the prototype's own markup carries, and the classes reach
 * points through `apps/mobile/tailwind.config.js`, which is the prototype's Tailwind
 * configuration. Nothing in this file chooses a number that the prototype did not.
 *
 * The chrome knows nothing about routing or about words. It is handed the tabs, told which one she
 * is on, and calls back when she picks another, so the one list of tabs lives with the screens it
 * names rather than in here.
 *
 * It hangs over the screen rather than standing beside it. The prototype's nav is fixed to the
 * bottom of the page and out of the flow, so her screen fills the glass to the bottom edge and the
 * capsule floats over it. That is what the blur behind the capsule is for: something has to pass
 * under it. The air around the capsule lets a press through, and only the capsule takes one.
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

/** The capsule inside it, which carries the height, the corner and the fill. */
export const capsuleTestID = 'bottom-navigation-capsule';

/** The box that stands the capsule off the edges of the glass and off the foot. */
export const standOffTestID = 'bottom-navigation-stand-off';

/** One column, by the name of the route it reaches. */
export function tabTestID(name: string): string {
  return `bottom-navigation-${name}`;
}

/**
 * The room a screen leaves at its foot so the dock covers nothing she can read.
 *
 * It is the prototype's own `pb-28`, which is twenty eight steps of Tailwind's quarter rem scale
 * at sixteen points to the rem. The dock pads itself by the room the phone keeps, so this is
 * measured from the bottom edge of the glass and stands in for that inset rather than adding to it.
 */
export const dockRoom = 28 * 0.25 * REM_IN_POINTS;

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

/**
 * The two shadows the prototype casts, as one class. React Native reads a box shadow from the
 * string, so the two are written the way CSS writes them.
 */
const capsuleShadow =
  'shadow-[0_12px_32px_-4px_rgba(43,37,35,0.06),0_4px_12px_-2px_rgba(217,107,82,0.08)]';

/**
 * The prototype blurs what passes behind the capsule. A backdrop filter does not exist on a phone,
 * so the glass is a blur view under the translucent fill rather than a property of it.
 */
const styles = StyleSheet.create({
  glass: {
    borderRadius: radius.full,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  overTheScreen: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
});

const BLUR_AMOUNT = 40;

/** The dock, drawn from the tabs it is handed, with the one she is on lit. */
export function BottomNavigation({ tabs, chosen, onChoose }: Props): ReactNode {
  const insets = useSafeAreaInsets();

  return (
    <Box
      pointerEvents="box-none"
      style={[styles.overTheScreen, { paddingBottom: insets.bottom }]}
      testID={bottomNavigationTestID}
    >
      <Box className="px-margin pb-3" pointerEvents="box-none" testID={standOffTestID}>
        <Box
          className={`mx-auto h-16 w-full max-w-md rounded-full ${capsuleShadow}`}
          pointerEvents="box-none"
        >
          <BlurView
            intensity={BLUR_AMOUNT}
            pointerEvents="none"
            style={styles.glass}
            tint="light"
          />
          <HStack
            className="h-16 items-center justify-around rounded-full bg-surface-container-lowest/90 px-2"
            pointerEvents="auto"
            testID={capsuleTestID}
          >
            {tabs.map((tab) => {
              const sheIsHere = tab.name === chosen;

              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: sheIsHere }}
                  className="h-12 min-w-[52px] flex-col items-center justify-center"
                  key={tab.name}
                  onPress={() => {
                    onChoose(tab.name);
                  }}
                  testID={tabTestID(tab.name)}
                >
                  <Icon
                    colour={sheIsHere ? colour.primary : colour.onSurfaceVariant}
                    name={tab.icon}
                    size={24}
                  />
                  <Text
                    className={`mt-0.5 text-label-sm ${
                      sheIsHere ? 'font-semibold text-primary' : 'text-on-surface-variant'
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
    </Box>
  );
}
