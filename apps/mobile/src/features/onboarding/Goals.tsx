import type { Goal } from '@emi/crypto';
import { space } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { MultiChoiceRow } from '../../components/ChoiceRow';
import { OnboardingScreen } from './OnboardingScreen';
import { firstRunCopy, goalChoices, goalLabels } from './copy';

/** The row for one goal, named so a test presses the goal rather than a position in a list. */
export function goalTestID(goal: Goal): string {
  return `goal-${goal}`;
}

interface Props {
  /** The goals she has pressed so far, in the order she pressed them, and empty until she does. */
  readonly chosen: readonly Goal[];
  readonly onPress: (goal: Goal) => void;
  readonly onContinue: () => void;
  readonly onBack: () => void;
  readonly onSkip: () => void;
}

/**
 * What she came to Emi for. She may choose any number of the four, which is why the rows carry
 * boxes rather than the radio the two questions before this one carry.
 *
 * Each answer buys her one thing on the home screen and nothing anywhere else. A woman who
 * chooses none reads the home screen everybody else reads, so the way past this question and the
 * way on with nothing pressed are the same answer, and only the way past is drawn.
 */
export function Goals({ chosen, onPress, onContinue, onBack, onSkip }: Props): ReactNode {
  return (
    <OnboardingScreen
      actionIsReady={chosen.length > 0}
      actionLabel={firstRunCopy.goals.action}
      lines={firstRunCopy.goals.lines}
      onAction={onContinue}
      onBack={onBack}
      onSkip={onSkip}
      screen="goals"
      title={firstRunCopy.goals.title}
    >
      <View style={styles.rows}>
        {goalChoices.map((goal) => (
          <MultiChoiceRow
            isChosen={chosen.includes(goal)}
            key={goal}
            label={goalLabels[goal]}
            onPress={() => {
              onPress(goal);
            }}
            testID={goalTestID(goal)}
          />
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  rows: { gap: space.spaceSm },
});
