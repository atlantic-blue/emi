import { colour, radius, space, stroke, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CappedText as Text } from '@emi/ui';

/**
 * One answer of the quiz, as the hygieneQuiz board draws it: a white row with a radio ring at the
 * start. The answer she picks fills with the soft accent, takes a thicker accent edge and a dot in
 * the ring, so colour is never the only cue.
 */

interface Props {
  readonly label: string;
  readonly isChosen: boolean;
  readonly onPress: () => void;
  readonly testID: string;
}

/** Points, from the board. */
const ROW_HEIGHT = 56;
const ROW_CORNER = 16;
const RING = 20;
const DOT = 10;
const CHOSEN_EDGE = 2;
const RING_EDGE = 1.5;

export function quizRingTestID(testID: string): string {
  return `${testID}-ring`;
}

export function QuizChoiceRow({ label, isChosen, onPress, testID }: Props): ReactNode {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: isChosen }}
      onPress={onPress}
      style={isChosen ? [styles.row, styles.rowChosen] : styles.row}
      testID={testID}
    >
      <View
        style={isChosen ? [styles.ring, styles.ringChosen] : styles.ring}
        testID={quizRingTestID(testID)}
      >
        {isChosen ? <View style={styles.dot} /> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dot: { backgroundColor: colour.accent, borderRadius: radius.full, height: DOT, width: DOT },
  label: { color: colour.text, flex: 1, ...textStyle('button-md') },
  ring: {
    alignItems: 'center',
    borderColor: colour.secondaryText,
    borderRadius: radius.full,
    borderWidth: RING_EDGE,
    height: RING,
    justifyContent: 'center',
    width: RING,
  },
  ringChosen: { borderColor: colour.accent },
  row: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderColor: colour.line,
    borderRadius: ROW_CORNER,
    borderWidth: stroke.hairline,
    flexDirection: 'row',
    gap: space.spaceMd,
    minHeight: ROW_HEIGHT,
    paddingHorizontal: space.spaceLg,
  },
  rowChosen: {
    backgroundColor: colour.accentSoft,
    borderColor: colour.accent,
    borderWidth: CHOSEN_EDGE,
  },
});
