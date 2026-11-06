import type { Focus as FocusGroup } from '@emi/crypto';
import { type IconName, space } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { FluidGrid } from '../../components/FluidGrid';
import { SelectableTile, tileWordStyle } from '../../components/SelectableTile';
import { OnboardingScreen } from './OnboardingScreen';
import { firstRunCopy, focusChoices, focusLabels } from './copy';

/** The tile for one group, named so a test presses the group rather than a place in the grid. */
export function focusTestID(group: FocusGroup): string {
  return `focus-${group}`;
}

/** The place in the grid one tile stands in, named so a test can read how many share a row. */
export function focusCellTestID(group: FocusGroup): string {
  return `focus-cell-${group}`;
}

export const focusGridTestID = 'focus-grid';

/** The board draws the groups three to a row. */
export const FOCUS_COLUMNS = 3;

/**
 * The drawing on each tile. A map rather than a list, so an eighth value arriving in `Focus`
 * leaves this file failing to compile rather than leaving one tile with no drawing on it.
 */
export const focusIcons: Readonly<Record<FocusGroup, IconName>> = {
  sleep: 'sleep',
  mood: 'mood',
  energy: 'energy',
  skin: 'skin',
  appetite: 'appetite',
  digestive: 'digestion',
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
      linesAlign="center"
      lines={firstRunCopy.focus.lines}
      onAction={onContinue}
      onBack={onBack}
      onSkip={onSkip}
      screen="focus"
      title={firstRunCopy.focus.title}
    >
      <View style={styles.grid}>
        <FluidGrid
          cellAtLeast={0}
          labelStyle={tileWordStyle(space.spaceXs)}
          labels={focusChoices.map((group) => focusLabels[group])}
          most={FOCUS_COLUMNS}
          rowGap={space.spaceSm}
          testID={focusGridTestID}
        >
          {focusChoices.map((group) => (
            <View key={group} style={styles.cell} testID={focusCellTestID(group)}>
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
        </FluidGrid>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  cell: { paddingHorizontal: space.spaceXs },
  grid: { marginHorizontal: -space.spaceXs },
});
