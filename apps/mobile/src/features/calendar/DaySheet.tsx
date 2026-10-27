import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon, CappedText as Text } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

/**
 * The card at the foot of the month. It names the day she pressed, says one sentence about it,
 * and carries the way to her whole period.
 *
 * A day she has lived also opens, from the round button at the right of the date, because a month
 * she can read and cannot correct a day in is a picture. A day ahead of her has no button: there is
 * nothing to record on a day that has not happened.
 *
 * A day she has lived also carries Record sex beside Edit my period, so she can record sex on that
 * day in one press from the month. The calendar board draws no such link: it is kept because the
 * way through the day page sat below the fold, and she did not find it.
 */

export const daySheetTestID = 'calendar-day-sheet';
export const daySheetLeadTestID = 'calendar-day-sheet-lead';
export const daySheetLineTestID = 'calendar-day-sheet-line';
/** The round button that carries the mark saying the day opens. */
export const daySheetOpenTestID = 'calendar-day-sheet-open';
export const daySheetRecordSexTestID = 'calendar-day-sheet-record-sex';

/** Points. The mark that says the day opens, at the size the other rows of Emi draw it. */
const OPENS_MARK_SIZE = 18;

interface Props {
  /** The date in words, which is the day she pressed. */
  readonly lead: string;
  /** One sentence about that day. */
  readonly line: string;
  /** What the open button is called for somebody listening. */
  readonly openLabel: string;
  /** Nothing on a day ahead of her, and then the card carries no open button. */
  readonly onOpen?: () => void;
  readonly editPeriodLabel: string;
  readonly editPeriodTestID: string;
  readonly onEditPeriod: () => void;
  readonly recordSexLabel: string;
  /** Nothing on a day ahead of her, and then the card carries no Record sex. */
  readonly onRecordSex?: () => void;
}

export function DaySheet({
  lead,
  line,
  openLabel,
  onOpen,
  editPeriodLabel,
  editPeriodTestID,
  onEditPeriod,
  recordSexLabel,
  onRecordSex,
}: Props): ReactNode {
  return (
    <View style={styles.card} testID={daySheetTestID}>
      <View style={styles.top}>
        <Text accessibilityRole="header" style={styles.lead} testID={daySheetLeadTestID}>
          {lead}
        </Text>
        {onOpen === undefined ? null : (
          <Pressable
            accessibilityLabel={openLabel}
            accessibilityRole="button"
            onPress={onOpen}
            style={styles.opens}
            testID={daySheetOpenTestID}
          >
            <Icon colour={colour.text} name="chevron" size={OPENS_MARK_SIZE} />
          </Pressable>
        )}
      </View>
      <Text style={styles.line} testID={daySheetLineTestID}>
        {line}
      </Text>
      <View style={styles.links}>
        <Pressable
          accessibilityRole="button"
          onPress={onEditPeriod}
          style={styles.link}
          testID={editPeriodTestID}
        >
          <Text style={styles.linkLabel}>{editPeriodLabel}</Text>
        </Pressable>
        {onRecordSex === undefined ? null : (
          <Pressable
            accessibilityRole="button"
            onPress={onRecordSex}
            style={styles.link}
            testID={daySheetRecordSexTestID}
          >
            <Text style={styles.linkLabel}>{recordSexLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colour.card,
    borderRadius: radius.xl,
    gap: space.spaceSm,
    padding: space.spaceLg,
    shadowColor: colour.text,
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  lead: {
    color: colour.text,
    flexShrink: 1,
    ...textStyle('headline-sm'),
  },
  line: {
    color: colour.text,
    ...textStyle('body-sm'),
  },
  link: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  links: { columnGap: space.spaceLg, flexDirection: 'row', flexWrap: 'wrap' },
  linkLabel: {
    color: colour.accent,
    ...textStyle('button-md'),
  },
  opens: {
    alignItems: 'center',
    backgroundColor: colour.field,
    borderRadius: radius.full,
    height: MINIMUM_TAP_TARGET,
    justifyContent: 'center',
    width: MINIMUM_TAP_TARGET,
  },
  top: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.spaceMd,
    justifyContent: 'space-between',
  },
});
