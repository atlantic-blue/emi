import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon, CappedText as Text } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { greeting, homeCopy, initialOf } from './copy';

/**
 * The top bar of Today: her initial on the left, the word and the greeting in the middle, and the
 * calendar on the right. The calendar button is the way from Today to her month.
 */

export const homeHeaderTestID = 'home-header';
export const homeHeaderAvatarTestID = 'home-header-avatar';
export const homeHeaderWordTestID = 'home-header-word';
export const homeGreetingTestID = 'home-greeting';
export const homeCalendarTestID = 'home-calendar';

/** Points. The drawing of the person where she gave no name, and of the calendar. */
const theIconInADisc = 22;

interface Props {
  /** The name in her profile, and nothing at all where she skipped the question or gave none. */
  readonly name?: string;
  /** The way to her month. The button is not drawn where the caller offers none. */
  readonly onOpenCalendar?: () => void;
}

export function HomeHeader({ name, onOpenCalendar }: Props): ReactNode {
  const initial = initialOf(name);

  return (
    <View style={styles.header} testID={homeHeaderTestID}>
      <View accessible={false} style={styles.avatar} testID={homeHeaderAvatarTestID}>
        {initial === undefined ? (
          <Icon colour={colour.accent} name="person" size={theIconInADisc} />
        ) : (
          <Text style={styles.initial}>{initial}</Text>
        )}
      </View>

      <View style={styles.middle}>
        <Text accessibilityRole="header" style={styles.word} testID={homeHeaderWordTestID}>
          {homeCopy.wordmark}
        </Text>
        <Text style={styles.greeting} testID={homeGreetingTestID}>
          {greeting(name)}
        </Text>
      </View>

      {onOpenCalendar === undefined ? (
        <View style={styles.disc} />
      ) : (
        <Pressable
          accessibilityLabel={homeCopy.calendar}
          accessibilityRole="button"
          onPress={onOpenCalendar}
          style={[styles.disc, styles.calendar]}
          testID={homeCalendarTestID}
        >
          <Icon colour={colour.text} name="calendar" size={theIconInADisc} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderRadius: radius.full,
    height: MINIMUM_TAP_TARGET,
    justifyContent: 'center',
    width: MINIMUM_TAP_TARGET,
  },
  calendar: { backgroundColor: colour.card },
  disc: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: MINIMUM_TAP_TARGET,
    justifyContent: 'center',
    width: MINIMUM_TAP_TARGET,
  },
  greeting: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
  },
  header: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.spaceLg,
    paddingHorizontal: space.margin,
  },
  initial: {
    color: colour.accent,
    ...textStyle('headline-sm'),
  },
  middle: { alignItems: 'center', flexShrink: 1 },
  word: {
    color: colour.accent,
    ...textStyle('headline-md'),
  },
});
