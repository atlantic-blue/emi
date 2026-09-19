import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { words } from '../../language';
import { Screen } from '../../components/Screen';
import type { DayRefusal } from './editDay';

/**
 * A day she asked for and cannot have. An empty editor would be the wrong answer: she would pick a
 * flow, and Emi would hold a day she has not lived yet as a day she recorded.
 */
export const dayRefusedCopy: Readonly<Record<DayRefusal, { title: string; line: string }>> = {
  'day-is-in-the-future': {
    title: words('log.day.notYet.title'),
    line: words('log.day.notYet.line'),
  },
  'day-is-not-a-date': {
    title: words('log.day.notADay.title'),
    line: words('log.day.notADay.line'),
  },
};

export const dayRefusedBackLabel = words('log.day.back');
export const dayRefusedTestID = 'day-refused';
export const dayRefusedBackTestID = 'day-refused-back';

interface Props {
  readonly refusal: DayRefusal;
  readonly onBack: () => void;
}

export function DayRefused({ refusal, onBack }: Props): ReactNode {
  const said = dayRefusedCopy[refusal];

  return (
    <Screen testID={dayRefusedTestID}>
      <View style={styles.middle}>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    alignItems: 'center',
    backgroundColor: colour.surfaceTint,
    borderRadius: radius.md,
    justifyContent: 'center',
    marginTop: space.spaceXl,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceLg,
  },
  backLabel: {
    color: colour.surfaceContainerLowest,
    ...textStyle('body-lg'),
  },
  line: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-lg'),
    textAlign: 'center',
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
    padding: space.spaceLg,
  },
  title: {
    color: colour.onSurface,
    ...textStyle('headline-lg'),
    marginBottom: space.spaceSm,
    textAlign: 'center',
  },
});
