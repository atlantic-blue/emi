import type { Focus as FocusGroup } from '@emi/crypto';
import { space } from '@emi/tokens';
import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SelectableTile } from '../../components/SelectableTile';
import { firstRunCopy, focusChoices, focusLabels, focusNamesInASentence } from '../onboarding/copy';
import { focusAfterPressing } from '../onboarding/firstRun';
import { focusIcons } from '../onboarding/Focus';
import { AnswerScreen } from './AnswerScreen';
import { yourAnswersCopy } from './copy';

/** The tile for one group, named so a test presses the group rather than a place in the grid. */
export function changeFocusTestID(group: FocusGroup): string {
  return `answer-focus-${group}`;
}

interface Props {
  /** The groups she already chose, in the order she chose them, and empty where she chose none. */
  readonly gave: readonly FocusGroup[];
  readonly onSave: (groups: readonly FocusGroup[]) => void;
  readonly onCancel: () => void;
}

/**
 * What she says changes with her cycle, asked again on the tiles the first run asked it on.
 *
 * The order she presses them in is the answer and not a set, so the list is rebuilt from the
 * presses she makes here: a group she drops and presses again goes to the end, and the log sheet
 * reads her groups in exactly that order.
 *
 * Save waits for at least one group, because the first run waited for one too.
 */
export function ChangeFocus({ gave, onSave, onCancel }: Props): ReactNode {
  const [chosen, setChosen] = useState(gave);

  return (
    <AnswerScreen
      held={gave.length === 0 ? undefined : focusNamesInASentence(gave)}
      lines={firstRunCopy.focus.lines}
      onCancel={onCancel}
      onSave={() => {
        if (chosen.length > 0) {
          onSave(chosen);
        }
      }}
      question={firstRunCopy.focus.title}
      saveIsReady={chosen.length > 0}
      title={yourAnswersCopy.rows.focus}
    >
      <View style={styles.grid}>
        {focusChoices.map((group) => (
          <View key={group} style={styles.cell}>
            <SelectableTile
              icon={focusIcons[group]}
              isChosen={chosen.includes(group)}
              onPress={() => {
                setChosen(focusAfterPressing(chosen, group));
              }}
              testID={changeFocusTestID(group)}
              title={focusLabels[group]}
            />
          </View>
        ))}
      </View>
    </AnswerScreen>
  );
}

const styles = StyleSheet.create({
  // Two to a row, each one taking what is left of the row after the gap, so a long group name
  // widens its tile rather than being cut.
  cell: { flexBasis: '45%', flexGrow: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.spaceSm },
});
