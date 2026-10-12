import { MINIMUM_TAP_TARGET, colour, radius, textStyle } from '@emi/tokens';
import { type ReactNode, useRef } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextStyle,
  View,
} from 'react-native';

export function yearTestID(year: number): string {
  return `year-${year}`;
}

export const yearWheelTestID = 'year-wheel';
export const yearWheelPillTestID = 'year-wheel-pill';

/** Points. Taller than the tap floor, so the year in the pill has room for its larger type. */
export const YEAR_ROW_HEIGHT = MINIMUM_TAP_TARGET + 8;

/** Rows above and below the middle one. The design draws two each side. */
export const YEARS_EACH_SIDE = 2;

/** Points. Five years are in front of her at once, which is what the design draws. */
const WHEEL_HEIGHT = (YEARS_EACH_SIDE * 2 + 1) * YEAR_ROW_HEIGHT;

/** Points. The room above the first year and under the last, so either one can reach the middle. */
const ROOM_AT_EACH_END = YEARS_EACH_SIDE * YEAR_ROW_HEIGHT;

/** The travel that puts the year in place `at` in the pill. */
function travelTo(at: number): number {
  return Math.max(0, at) * YEAR_ROW_HEIGHT;
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
  /** How many rows this year is from the one in the pill. */
  readonly away: number;
  readonly chosen: boolean;
  readonly label: string;
  readonly onPress: (year: number) => void;
}

function readingFor(away: number, chosen: boolean): TextStyle {
  if (away === 0) {
    return chosen ? styles.chosenReading : styles.middleReading;
  }

  return away === 1 ? styles.nearReading : styles.farReading;
}

/**
 * One year of the wheel. The year she chose sits in the pill and reads "Born in" before it, so the
 * choice is carried by the words and the weight as well as by the ground, because colour is never
 * the only cue.
 */
function Year({ year, away, chosen, label, onPress }: YearProps): ReactNode {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ selected: chosen }}
      onPress={() => onPress(year)}
      style={styles.year}
      testID={yearTestID(year)}
    >
      <Text style={readingFor(away, chosen)}>{chosen ? label : year}</Text>
    </Pressable>
  );
}

/**
 * The years she picks one of, and the control both the question and the way back to it borrow.
 *
 * It turns like a wheel and settles on a year in the pill. The year it opens on is only a place to
 * start: nothing is chosen until she turns it or taps a year, so the screen never keeps a year she
 * did not pick. Coming back, it opens on the year she already picked.
 */
export function YearWheel({ years, chosen, opensOn, labelOf, onChoose }: Props): ReactNode {
  const wheel = useRef<ScrollView>(null);
  const middle = Math.max(0, years.indexOf(chosen ?? opensOn));

  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const at = Math.round(event.nativeEvent.contentOffset.y / YEAR_ROW_HEIGHT);
    const year = years[Math.min(Math.max(at, 0), years.length - 1)];

    if (year !== undefined && year !== chosen) {
      onChoose(year);
    }
  };

  const pressed = (year: number): void => {
    wheel.current?.scrollTo({ animated: true, y: travelTo(years.indexOf(year)) });
    onChoose(year);
  };

  return (
    <View style={styles.well}>
      <View pointerEvents="none" style={styles.pill} testID={yearWheelPillTestID} />
      <ScrollView
        contentContainerStyle={styles.list}
        contentOffset={{ x: 0, y: travelTo(middle) }}
        decelerationRate="fast"
        onMomentumScrollEnd={settle}
        ref={wheel}
        showsVerticalScrollIndicator={false}
        snapToInterval={YEAR_ROW_HEIGHT}
        style={styles.wheel}
        testID={yearWheelTestID}
      >
        {years.map((year, at) => (
          <Year
            away={Math.abs(at - middle)}
            chosen={year === chosen}
            key={year}
            label={labelOf(year)}
            onPress={pressed}
            year={year}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chosenReading: {
    color: colour.text,
    ...textStyle('headline-lg'),
  },
  farReading: {
    color: colour.pickerFar,
    ...textStyle('body-lg'),
  },
  list: { paddingVertical: ROOM_AT_EACH_END },
  middleReading: {
    color: colour.text,
    ...textStyle('headline-lg'),
  },
  nearReading: {
    color: colour.pickerNear,
    ...textStyle('headline-md'),
  },
  // The pill stands still behind the years, and the year that settles in it is the one she reads.
  pill: {
    backgroundColor: colour.accentSoft,
    borderRadius: radius.lg,
    height: YEAR_ROW_HEIGHT,
    left: 0,
    position: 'absolute',
    right: 0,
    top: ROOM_AT_EACH_END,
  },
  well: { justifyContent: 'center' },
  wheel: { height: WHEEL_HEIGHT },
  year: {
    alignItems: 'center',
    height: YEAR_ROW_HEIGHT,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
});
