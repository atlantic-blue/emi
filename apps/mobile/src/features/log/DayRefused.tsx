import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DayRefusal } from './editDay';

/**
 * A day she asked for and cannot have. An empty editor would be the wrong answer: she would pick a
 * flow, and Emi would hold a day she has not lived yet as a day she recorded.
 */
export const dayRefusedCopy: Readonly<Record<DayRefusal, { title: string; line: string }>> = {
  'day-is-in-the-future': {
    title: 'Not yet',
    line: 'That day has not happened. You can log today and any day behind it.',
  },
  'day-is-not-a-date': {
    title: 'Not a day',
    line: 'That address does not name a day in the calendar.',
  },
};

export const dayRefusedBackLabel = 'Back';
export const dayRefusedTestID = 'day-refused';
export const dayRefusedBackTestID = 'day-refused-back';

interface Props {
  readonly refusal: DayRefusal;
  readonly onBack: () => void;
}

export function DayRefused({ refusal, onBack }: Props): ReactNode {
  const said = dayRefusedCopy[refusal];

  return (
    <View style={styles.screen} testID={dayRefusedTestID}>
      <Text accessibilityRole="header" style={styles.title}>
        {said.title}
      </Text>
      <Text style={styles.line}>{said.line}</Text>

      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        style={styles.back}
        testID={dayRefusedBackTestID}
      >
        <Text style={styles.backLabel}>{dayRefusedBackLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    alignItems: 'center',
    backgroundColor: colour.ember,
    borderRadius: radius.chip,
    justifyContent: 'center',
    marginTop: space.roomy,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.base,
  },
  backLabel: {
    color: colour.surface,
    ...textStyle('body-lg'),
  },
  line: {
    color: colour.body,
    ...textStyle('body-lg'),
    textAlign: 'center',
  },
  screen: {
    backgroundColor: colour.stone,
    flex: 1,
    justifyContent: 'center',
    padding: space.base,
  },
  title: {
    color: colour.ink,
    ...textStyle('headline-lg'),
    marginBottom: space.tight,
    textAlign: 'center',
  },
});
