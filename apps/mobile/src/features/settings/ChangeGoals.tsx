import type { Goal } from '@emi/crypto';
import { space } from '@emi/tokens';
import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MultiChoiceRow } from '../../components/ChoiceRow';
import { firstRunCopy, goalChoices, goalLabels } from '../onboarding/copy';
import { goalsAfterPressing } from '../onboarding/firstRun';
import { AnswerScreen } from './AnswerScreen';
import { goalsChosenLabel, yourAnswersCopy } from './copy';

/** The row for one goal, named so a test presses the goal rather than a position in a list. */
export function changeGoalTestID(goal: Goal): string {
  return `answer-goal-${goal}`;
}

interface Props {
  /** The goals she already chose, in the order she chose them, and empty where she chose none. */
  readonly gave: readonly Goal[];
  readonly onSave: (goals: readonly Goal[]) => void;
  readonly onCancel: () => void;
}

/**
 * What she came to Emi for, asked again on the rows the first run asked it on.
 *
 * Every goal she chose opens ticked, so pressing one row is how she drops one goal rather than how
 * she starts the answer again. Save waits for at least one, because the first run waited for one
 * too and each goal buys her a card on the screen she opens.
 */
export function ChangeGoals({ gave, onSave, onCancel }: Props): ReactNode {
  const [chosen, setChosen] = useState(gave);

  return (
    <AnswerScreen
      held={gave.length === 0 ? undefined : goalsChosenLabel(gave.length, goalChoices.length)}
      lines={firstRunCopy.goals.lines}
      onCancel={onCancel}
      onSave={() => {
        if (chosen.length > 0) {
          onSave(chosen);
        }
      }}
      question={firstRunCopy.goals.title}
      saveIsReady={chosen.length > 0}
      title={yourAnswersCopy.rows.goals}
    >
      <View style={styles.rows}>
        {goalChoices.map((goal) => (
          <MultiChoiceRow
            isChosen={chosen.includes(goal)}
            key={goal}
            label={goalLabels[goal]}
            onPress={() => {
              setChosen(goalsAfterPressing(chosen, goal));
            }}
            testID={changeGoalTestID(goal)}
          />
        ))}
      </View>
    </AnswerScreen>
  );
}

const styles = StyleSheet.create({
  rows: { gap: space.spaceSm },
});
