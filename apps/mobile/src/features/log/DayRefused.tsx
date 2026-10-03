import { colour, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { words } from '../../language';
import { SecondaryButton } from '../../components/Button';
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
export const dayRefusedTitleTestID = 'day-refused-title';
export const dayRefusedLineTestID = 'day-refused-line';
export const dayRefusedBackTestID = 'day-refused-back';

interface Props {
  readonly refusal: DayRefusal;
  readonly onBack: () => void;
}

export function DayRefused({ refusal, onBack }: Props): ReactNode {
  const said = dayRefusedCopy[refusal];

  return (
    <Screen drawsTheWash testID={dayRefusedTestID}>
      <View style={styles.body}>
        <View style={styles.said}>
          <Text accessibilityRole="header" style={styles.title} testID={dayRefusedTitleTestID}>
            {said.title}
          </Text>
          <Text style={styles.line} testID={dayRefusedLineTestID}>
            {said.line}
          </Text>
        </View>

        <SecondaryButton
          label={dayRefusedBackLabel}
          onPress={onBack}
          testID={dayRefusedBackTestID}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: space.spaceLg,
    padding: space.spaceLg,
  },
  // The two sentences stand together in the middle of the glass, with the way back at the foot,
  // which is where every other screen of the prototype puts the thing she presses.
  said: { flexGrow: 1, justifyContent: 'center' },
  line: {
    color: colour.secondaryText,
    ...textStyle('body-lg'),
    textAlign: 'center',
  },
  title: {
    color: colour.text,
    ...textStyle('headline-lg'),
    marginBottom: space.spaceSm,
    textAlign: 'center',
  },
});
