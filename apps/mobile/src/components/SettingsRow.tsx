import type { IconName } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  readonly icon: IconName;
  readonly label: string;
  readonly line?: string;
  readonly value?: string;
  readonly onPress?: () => void;
  readonly testID?: string;
}

export function rowTileTestID(testID: string): string {
  return `${testID}-tile`;
}

export function rowDrawingTestID(testID: string): string {
  return `${testID}-drawing`;
}

export function rowChevronTestID(testID: string): string {
  return `${testID}-chevron`;
}

export function SettingsRow({ icon, label, line, value, onPress, testID }: Props): ReactNode {
  return (
    <View accessibilityLabel={icon} style={styles.row} testID={testID}>
      <Text>{label}</Text>
      {line === undefined ? null : <Text>{line}</Text>}
      {value === undefined ? null : <Text>{value}</Text>}
      {onPress === undefined ? null : <Text>{String(onPress.length)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
});
