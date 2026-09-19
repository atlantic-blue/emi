import { colour, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { lockCopy } from './copy';

export const coverTestID = 'lock-cover';

/**
 * What stands between a stranger and her screen while Emi is not in front. It is the wordmark on
 * the ground colour and nothing else, so the picture the operating system keeps of Emi says only
 * that Emi is installed.
 */
export function Cover(): ReactNode {
  return (
    <Screen testID={coverTestID}>
      <View style={styles.middle}>
        <Text style={styles.wordmark}>{lockCopy.cover.wordmark}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  middle: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: space.spaceLg,
  },
  wordmark: {
    color: colour.primary,
    ...textStyle('headline-xl'),
  },
});
