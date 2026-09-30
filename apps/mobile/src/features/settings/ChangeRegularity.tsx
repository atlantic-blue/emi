import type { Regularity as HowSteadyItIs } from '@emi/crypto';
import { space } from '@emi/tokens';
import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SingleChoiceRow } from '../../components/ChoiceRow';
import { firstRunCopy, regularityChoices, regularityLabels } from '../onboarding/copy';
import { AnswerScreen } from './AnswerScreen';
import { yourAnswersCopy } from './copy';

/** The row for one answer, named so a test presses the answer rather than a position in a list. */
export function changeRegularityTestID(answer: HowSteadyItIs): string {
  return `answer-regularity-${answer}`;
}

interface Props {
  /** The answer she already gave, and nothing where the first run never got one out of her. */
  readonly gave: HowSteadyItIs | undefined;
  readonly onSave: (answer: HowSteadyItIs) => void;
  readonly onCancel: () => void;
}

/**
 * How steady she says her cycle is, asked again on the rows the first run asked it on.
 *
 * The row she gave opens marked, so she reads her own answer before she changes it. Save waits for
 * an answer, because a woman who skipped this question arrives with no row marked and a save of
 * nothing would seal a statement about her body that she never made.
 */
export function ChangeRegularity({ gave, onSave, onCancel }: Props): ReactNode {
  const [chosen, setChosen] = useState(gave);

  return (
    <AnswerScreen
      held={gave === undefined ? undefined : regularityLabels[gave]}
      lines={firstRunCopy.regularity.lines}
      onCancel={onCancel}
      onSave={() => {
        if (chosen !== undefined) {
          onSave(chosen);
        }
      }}
      question={firstRunCopy.regularity.title}
      saveIsReady={chosen !== undefined}
      title={yourAnswersCopy.rows.regularity}
    >
      <View style={styles.rows}>
        {regularityChoices.map((answer) => (
          <SingleChoiceRow
            isChosen={answer === chosen}
            key={answer}
            label={regularityLabels[answer]}
            onPress={() => {
              setChosen(answer);
            }}
            testID={changeRegularityTestID(answer)}
          />
        ))}
      </View>
    </AnswerScreen>
  );
}

const styles = StyleSheet.create({
  rows: { gap: space.spaceSm },
});
