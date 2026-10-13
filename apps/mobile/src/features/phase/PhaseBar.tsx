import type { CyclePhaseDays, CyclePhaseName } from '@emi/cycle';
import { colour, fontNameFor, phaseNames, phasePalette, radius, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { barWords } from './copy';

/** The four phases of her cycle side by side, each with its days, and the one she is in ringed. */

export const phaseBarTestID = 'phase-bar';

export function phaseBarPartTestID(phase: CyclePhaseName): string {
  return `phase-bar-${phase}`;
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
  return (
    <View style={styles.row} testID={phaseBarTestID}>
      {phaseNames.map((each) => {
        const said = barWords(each, phaseDays[each]);
        const isHers = each === phase;

        return (
          <View
            accessibilityState={{ selected: isHers }}
            key={each}
            style={styles.part}
            testID={phaseBarPartTestID(each)}
          >
            <View
              style={[
                styles.bar,
                { backgroundColor: colour[phasePalette[each].fill] },
                isHers ? { borderColor: colour[phasePalette[each].ink] } : null,
              ]}
            />
            <Text style={isHers ? [styles.label, styles.hers] : styles.label}>
              {`${said.name}\n${said.days}`}
            </Text>
          </View>
        );
      })}
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
  part: { flex: 1, gap: BAR_GAP },
  row: { flexDirection: 'row', gap: BAR_GAP },
});
