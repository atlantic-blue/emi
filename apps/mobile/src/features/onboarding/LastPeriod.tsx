import { MINIMUM_TAP_TARGET, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@emi/ui';
import { Calendar } from './Calendar';
import { OnboardingScreen } from './OnboardingScreen';
import { firstRunCopy } from './copy';
import { dayLabel, daysBackFrom, localDay } from './days';
import { oldestPeriodStart, periodStartIsInRange } from './firstRun';

/** The named answers sit beside the grid, so pressing today is not a search through the squares. */
export function namedDayTestID(day: string): string {
  return `named-day-${day}`;
}

export const chosenNameMarkTestID = 'named-day-chosen-mark';

/** Points. The tick sits beside a word in a pill, so it is drawn at the size of the word. */
const NAME_MARK_SIZE = 16;

interface Props {
  readonly now: Date;
  readonly chosen: string | undefined;
  readonly onChoose: (day: string) => void;
  readonly onContinue: () => void;
  readonly onBack: () => void;
}

/**
 * The day her last period started, picked from a calendar rather than typed.
 *
 * It is the one question with no way past it. SCREEN-1 makes this answer the one the first run
 * cannot do without, so the frame is given no Skip and the button waits until she has picked a day.
 */
export function LastPeriod({ now, chosen, onChoose, onContinue, onBack }: Props): ReactNode {
  const today = localDay(now);

  return (
    <OnboardingScreen
      actionIsReady={chosen !== undefined}
      actionLabel={firstRunCopy.lastPeriod.action}
      lines={firstRunCopy.lastPeriod.lines}
      onAction={onContinue}
      onBack={onBack}
      screen="lastPeriod"
      title={firstRunCopy.lastPeriod.title}
    >
      <View style={styles.named}>
        {daysBackFrom(today, 2).map((day) => {
          const isChosen = day === chosen;

          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: isChosen }}
              key={day}
              onPress={() => onChoose(day)}
              style={isChosen ? [styles.name, styles.nameChosen] : styles.name}
              testID={namedDayTestID(day)}
            >
              <Text
                style={isChosen ? [styles.nameLabel, styles.nameChosenLabel] : styles.nameLabel}
              >
                {dayLabel(day, today)}
              </Text>
              {isChosen ? (
                <View testID={chosenNameMarkTestID}>
                  <Icon colour={colour.surfaceContainerLowest} name="check" size={NAME_MARK_SIZE} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Calendar
        canChoose={(day) => periodStartIsInRange(day, today)}
        chosen={chosen}
        earliest={oldestPeriodStart(today)}
        latest={today}
        onChoose={onChoose}
        opensOn={today}
        today={today}
      />
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  name: {
    alignItems: 'center',
    backgroundColor: colour.surfaceContainerLowest,
    borderColor: colour.outlineVariant,
    borderRadius: radius.full,
    borderWidth: stroke.icon,
    flex: 1,
    flexDirection: 'row',
    gap: space.spaceSm,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceMd,
  },
  nameChosen: { backgroundColor: colour.surfaceTint, borderColor: colour.onPrimaryFixedVariant },
  nameChosenLabel: { color: colour.surfaceContainerLowest },
  nameLabel: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-lg'),
  },
  named: { flexDirection: 'row', gap: space.spaceSm, marginTop: space.spaceSm },
});
