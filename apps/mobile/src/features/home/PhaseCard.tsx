import type { CycleDays } from '@emi/cycle';
import {
  MINIMUM_TAP_TARGET,
  type PhaseName,
  colour,
  fontNameFor,
  radius,
  space,
  textStyle,
} from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components/Card';
import { phaseCardWords } from './copy';

/**
 * The card under the ring: the phase she is in, its days in her own cycle, and one sentence about
 * it. It opens the Cycle phase page once that page exists, so for now it is not pressable.
 */

export const phaseCardTestID = 'home-phase-card';
export const phaseCardDaysTestID = 'home-phase-card-days';
export const phaseCardLineTestID = 'home-phase-card-line';

/** Points. The drawing inside the tile. */
const theIconInTheTile = 22;

interface Props {
  readonly phase: PhaseName;
  /** The days of that phase in the cycle she is in, from the phase rule in `@emi/cycle`. */
  readonly days: CycleDays;
}

export function PhaseCard({ phase, days }: Props): ReactNode {
  const said = phaseCardWords(phase, days);

  return (
    <Card testID={phaseCardTestID}>
      <View style={styles.row}>
        <View style={styles.tile}>
          <Icon colour={colour.ovulationInk} name="phase" size={theIconInTheTile} />
        </View>
        <View style={styles.words}>
          <Text style={styles.days} testID={phaseCardDaysTestID}>
            {said.days}
          </Text>
          <Text style={styles.line} testID={phaseCardLineTestID}>
            {said.line}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  days: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
    fontFamily: fontNameFor('text', 700),
  },
  // Contract SCREEN-2 holds the four words of the cycle to 14 points, and these sentences carry
  // them, so the line takes the small size in the bold cut rather than the 15 of the board.
  line: {
    color: colour.text,
    ...textStyle('body-sm'),
    fontFamily: fontNameFor('text', 800),
  },
  row: { alignItems: 'center', flexDirection: 'row', gap: space.spaceMd },
  tile: {
    alignItems: 'center',
    backgroundColor: colour.washWarm,
    borderRadius: radius.md,
    height: MINIMUM_TAP_TARGET,
    justifyContent: 'center',
    width: MINIMUM_TAP_TARGET,
  },
  words: { flexShrink: 1, gap: space.spaceXs },
});
