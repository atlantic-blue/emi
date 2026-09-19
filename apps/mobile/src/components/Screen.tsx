import { colour } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * The ground every screen stands on, and the only place the inset is read.
 *
 * A phone keeps part of its glass for itself: the clock and the island at the top, the home
 * indicator at the bottom, and a rounded corner or a camera at the sides in landscape. Anything
 * drawn there is drawn under something else. The numbers come from the operating system through
 * the provider, so they follow the phone she holds rather than a measurement taken from one.
 *
 * It is one component rather than eight copies because a ninth screen is written by copying an
 * eighth, and a rule that lives in eight places is a rule that is already broken somewhere.
 */

interface Props {
  readonly testID?: string;
  readonly children: ReactNode;
}

export function Screen({ testID, children }: Props): ReactNode {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.screen,
        {
          paddingBottom: insets.bottom,
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
  screen: { backgroundColor: colour.stone, flex: 1 },
});
