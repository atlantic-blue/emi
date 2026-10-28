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
import { Icon, CappedText as Text } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '../../components/Card';
import { phaseCardEstimate, phaseCardMore, phaseCardWords } from './copy';

/**
 * The card under the ring: the phase she is in, its days in her own cycle, and one sentence about
 * it. Pressing it opens the Cycle phase page.
 */

export const phaseCardTestID = 'home-phase-card';
export const phaseCardPressTestID = 'home-phase-card-press';
export const phaseCardDaysTestID = 'home-phase-card-days';
export const phaseCardLineTestID = 'home-phase-card-line';
export const phaseCardChevronTestID = 'home-phase-card-chevron';

/** Points. The drawing inside the tile. */
const theIconInTheTile = 22;
/** Points. The chevron at the end of the row. */
const theChevron = 18;

interface Props {
  readonly phase: PhaseName;
  /** The days of that phase in the cycle she is in, from the phase rule in `@emi/cycle`. */
  readonly days: CycleDays;
  /** Left out where the screen is drawn alone, and then the card is not a button. */
  readonly onPress?: () => void;
}

export function PhaseCard({ phase, days, onPress }: Props): ReactNode {
  const said = phaseCardWords(phase, days);

  return (
    <Pressable
      accessibilityRole={onPress === undefined ? undefined : 'button'}
      disabled={onPress === undefined}
      onPress={onPress}
      testID={phaseCardPressTestID}
    >
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
              {`${said.line} ${phaseCardEstimate} ${phaseCardMore}`}
            </Text>
          </View>
          <Icon
            colour={colour.secondaryText}
            name="chevron"
            size={theChevron}
            testID={phaseCardChevronTestID}
          />
        </View>
      </Card>
    </Pressable>
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
  words: { flex: 1, gap: space.spaceXs },
});
