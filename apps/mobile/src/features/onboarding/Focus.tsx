import type { Focus as FocusGroup } from '@emi/crypto';
import { type IconName, space } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { SelectableTile } from '../../components/SelectableTile';
import { OnboardingScreen } from './OnboardingScreen';
import { firstRunCopy, focusChoices, focusLabels } from './copy';

/** The tile for one group, named so a test presses the group rather than a place in the grid. */
export function focusTestID(group: FocusGroup): string {
  return `focus-${group}`;
}

/**
 * The drawing on each tile. A map rather than a list, so a seventh value arriving in `Focus`
 * leaves this file failing to compile rather than leaving one tile with no drawing on it.
 */
export const focusIcons: Readonly<Record<FocusGroup, IconName>> = {
  sleep: 'sleep',
  mood: 'mood',
  energy: 'energy',
  skin: 'skin',
  digestion: 'digestion',
  pain: 'pain',
};

interface Props {
  /** The groups she has pressed so far, in the order she pressed them, and empty until she does. */
  readonly chosen: readonly FocusGroup[];
  readonly onPress: (group: FocusGroup) => void;
  readonly onContinue: () => void;
  readonly onBack: () => void;
  readonly onSkip: () => void;
}

/**
 * What she says changes with her cycle. The order she presses them in is the answer, not a set:
 * the log sheet draws her groups in it, so the first tile she presses is the first heading she
 * reads every time she logs a day.
 *
 * A woman who presses nothing gets the log everybody else gets, so the way past this question and
 * the way on with nothing pressed say the same thing, and only the way past is drawn.
 */
export function Focus({ chosen, onPress, onContinue, onBack, onSkip }: Props): ReactNode {
  return (
    <OnboardingScreen
      actionIsReady={chosen.length > 0}
      actionLabel={firstRunCopy.focus.action}
      lines={firstRunCopy.focus.lines}
      onAction={onContinue}
      onBack={onBack}
      onSkip={onSkip}
      screen="focus"
      title={firstRunCopy.focus.title}
    >
      <View style={styles.grid}>
        {focusChoices.map((group) => (
          <View key={group} style={styles.cell}>
            <SelectableTile
              icon={focusIcons[group]}
              isChosen={chosen.includes(group)}
              onPress={() => {
                onPress(group);
              }}
              testID={focusTestID(group)}
              title={focusLabels[group]}
            />
          </View>
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  // Two to a row, each one taking what is left of the row after the gap, so a long group name
  // widens its tile rather than being cut.
  cell: { flexBasis: '45%', flexGrow: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.spaceSm },
});
