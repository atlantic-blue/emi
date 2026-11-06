import type { CyclePhaseDays, CyclePhaseName } from '@emi/cycle';
import { colour, fontNameFor, phaseNames, phasePalette, radius, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { CappedText as Text } from '@emi/ui';

import { FluidGrid } from '../../components/FluidGrid';
import { barWords } from './copy';

/** The four phases of her cycle side by side, each with its days, and the one she is in ringed. */

export const phaseBarTestID = 'phase-bar';

export const phaseBarGridTestID = 'phase-bar-grid';

export function phaseBarPartTestID(phase: CyclePhaseName): string {
  return `phase-bar-${phase}`;
}

export function phaseBarLabelTestID(phase: CyclePhaseName): string {
  return `phase-bar-label-${phase}`;
}

/** Points. The height of each bar, and the gap between two of them, as the board draws them. */
const BAR_HEIGHT = 8;
const BAR_GAP = 6;
const RING_WIDTH = 2;

interface Props {
  readonly phase: CyclePhaseName;
  readonly phaseDays: CyclePhaseDays;
}

export function PhaseBar({ phase, phaseDays }: Props): ReactNode {
  const said = phaseNames.map((each) => ({ phase: each, ...barWords(each, phaseDays[each]) }));

  return (
    <View style={styles.row} testID={phaseBarTestID}>
      <FluidGrid
        cellAtLeast={0}
        labelStyle={[styles.label, styles.hers, styles.part]}
        labels={said.map((each) => `${each.name} ${each.days}`)}
        most={phaseNames.length}
        testID={phaseBarGridTestID}
      >
        {said.map((each) => {
          const isHers = each.phase === phase;

          return (
            <View
              accessibilityState={{ selected: isHers }}
              key={each.phase}
              style={styles.part}
              testID={phaseBarPartTestID(each.phase)}
            >
              <View
                style={[
                  styles.bar,
                  { backgroundColor: colour[phasePalette[each.phase].fill] },
                  isHers ? { borderColor: colour[phasePalette[each.phase].ink] } : null,
                ]}
              />
              <Text
                style={isHers ? [styles.label, styles.hers] : styles.label}
                testID={phaseBarLabelTestID(each.phase)}
              >
                {`${each.name}\n${each.days}`}
              </Text>
            </View>
          );
        })}
      </FluidGrid>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderColor: 'transparent',
    borderRadius: radius.full,
    borderWidth: RING_WIDTH,
    height: BAR_HEIGHT + 2 * RING_WIDTH,
  },
  hers: { color: colour.text, fontFamily: fontNameFor('text', 800) },
  label: { color: colour.secondaryText, ...textStyle('label-sm') },
  part: { gap: BAR_GAP, paddingHorizontal: BAR_GAP / 2 },
  row: { marginHorizontal: -BAR_GAP / 2 },
});
