import type { Feeling as HowSheFeelsAboutIt } from '@emi/crypto';
import { space } from '@emi/tokens';
import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SingleChoiceRow } from '../../components/ChoiceRow';
import { feelingChoices, feelingLabels, firstRunCopy } from '../onboarding/copy';
import { AnswerScreen } from './AnswerScreen';
import { yourAnswersCopy } from './copy';

/** The row for one answer, named so a test presses the answer rather than a position in a list. */
export function changeFeelingTestID(answer: HowSheFeelsAboutIt): string {
  return `answer-feeling-${answer}`;
}

interface Props {
  /** The answer she already gave, and nothing where the first run never got one out of her. */
  readonly gave: HowSheFeelsAboutIt | undefined;
  readonly onSave: (answer: HowSheFeelsAboutIt) => void;
  readonly onCancel: () => void;
}

/**
 * How she feels about her own cycle, asked again on the rows the first run asked it on.
 *
 * It is the answer most likely to have moved, because a woman who found her period hard in January
 * may not in June. Save waits for an answer, for the reason the regularity screen waits for one.
 */
export function ChangeFeeling({ gave, onSave, onCancel }: Props): ReactNode {
  const [chosen, setChosen] = useState(gave);

  return (
    <AnswerScreen
      held={gave === undefined ? undefined : feelingLabels[gave]}
      lines={firstRunCopy.feeling.lines}
      onCancel={onCancel}
      onSave={() => {
        if (chosen !== undefined) {
          onSave(chosen);
        }
      }}
      question={firstRunCopy.feeling.title}
      saveIsReady={chosen !== undefined}
      title={yourAnswersCopy.rows.feeling}
    >
      <View style={styles.rows}>
        {feelingChoices.map((answer) => (
          <SingleChoiceRow
            isChosen={answer === chosen}
            key={answer}
            label={feelingLabels[answer]}
            onPress={() => {
              setChosen(answer);
            }}
            testID={changeFeelingTestID(answer)}
          />
        ))}
      </View>
    </AnswerScreen>
  );
}

const styles = StyleSheet.create({
  rows: { gap: space.spaceSm },
});
