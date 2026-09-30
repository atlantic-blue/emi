import { MINIMUM_TAP_TARGET, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export function yearTestID(year: number): string {
  return `year-${year}`;
}

export const yearWheelTestID = 'year-wheel';

/** Points. One year takes the tap floor exactly, so the travel to a year is its place times this. */
export const YEAR_ROW_HEIGHT = MINIMUM_TAP_TARGET;

/** Points. Six years are in front of her at once, which is what the document draws. */
const WHEEL_HEIGHT = 6 * YEAR_ROW_HEIGHT;

/** Points. The travel that leaves the year in place `at` in the middle of the six she is shown. */
function travelToTheMiddle(at: number): number {
  return Math.max(0, at * YEAR_ROW_HEIGHT + YEAR_ROW_HEIGHT / 2 - WHEEL_HEIGHT / 2);
}

interface Props {
  /** The years the wheel offers, newest first, which is the order she reads them in. */
  readonly years: readonly number[];
  readonly chosen: number | undefined;
  /**
   * Where the wheel opens when nothing is chosen. A list that opened on its oldest year, or on its
   * newest, would ask most women to travel a long way before they reached a year they could have
   * been born in.
   */
  readonly opensOn: number;
  /** How one year is read out, which is a word from the catalogue and never built here. */
  readonly labelOf: (year: number) => string;
  readonly onChoose: (year: number) => void;
}

interface YearProps {
  readonly year: number;
  readonly chosen: boolean;
  readonly label: string;
  readonly onChoose: (year: number) => void;
}

/**
 * One year of the wheel. The year she chose is marked by its ground and by the weight of the
 * number, because colour is never the only cue, which is design section 3.
 */
function Year({ year, chosen, label, onChoose }: YearProps): ReactNode {
  return (
    <Pressable
      accessibilityLabel={label}
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
 * The years she picks one of, and the control both the question and the way back to it borrow.
 *
 * The wheel opens on the year she already picked, so coming back to this question does not send
 * her down the list a second time to find it.
 */
export function YearWheel({ years, chosen, opensOn, labelOf, onChoose }: Props): ReactNode {
  const openedAt = years.indexOf(chosen ?? opensOn);
  const travelled =
    chosen === undefined ? travelToTheMiddle(openedAt) : Math.max(0, openedAt) * YEAR_ROW_HEIGHT;

  return (
    <View style={styles.well}>
      <ScrollView
        contentOffset={{ x: 0, y: travelled }}
        style={styles.wheel}
        testID={yearWheelTestID}
      >
        {years.map((year) => (
          <Year
            chosen={year === chosen}
            key={year}
            label={labelOf(year)}
            onChoose={onChoose}
            year={year}
          />
        ))}
      </ScrollView>
    </View>
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
