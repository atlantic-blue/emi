import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * The sheet at the foot of the month. It names the day she pressed and opens it.
 *
 * A month she can read and cannot open is a picture, and this row is the way out of it: one press
 * on the day, one press on the sheet, and she is on the day she wants to correct.
 *
 * The line under the date takes the small size because a flow is named in it, and contract
 * SCREEN-2 holds the four words a stranger would recognise under 14 points.
 *
 * The whole row takes the press, and the round mark at the end of it says so. A mark that took a
 * press of its own would put a second target inside a target she has already found.
 */

export const daySheetTestID = 'calendar-day-sheet';
export const daySheetLeadTestID = 'calendar-day-sheet-lead';
export const daySheetLineTestID = 'calendar-day-sheet-line';
/** The round button that carries the mark saying the day opens. */
export const daySheetOpenTestID = 'calendar-day-sheet-open';

/** Points. The mark that says the row opens something, at the size the other rows of Emi draw it. */
const OPENS_MARK_SIZE = 18;

/** Points. The round button the mark sits in, which is the floor SEE-3 sets for a thumb. */
const THE_MARK_SITS_IN = MINIMUM_TAP_TARGET;

interface Props {
  /** The date in words, which is the day she pressed. */
  readonly lead: string;
  /** Her cycle day, the phase, and what she marked. Nothing where none of the three is known. */
  readonly line?: string;
  readonly onPress: () => void;
}

export function DaySheet({ lead, line, onPress }: Props): ReactNode {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.row}
      testID={daySheetTestID}
    >
      <View style={styles.said}>
        <Text style={styles.lead} testID={daySheetLeadTestID}>
          {lead}
        </Text>
        {line === undefined ? null : (
          <Text style={styles.line} testID={daySheetLineTestID}>
            {line}
          </Text>
        )}
      </View>
      <View style={styles.opens} testID={daySheetOpenTestID}>
        <Icon colour={colour.text} name="chevron" size={OPENS_MARK_SIZE} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The date is the heading of the panel she just opened, so it carries the weight a heading does
  // rather than the weight of a row in a list.
  lead: {
    color: colour.text,
    ...textStyle('headline-sm'),
  },
  line: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
  },
  opens: {
    alignItems: 'center',
    backgroundColor: colour.field,
    borderRadius: radius.full,
    height: THE_MARK_SITS_IN,
    justifyContent: 'center',
    width: THE_MARK_SITS_IN,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.spaceMd,
    justifyContent: 'space-between',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  // The words take the room the mark leaves, so a long line wraps inside the row rather than
  // pushing the mark off the right of the screen.
  said: { flexShrink: 1, rowGap: space.spaceXs },
});
