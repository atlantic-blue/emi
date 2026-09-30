import { longestName } from '@emi/crypto';
import { colour, space, textStyle } from '@emi/tokens';
import { type ReactNode, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { TextField } from '../../components/TextField';
import { firstRunCopy, nameTooLongLine } from '../onboarding/copy';
import { nameIsInRange, nameSheGave } from '../onboarding/firstRun';
import { AnswerScreen } from './AnswerScreen';
import { yourAnswersCopy } from './copy';

export const changeNameFieldTestID = 'answer-name';
export const changeNameTooLongTestID = 'answer-name-too-long';

interface Props {
  /** The name she already gave, and nothing where the first run never got one out of her. */
  readonly gave: string | undefined;
  /** Nothing at all where she cleared the field, which is the answer the first run reads too. */
  readonly onSave: (name: string | undefined) => void;
  readonly onCancel: () => void;
}

/**
 * Her name, asked again in the field the first run asked it in.
 *
 * The field opens on the name she already gave, so correcting a letter costs her one press rather
 * than the whole name again. An empty field is the same answer as the Skip the first run offered,
 * so saving one takes the greeting off the screen she opens rather than being refused.
 *
 * A name over the bound holds Save, because the profile refuses it when it is sealed and a refusal
 * she reads after pressing Save is one she cannot act on.
 */
export function ChangeName({ gave, onSave, onCancel }: Props): ReactNode {
  const [typed, setTyped] = useState(gave ?? '');
  const tooLong = !nameIsInRange(typed);

  return (
    <AnswerScreen
      held={gave}
      lines={firstRunCopy.name.lines}
      onCancel={onCancel}
      onSave={() => {
        onSave(nameSheGave(typed));
      }}
      question={firstRunCopy.name.title}
      saveIsReady={!tooLong}
      title={yourAnswersCopy.rows.name}
    >
      <TextField
        hint={firstRunCopy.name.hint}
        label={firstRunCopy.name.label}
        onChange={setTyped}
        testID={changeNameFieldTestID}
        value={typed}
      />
      {tooLong ? (
        <Text style={styles.refused} testID={changeNameTooLongTestID}>
          {nameTooLongLine(longestName)}
        </Text>
      ) : null}
    </AnswerScreen>
  );
}

const styles = StyleSheet.create({
  refused: {
    color: colour.error,
    ...textStyle('body-sm'),
    marginTop: space.spaceSm,
  },
});
