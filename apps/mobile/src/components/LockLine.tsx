import { colour, space, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * The sentence about her privacy, with a lock beside it.
 *
 * It is the quietest thing on a screen on purpose: a promise shouted is a promise somebody is
 * selling. The drawing and the words take the same ink, so the line reads as one thing.
 */

interface Props {
  readonly words: string;
  readonly testID?: string;
}

/** Points. The lock, read at the size of the words beside it rather than at the icon size. */
const LOCK_SIZE = 16;

/** The lock, named so a test can read the colour it is stroked in. */
export function lockLineIconTestID(testID: string): string {
  return `${testID}-lock`;
}

export function LockLine({ words, testID }: Props): ReactNode {
  return (
    <View style={styles.line} testID={testID}>
      <Icon
        colour={colour.secondaryText}
        name="lock"
        size={LOCK_SIZE}
        testID={testID === undefined ? undefined : lockLineIconTestID(testID)}
      />
      <Text style={styles.words}>{words}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    alignItems: 'center',
    gap: space.spaceSm,
    flexDirection: 'row',
  },
  words: {
    color: colour.secondaryText,
    flexShrink: 1,
    ...textStyle('body-sm'),
  },
});
