import { colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CappedText as Text } from '@emi/ui';

import { PrimaryButton } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { words } from '../../language';
import { QuizHeader } from './QuizHeader';
import { ProductDrawing } from './ProductDrawing';
import { QuietLink } from './QuietLink';
import { Chevron } from './QuizCard';
import { type ProductSlug, productOf } from './products';
import { type FinishedQuiz, suggestProducts } from './quiz';

/**
 * The result of the quiz, from the hygieneQuizResult board (issue 306): two products, each with the
 * reason it is on the list, each opening its own page. It says that it is a suggestion and not
 * medical advice.
 */

export const quizResultTestID = 'hygiene-quiz-result';
export const quizResultHeadingTestID = 'hygiene-quiz-result-heading';
export const quizResultDisclaimerTestID = 'hygiene-quiz-result-disclaimer';
export const quizSeeAllTestID = 'hygiene-quiz-see-all';
export const quizAnswerAgainTestID = 'hygiene-quiz-answer-again';

export function quizSuggestionTestID(slug: ProductSlug): string {
  return `hygiene-quiz-suggestion-${slug}`;
}

/** Points, from the board. */
const TILE = 60;
const TILE_CORNER = 18;
const DRAWING = 30;

interface Props {
  readonly answers: FinishedQuiz;
  readonly onAnswerAgain: () => void;
  readonly onClose: () => void;
  readonly onOpen: (slug: ProductSlug) => void;
}

export function QuizResult({ answers, onAnswerAgain, onClose, onOpen }: Props): ReactNode {
  return (
    <Screen drawsTheWash testID={quizResultTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <QuizHeader onClose={onClose} />
        <View style={styles.top}>
          <Text style={styles.eyebrow}>{words('hygiene.quiz.eyebrow')}</Text>
          <Text accessibilityRole="header" style={styles.heading} testID={quizResultHeadingTestID}>
            {words('hygiene.quiz.heading')}
          </Text>
          <Text style={styles.disclaimer} testID={quizResultDisclaimerTestID}>
            {words('hygiene.quiz.disclaimer')}
          </Text>
        </View>
        {suggestProducts(answers).map(({ slug, why }) => {
          const name = productOf(slug).name;

          return (
            <Pressable
              accessibilityLabel={name}
              accessibilityRole="button"
              key={slug}
              onPress={() => onOpen(slug)}
              style={styles.row}
              testID={quizSuggestionTestID(slug)}
            >
              <View style={styles.tile}>
                <ProductDrawing colour={colour.ovulationInk} size={DRAWING} slug={slug} />
              </View>
              <View style={styles.words}>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.why}>{words(why)}</Text>
              </View>
              <Chevron />
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.foot}>
        <PrimaryButton
          label={words('hygiene.quiz.seeAll')}
          onPress={onClose}
          testID={quizSeeAllTestID}
        />
        <QuietLink
          label={words('hygiene.quiz.answerAgain')}
          onPress={onAnswerAgain}
          testID={quizAnswerAgainTestID}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.spaceLg, paddingHorizontal: space.margin, paddingVertical: space.spaceXl },
  disclaimer: { color: colour.secondaryText, ...textStyle('body-sm') },
  eyebrow: {
    color: colour.ovulationInk,
    textTransform: 'uppercase',
    ...textStyle('label-md'),
  },
  foot: { gap: space.spaceXs, paddingBottom: space.spaceXl, paddingHorizontal: space.margin },
  heading: { color: colour.text, ...textStyle('headline-lg') },
  name: { color: colour.text, ...textStyle('button-md') },
  row: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderRadius: radius.xl,
    flexDirection: 'row',
    gap: space.spaceMd,
    padding: space.spaceLg,
  },
  tile: {
    alignItems: 'center',
    backgroundColor: colour.washWarm,
    borderRadius: TILE_CORNER,
    height: TILE,
    justifyContent: 'center',
    width: TILE,
  },
  top: { gap: space.spaceSm },
  why: { color: colour.secondaryText, ...textStyle('body-sm') },
  words: { flex: 1, gap: space.spaceXs },
});
