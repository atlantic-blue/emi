import { MINIMUM_TAP_TARGET, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { OnboardingScreen } from './OnboardingScreen';
import { birthYearLabel, firstRunCopy } from './copy';
import { birthYearsOffered } from './firstRun';

export function yearTestID(year: number): string {
  return `year-${year}`;
}

export const yearWheelTestID = 'year-wheel';

/** Points. One year takes the tap floor exactly, so the travel to a year is its place times this. */
export const YEAR_ROW_HEIGHT = MINIMUM_TAP_TARGET;

/** Points. Six years are in front of her at once, which is what the document draws. */
const WHEEL_HEIGHT = 6 * YEAR_ROW_HEIGHT;

interface Props {
  readonly now: Date;
  readonly chosen: number | undefined;
  readonly onChoose: (year: number) => void;
  readonly onContinue: () => void;
  readonly onSkip: () => void;
  readonly onBack: () => void;
}

interface YearProps {
  readonly year: number;
  readonly chosen: boolean;
  readonly onChoose: (year: number) => void;
}

/**
 * One year of the wheel. The year she chose is marked by its ground and by the weight of the
 * number, because colour is never the only cue, which is design section 3.
 */
function Year({ year, chosen, onChoose }: YearProps): ReactNode {
  return (
    <Pressable
      accessibilityLabel={birthYearLabel(year)}
      accessibilityRole="radio"
      accessibilityState={{ selected: chosen }}
      onPress={() => onChoose(year)}
      style={chosen ? [styles.year, styles.chosen] : styles.year}
      testID={yearTestID(year)}
    >
      <Text style={chosen ? styles.chosenReading : styles.reading}>{year}</Text>
    </Pressable>
  );
}

/**
 * The year she was born, and the one question in Emi whose answer nothing reads. Contract
 * SCREEN-1 names it as the exception, so the screen says so rather than inventing a use for it.
 *
 * The wheel runs newest first. A list that opened on 1940 would ask every woman to travel eighty
 * years before she reached one she could have been born in.
 *
 * Nothing is chosen when she arrives, so Continue waits for a year. The Skip above it is the way
 * past, and it writes nothing.
 */
export function YearOfBirth({
  now,
  chosen,
  onChoose,
  onContinue,
  onSkip,
  onBack,
}: Props): ReactNode {
  const years = birthYearsOffered(now);
  const chosenAt = chosen === undefined ? 0 : years.indexOf(chosen);

  return (
    <OnboardingScreen
      actionIsReady={chosen !== undefined}
      actionLabel={firstRunCopy.birthYear.action}
      lines={firstRunCopy.birthYear.lines}
      onAction={onContinue}
      onBack={onBack}
      onSkip={onSkip}
      screen="birthYear"
      title={firstRunCopy.birthYear.title}
    >
      <View style={styles.well}>
        {/* The wheel opens on the year she already picked, so coming back to this question does
            not send her down the list a second time to find it. */}
        <ScrollView
          contentOffset={{ x: 0, y: chosenAt * YEAR_ROW_HEIGHT }}
          style={styles.wheel}
          testID={yearWheelTestID}
        >
          {years.map((year) => (
            <Year chosen={year === chosen} key={year} onChoose={onChoose} year={year} />
          ))}
        </ScrollView>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  chosen: { backgroundColor: colour.secondaryContainer },
  chosenReading: {
    color: colour.onSurface,
    ...textStyle('headline-md'),
  },
  reading: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-lg'),
  },
  well: {
    backgroundColor: colour.surfaceContainerLowest,
    borderColor: colour.outlineVariant,
    borderRadius: radius.xl,
    borderWidth: stroke.hairline,
    padding: space.spaceSm,
  },
  wheel: { height: WHEEL_HEIGHT },
  year: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: YEAR_ROW_HEIGHT,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
});
