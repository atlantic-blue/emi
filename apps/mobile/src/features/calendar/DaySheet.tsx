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
 */

export const daySheetTestID = 'calendar-day-sheet';
export const daySheetLeadTestID = 'calendar-day-sheet-lead';
export const daySheetLineTestID = 'calendar-day-sheet-line';
/** The round button that carries the mark saying the day opens. */
export const daySheetOpenTestID = 'calendar-day-sheet-open';

/** Points. The mark that says the row opens something, at the size the other rows of Emi draw it. */
const OPENS_MARK_SIZE = 18;

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
    marginTop: space.spaceMd,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceMd,
    paddingVertical: space.spaceSm,
  },
  // The words take the room the mark leaves, so a long line wraps inside the row rather than
  // pushing the mark off the right of the screen.
  said: { flexShrink: 1, rowGap: space.spaceXs },
});
