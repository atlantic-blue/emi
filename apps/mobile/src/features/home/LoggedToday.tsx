import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { homeCopy } from './copy';

/**
 * The row under the phase line that reads back what she marked today.
 *
 * It opens the log on the symptom groups, which is where she came from, so the way to correct what
 * she just recorded is the thing she is looking at rather than a second walk through the actions.
 *
 * The line takes the small size because a flow is named in it and contract SCREEN-2 holds the four
 * words a stranger would recognise under 14 points on this screen.
 */

export const loggedTodayTestID = 'home-logged-today';
export const loggedTodayLeadTestID = 'home-logged-today-lead';
export const loggedTodayLineTestID = 'home-logged-today-line';

/** Points. The mark that says the row opens something, at the size the other rows of Emi draw it. */
const OPENS_MARK_SIZE = 18;

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
    color: colour.text,
    ...textStyle('body-lg'),
  },
  line: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
  },
  row: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: space.spaceMd,
    justifyContent: 'space-between',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceMd,
    paddingVertical: space.spaceSm,
  },
  // The words take the room the mark leaves, so a long line wraps inside the row rather than
  // pushing the mark off the right of the screen.
  said: { flexShrink: 1, rowGap: space.spaceXs },
});
