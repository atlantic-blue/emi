import { colour, radius, space, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { words } from '../../language';
import { SecondaryButton } from '../../components/Button';
import { RoundIconButton } from '../../components/RoundIconButton';
import { Screen } from '../../components/Screen';
import type { DayRefusal } from './editDay';

/**
 * A day she asked for and cannot have. An empty editor would be the wrong answer: she would pick a
 * flow, and Emi would hold a day she has not lived yet as a day she recorded.
 */
export const dayRefusedCopy: Readonly<Record<DayRefusal, { title: string; line: string }>> = {
  'day-is-in-the-future': {
    title: words('log.day.notYet.title'),
    line: words('log.day.notYet.line'),
  },
  'day-is-not-a-date': {
    title: words('log.day.notADay.title'),
    line: words('log.day.notADay.line'),
  },
};

export const dayRefusedBackLabel = words('log.day.back');
export const dayRefusedTestID = 'day-refused';
export const dayRefusedTitleTestID = 'day-refused-title';
export const dayRefusedLineTestID = 'day-refused-line';
export const dayRefusedBackTestID = 'day-refused-back';
export const dayRefusedChevronTestID = 'day-refused-chevron';
export const dayRefusedCalendarTestID = 'day-refused-calendar';

/** The set holds one chevron, pointing the way on, so the way back is the same drawing turned. */
const TURNED_AROUND = [{ rotate: '180deg' }] as const;

/** Points. The white disc the calendar sits in above the title, and the drawing inside it. */
const CALENDAR_DISC = 88;
const CALENDAR_ICON = 36;

interface Props {
  readonly refusal: DayRefusal;
  readonly onBack: () => void;
}

export function DayRefused({ refusal, onBack }: Props): ReactNode {
  const said = dayRefusedCopy[refusal];

  return (
    <Screen drawsTheWash testID={dayRefusedTestID}>
      <View style={styles.body}>
        <View style={styles.backMark}>
          <RoundIconButton
            accessibilityLabel={dayRefusedBackLabel}
            icon="chevron"
            onPress={onBack}
            testID={dayRefusedChevronTestID}
          />
        </View>
        <View style={styles.said}>
          <View style={styles.disc} testID={dayRefusedCalendarTestID}>
            <Icon colour={colour.secondaryText} name="calendar" size={CALENDAR_ICON} />
          </View>
          <Text accessibilityRole="header" style={styles.title} testID={dayRefusedTitleTestID}>
            {said.title}
          </Text>
          <Text style={styles.line} testID={dayRefusedLineTestID}>
            {said.line}
          </Text>
        </View>

        <View style={styles.foot}>
          <SecondaryButton
            label={dayRefusedBackLabel}
            onPress={onBack}
            testID={dayRefusedBackTestID}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backMark: { alignSelf: 'flex-start', transform: TURNED_AROUND },
  disc: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colour.card,
    borderRadius: radius.full,
    height: CALENDAR_DISC,
    justifyContent: 'center',
    marginBottom: space.spaceMd,
    width: CALENDAR_DISC,
  },
  body: {
    flex: 1,
    gap: space.spaceLg,
    paddingBottom: space.spaceXl,
    paddingHorizontal: space.margin,
    paddingTop: space.spaceMd,
  },
  // The calendar and the two sentences stand together in the upper middle of the glass, as the
  // board places them, with the way back at the top and again at the foot.
  said: { flexGrow: 1, paddingTop: CALENDAR_DISC },
  foot: { alignItems: 'center' },
  line: {
    color: colour.secondaryText,
    ...textStyle('body-lg'),
    textAlign: 'center',
  },
  title: {
    color: colour.text,
    ...textStyle('headline-lg'),
    marginBottom: space.spaceSm,
    textAlign: 'center',
  },
});
