import { MINIMUM_TAP_TARGET, colour, radius, space, typeScale } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OnboardingScreen } from './OnboardingScreen';
import { firstRunCopy } from './copy';
import { dayLabel, daysBackFrom, localDay } from './days';
import { longestLookBackDays } from './firstRun';

export function dayTestID(day: string): string {
  return `day-${day}`;
}

interface Props {
  readonly now: Date;
  readonly chosen: string | undefined;
  readonly onChoose: (day: string) => void;
  readonly onContinue: () => void;
}

/**
 * Screen two of three. She picks a day from a list rather than typing one, so the first run holds
 * to its own promise that she is never asked to fill a field in.
 */
export function LastPeriod({ now, chosen, onChoose, onContinue }: Props): ReactNode {
  const today = localDay(now);
  const days = daysBackFrom(today, longestLookBackDays + 1);

  return (
    <OnboardingScreen
      actionIsReady={chosen !== undefined}
      actionLabel={firstRunCopy.lastPeriod.action}
      lines={firstRunCopy.lastPeriod.lines}
      onAction={onContinue}
      screen="lastPeriod"
      title={firstRunCopy.lastPeriod.title}
    >
      <View>
        {days.map((day) => {
          const isChosen = day === chosen;

          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: isChosen }}
              key={day}
              onPress={() => onChoose(day)}
              style={isChosen ? [styles.day, styles.dayChosen] : styles.day}
              testID={dayTestID(day)}
            >
              <Text style={isChosen ? [styles.dayLabel, styles.dayLabelChosen] : styles.dayLabel}>
                {dayLabel(day, today)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  day: {
    backgroundColor: colour.sunk,
    borderRadius: radius.chip,
    justifyContent: 'center',
    marginBottom: space.tight,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.snug,
  },
  dayChosen: { backgroundColor: colour.emberTint },
  dayLabel: {
    color: colour.body,
    fontSize: typeScale.body.size,
    lineHeight: typeScale.body.lineHeight,
  },
  dayLabelChosen: { color: colour.ink },
});
