import { colour, space, textStyle } from '@emi/tokens';
import { CappedText as Text } from '@emi/ui';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton, SecondaryButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { keepFilledInCopy, keepFilledInLine } from './copy';

export const keepFilledInTestID = 'home-keep-filled-in';
export const keepFilledInTitleTestID = 'home-keep-filled-in-title';
export const keepFilledInLineTestID = 'home-keep-filled-in-line';
export const keepFilledInKeepTestID = 'home-keep-filled-in-keep';
export const keepFilledInChangeTestID = 'home-keep-filled-in-change';

interface Props {
  /** How many days Emi filled in, which is the only number the card says. */
  readonly count: number;
  readonly onKeep: () => void;
  readonly onChange: () => void;
}

/**
 * Asks her to keep the days Emi filled in, once they are behind her. It sits in the flow of the
 * screen and never over it, and it stays until she keeps them, changes them or starts a new period.
 */
export function KeepFilledInDays({ count, onKeep, onChange }: Props): ReactNode {
  return (
    <Card testID={keepFilledInTestID}>
      <View style={styles.body}>
        <Text accessibilityRole="header" style={styles.title} testID={keepFilledInTitleTestID}>
          {keepFilledInCopy.title}
        </Text>
        <Text style={styles.line} testID={keepFilledInLineTestID}>
          {keepFilledInLine(count)}
        </Text>
        <View style={styles.actions}>
          <PrimaryButton
            label={keepFilledInCopy.keep}
            onPress={onKeep}
            testID={keepFilledInKeepTestID}
          />
          <SecondaryButton
            label={keepFilledInCopy.change}
            onPress={onChange}
            testID={keepFilledInChangeTestID}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.spaceSm },
  body: { gap: space.spaceSm },
  line: { color: colour.secondaryText, ...textStyle('body-sm') },
  title: { color: colour.text, ...textStyle('headline-sm') },
});
