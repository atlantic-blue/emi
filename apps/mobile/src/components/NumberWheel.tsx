import { MINIMUM_TAP_TARGET, colour, radius, textStyle } from '@emi/tokens';
import { type ReactNode, useRef, useState } from 'react';
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

/** Points. Taller than the tap floor, so the number in the pill has room for its larger type. */
export const WHEEL_ROW_HEIGHT = MINIMUM_TAP_TARGET + 8;

/** Rows above and below the middle one. The design draws two each side. */
export const ROWS_EACH_SIDE = 2;

const WHEEL_HEIGHT = (ROWS_EACH_SIDE * 2 + 1) * WHEEL_ROW_HEIGHT;

/** Points. The room above the first number and under the last, so either one can reach the middle. */
const ROOM_AT_EACH_END = ROWS_EACH_SIDE * WHEEL_ROW_HEIGHT;

function travelTo(at: number): number {
  return Math.max(0, at) * WHEEL_ROW_HEIGHT;
}

interface Props {
  /** The numbers the wheel offers, in the order she reads them from the top. */
  readonly values: readonly number[];
  readonly chosen: number | undefined;
  /** Where the wheel opens when nothing is chosen. It is a place to start and never an answer. */
  readonly opensOn: number;
  /** How the chosen number is read out, which is a word from the catalogue and never built here. */
  readonly labelOf: (value: number) => string;
  readonly onChoose: (value: number) => void;
  readonly testIDOf: (value: number) => string;
  readonly testID: string;
  readonly pillTestID: string;
}

interface RowProps {
  readonly value: number;
  readonly away: number;
  readonly chosen: boolean;
  readonly label: string;
  readonly onPress: (value: number) => void;
  readonly testID: string;
}

function readingFor(away: number): TextStyle {
  if (away === 0) {
    return styles.middleReading;
  }

  return away === 1 ? styles.nearReading : styles.farReading;
}

/**
 * One number of the wheel. The chosen one reads with its words, "Born in 1990" or "28 days", so the
 * choice is carried by the words as well as by the ground, because colour is never the only cue.
 */
function Row({ value, away, chosen, label, onPress, testID }: RowProps): ReactNode {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ selected: chosen }}
      onPress={() => onPress(value)}
      style={styles.row}
      testID={testID}
    >
      <Text style={readingFor(away)}>{chosen ? label : value}</Text>
    </Pressable>
  );
}

/**
 * A wheel of whole numbers that settles on one in the pill.
 *
 * The number it opens on is only a place to start: nothing is chosen until she turns it or taps a
 * number, so a screen built on it never keeps a number she did not pick. Coming back, it opens on
 * the number she already picked.
 *
 * iOS also reports a scroll end after the scroll a tap starts and when the wheel leaves the window,
 * so only a scroll end after a drag is a choice. The offset prop stays fixed: a new offset sent
 * while a tap scrolls the wheel moves it a second time, past the tapped row.
 */
export function NumberWheel({
  values,
  chosen,
  opensOn,
  labelOf,
  onChoose,
  testIDOf,
  testID,
  pillTestID,
}: Props): ReactNode {
  const wheel = useRef<ScrollView>(null);
  const isTurning = useRef(false);
  const middle = Math.max(0, values.indexOf(chosen ?? opensOn));
  const [opensAt] = useState(() => ({ x: 0, y: travelTo(middle) }));

  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    if (!isTurning.current) {
      return;
    }
    isTurning.current = false;

    const at = Math.round(event.nativeEvent.contentOffset.y / WHEEL_ROW_HEIGHT);
    const value = values[Math.min(Math.max(at, 0), values.length - 1)];

    if (value !== undefined && value !== chosen) {
      onChoose(value);
    }
  };

  const pressed = (value: number): void => {
    isTurning.current = false;
    wheel.current?.scrollTo({ animated: true, y: travelTo(values.indexOf(value)) });
    onChoose(value);
  };

  return (
    <View style={styles.well}>
      <View pointerEvents="none" style={styles.pill} testID={pillTestID} />
      <ScrollView
        contentContainerStyle={styles.list}
        contentOffset={opensAt}
        decelerationRate="fast"
        onMomentumScrollEnd={settle}
        onScrollBeginDrag={() => {
          isTurning.current = true;
        }}
        ref={wheel}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ROW_HEIGHT}
        style={styles.wheel}
        testID={testID}
      >
        {values.map((value, at) => (
          <Row
            away={Math.abs(at - middle)}
            chosen={value === chosen}
            key={value}
            label={labelOf(value)}
            onPress={pressed}
            testID={testIDOf(value)}
            value={value}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  // The pill stands still behind the numbers, and the number that settles in it is the one she reads.
  pill: {
    backgroundColor: colour.accentSoft,
    borderRadius: radius.lg,
    height: WHEEL_ROW_HEIGHT,
    left: 0,
    position: 'absolute',
    right: 0,
    top: ROOM_AT_EACH_END,
  },
  row: {
    alignItems: 'center',
    height: WHEEL_ROW_HEIGHT,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  well: { justifyContent: 'center' },
  wheel: { height: WHEEL_HEIGHT },
});
