import { colour } from '@emi/tokens';
import { useRoomAtTheFoot } from '@emi/ui';
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
  readonly children: ReactNode;
}

export function Screen({ testID, children }: Props): ReactNode {
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
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colour.surface, flex: 1 },
});
