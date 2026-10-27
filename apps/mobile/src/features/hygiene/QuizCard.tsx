import { colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CappedText as Text } from '@emi/ui';
import Svg, { Circle, Path } from 'react-native-svg';

import { words } from '../../language';

/**
 * The "Find a product to try" card at the foot of the hygieneProducts board (issue 306). It opens
 * the quiz.
 */

export const quizCardTestID = 'hygiene-quiz-card';

/** Points, from the board. */
const MARK = 44;
const MARK_CORNER = 14;
const DRAWING = 22;
const CHEVRON = 18;
const STROKE = 1.9;

interface Props {
  readonly onOpen: () => void;
}

export function QuizCard({ onOpen }: Props): ReactNode {
  const title = words('hygiene.quiz.title');

  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      onPress={onOpen}
      style={styles.card}
      testID={quizCardTestID}
    >
      <View style={styles.mark}>
        <Svg
          fill="none"
          height={DRAWING}
          stroke={colour.accent}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={STROKE}
          viewBox="0 0 24 24"
          width={DRAWING}
        >
          <Circle cx={12} cy={12} r={8.5} />
          <Path d="M9.6 9.5a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2-2.4 3.5" />
          <Path d="M12 17h.01" />
        </Svg>
      </View>
      <View style={styles.words}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.line}>{words('hygiene.quiz.card.line')}</Text>
      </View>
      <Chevron />
    </Pressable>
  );
}

/** The chevron at the end of a row that opens something, as the boards draw it. */
export function Chevron(): ReactNode {
  return (
    <Svg
      fill="none"
      height={CHEVRON}
      stroke={colour.secondaryText}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={STROKE}
      viewBox="0 0 24 24"
      width={CHEVRON}
    >
      <Path d="M9 5l7 7-7 7" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderRadius: radius.xl,
    flexDirection: 'row',
    gap: space.spaceMd,
    padding: space.spaceMd,
  },
  line: { color: colour.secondaryText, ...textStyle('body-sm') },
  mark: {
    alignItems: 'center',
    backgroundColor: colour.accentSoft,
    borderRadius: MARK_CORNER,
    height: MARK,
    justifyContent: 'center',
    width: MARK,
  },
  title: { color: colour.text, ...textStyle('button-md') },
  words: { flex: 1, gap: space.spaceXs },
});
