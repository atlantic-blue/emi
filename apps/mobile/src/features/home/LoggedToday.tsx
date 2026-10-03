import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { homeCopy } from './copy';

/**
 * The row under the two round actions that reads back what she marked today.
 *
 * It opens the log on the symptom groups, which is where she came from, so the way to correct what
 * she just recorded is the thing she is looking at rather than a second walk through the actions.
 *
 * The mark at the head of it says the day is in her record. That is the whole point of the row: she
 * pressed save and she wants to see that Emi kept it, before she reads back what she said.
 *
 * The line takes the small size because a flow is named in it and contract SCREEN-2 holds the four
 * words a stranger would recognise under 14 points on this screen.
 */

export const loggedTodayTestID = 'home-logged-today';
export const loggedTodayLeadTestID = 'home-logged-today-lead';
export const loggedTodayLineTestID = 'home-logged-today-line';

/** The tile at the head of the row, which carries the mark that says the day is in her record. */
export const loggedTodayTileTestID = 'home-logged-today-tile';

/** The mark inside that tile. */
export const loggedTodayMarkTestID = 'home-logged-today-mark';

/** Points. The mark that says the row opens something, at the size the other rows of Emi draw it. */
const OPENS_MARK_SIZE = 18;

/** Points. The mark inside the tile, drawn under the width of the tile that carries it. */
const THE_MARK_IN_THE_TILE = 22;

interface Props {
  /** What she marked today, already in her own words, and never an empty line. */
  readonly marked: string;
  /** The way back into the log, on the groups, which is where the drawing sends this row. */
  readonly onPress: () => void;
}

export function LoggedToday({ marked, onPress }: Props): ReactNode {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.row}
      testID={loggedTodayTestID}
    >
      <View style={styles.tile} testID={loggedTodayTileTestID}>
        <Icon
          colour={colour.ovulationInk}
          name="check"
          size={THE_MARK_IN_THE_TILE}
          testID={loggedTodayMarkTestID}
        />
      </View>

      <View style={styles.said}>
        <Text style={styles.lead} testID={loggedTodayLeadTestID}>
          {homeCopy.loggedToday.lead}
        </Text>
        <Text style={styles.line} testID={loggedTodayLineTestID}>
          {marked}
        </Text>
      </View>

      <Icon colour={colour.quietIcon} name="chevron" size={OPENS_MARK_SIZE} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lead: {
    color: colour.secondaryText,
    ...textStyle('label-md'),
  },
  line: {
    color: colour.text,
    ...textStyle('body-lg'),
  },
  row: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderRadius: radius.xl,
    flexDirection: 'row',
    gap: space.spaceMd,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    padding: space.spaceMd,
  },
  // The words take the room the tile and the mark leave, so a long line wraps inside the row
  // rather than pushing the mark off the right of the screen.
  said: { flexGrow: 1, flexShrink: 1, rowGap: space.spaceXs },
  // The tile takes the warm pair of the palette, which is the one the contrast test measured a
  // mark on. It is as wide as a thumb needs even though nothing inside it is pressed on its own.
  tile: {
    alignItems: 'center',
    backgroundColor: colour.washWarm,
    borderRadius: radius.md,
    height: MINIMUM_TAP_TARGET,
    justifyContent: 'center',
    width: MINIMUM_TAP_TARGET,
  },
});
