import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  readonly words: string;
  readonly testID?: string;
}

export function lockLineIconTestID(testID: string): string {
  return `${testID}-lock`;
}

export function LockLine({ words, testID }: Props): ReactNode {
  return (
    <View style={styles.line} testID={testID}>
      <Text>{words}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row' },
});
