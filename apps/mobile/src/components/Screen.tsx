import { type PhaseName, colour } from '@emi/tokens';
import { Wash, useRoomAtTheFoot } from '@emi/ui';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * The ground every screen stands on, and the only place the inset is read.
 *
 * A phone keeps part of its glass for itself: the clock and the island at the top, the home
 * indicator at the bottom, and a rounded corner at each side when it is turned. Anything drawn
 * there is drawn under something else. The numbers arrive from the operating system through the
 * provider, so they follow the phone she holds rather than a measurement taken from one of them.
 *
 * Twelve screens stand on this one component, because a rule kept in twelve places is a rule that
 * is already broken in one of them.
 *
 * The dock is the other thing that takes room at the foot. It hangs over the screen rather than
 * standing beside it, so a screen it covers leaves room for it instead of the inset: the dock pads
 * itself by what the phone keeps, and its room is measured from the bottom edge of the glass. A
 * screen no dock reaches, the first run and the two screens pushed over the tabs, reserves the
 * inset alone and gains no gap.
 */

interface Props {
  readonly testID?: string;
  /**
   * The soft gradient the prototype paints across the top of a screen. It is asked for here rather
   * than drawn on every ground, because the flows take it one at a time and a screen that has not
   * been redrawn yet would otherwise carry the new colour under the old layout.
   */
  readonly drawsTheWash?: boolean;
  /**
   * The phase of today, where the screen knows it. The wash is then painted in that phase's own
   * tints rather than in the soft pair, which is how the prototype tells one day from another
   * before she reads a word. A screen that knows no phase passes none and draws the soft wash.
   */
  readonly washPhase?: PhaseName;
  readonly children: ReactNode;
}

export function Screen({ testID, drawsTheWash = false, washPhase, children }: Props): ReactNode {
  const insets = useSafeAreaInsets();
  const roomForTheDock = useRoomAtTheFoot();

  return (
    <View
      style={[
        styles.screen,
        {
          paddingBottom: roomForTheDock ?? insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingTop: insets.top,
        },
      ]}
      testID={testID}
    >
      {drawsTheWash ? (
        <View pointerEvents="none" style={styles.wash}>
          <Wash phase={washPhase} />
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colour.ground, flex: 1 },
  // Colour and nothing else, so it is drawn behind everything on the screen and takes no touch.
  wash: { left: 0, position: 'absolute', right: 0, top: 0 },
});
