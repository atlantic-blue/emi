import type { ColourName } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type PillTone = 'accent' | 'apricot' | 'quiet';

export const pillTones: readonly PillTone[] = ['accent', 'apricot', 'quiet'];

interface PillPair {
  readonly ground: ColourName;
  readonly ink: ColourName;
}

export const pillPalette: Readonly<Record<PillTone, PillPair>> = {
  accent: { ground: 'field', ink: 'text' },
  apricot: { ground: 'field', ink: 'text' },
  quiet: { ground: 'field', ink: 'text' },
};

interface Props {
  readonly label: string;
  readonly tone: PillTone;
  readonly testID?: string;
}

export function StatusPill({ label, tone, testID }: Props): ReactNode {
  return (
    <View accessibilityLabel={tone} style={styles.pill} testID={testID}>
      <Text>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start' },
});
