import { colour, radius, space, textStyle } from '@emi/tokens';
import { type ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { words } from '../../language';
import { QuizChoiceRow } from './QuizChoiceRow';
import { QuizHeader } from './QuizHeader';
import { QuizResult } from './QuizResult';
import { QuietLink } from './QuietLink';
import type { ProductSlug } from './products';
import {
  type QuizAnswers,
  type QuizChoice,
  type QuizQuestion,
  choiceWord,
  isFinished,
  questionWord,
  quizChoices,
  quizQuestions,
} from './quiz';

/**
 * "Find a product to try", from the hygieneQuiz board (issue 306): four questions, one on each
 * screen, then the hygieneQuizResult board. Next waits until she picks an answer, so no answer is
 * ever one she did not give. The answers live in this screen only and nothing is saved.
 */

export const quizTestID = 'hygiene-quiz';
export const quizCounterTestID = 'hygiene-quiz-counter';
export const quizQuestionTestID = 'hygiene-quiz-question';
export const quizPrivacyTestID = 'hygiene-quiz-privacy';
export const quizNextTestID = 'hygiene-quiz-next';
export const quizBackTestID = 'hygiene-quiz-back';

export function quizChoiceTestID(question: QuizQuestion, choice: string): string {
  return `hygiene-quiz-${question}-${choice}`;
}

export function quizStepTestID(index: number): string {
  return `hygiene-quiz-step-${String(index)}`;
}

/** Points, from the board. */
const STEP_HEIGHT = 6;

interface Props {
  readonly onClose: () => void;
  readonly onOpen: (slug: ProductSlug) => void;
}

export function HygieneQuiz({ onClose, onOpen }: Props): ReactNode {
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [step, setStep] = useState(0);
  const question = quizQuestions[step];

  if (question === undefined && isFinished(answers)) {
    return (
      <QuizResult
        answers={answers}
        onAnswerAgain={() => {
          setAnswers({});
          setStep(0);
        }}
        onClose={onClose}
        onOpen={onOpen}
      />
    );
  }

  const asked = question ?? quizQuestions[0];

  return (
    <Screen drawsTheWash testID={quizTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <QuizHeader onClose={onClose} />
        <Counter step={step} />
        <Text accessibilityRole="header" style={styles.question} testID={quizQuestionTestID}>
          {words(questionWord(asked))}
        </Text>
        <Text style={styles.privacy} testID={quizPrivacyTestID}>
          {words('hygiene.quiz.privacy')}
        </Text>
        <View style={styles.choices}>
          {(quizChoices[asked] as readonly QuizChoice<typeof asked>[]).map((choice) => (
            <QuizChoiceRow
              isChosen={answers[asked] === choice}
              key={choice}
              label={words(choiceWord(asked, choice))}
              onPress={() => setAnswers((now) => ({ ...now, [asked]: choice }))}
              testID={quizChoiceTestID(asked, choice)}
            />
          ))}
        </View>
      </ScrollView>
      <View style={styles.foot}>
        <PrimaryButton
          isReady={answers[asked] !== undefined}
          label={words('hygiene.quiz.next')}
          onPress={() => setStep(step + 1)}
          testID={quizNextTestID}
        />
        {step > 0 ? (
          <QuietLink
            label={words('hygiene.quiz.back')}
            onPress={() => setStep(step - 1)}
            testID={quizBackTestID}
          />
        ) : null}
      </View>
    </Screen>
  );
}

/** "Question 2 of 4" and the four short bars under it, filled up to the question she is on. */
function Counter({ step }: { readonly step: number }): ReactNode {
  const total = quizQuestions.length;
  const said = words('hygiene.quiz.counter', undefined, {
    step: String(step + 1),
    total: String(total),
  });

  return (
    <View style={styles.counter}>
      <Text style={styles.counterWords} testID={quizCounterTestID}>
        {said}
      </Text>
      <View accessibilityLabel={said} accessibilityRole="progressbar" style={styles.steps}>
        {quizQuestions.map((asked, index) => (
          <View
            key={asked}
            style={[styles.step, index <= step ? styles.stepDone : null]}
            testID={quizStepTestID(index)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.spaceLg, paddingHorizontal: space.margin, paddingVertical: space.spaceXl },
  choices: { gap: space.spaceSm },
  counter: { gap: space.spaceSm },
  counterWords: {
    color: colour.secondaryText,
    textTransform: 'uppercase',
    ...textStyle('label-md'),
  },
  foot: { gap: space.spaceXs, paddingBottom: space.spaceXl, paddingHorizontal: space.margin },
  privacy: { color: colour.secondaryText, ...textStyle('body-sm') },
  question: { color: colour.text, ...textStyle('headline-md') },
  step: { backgroundColor: colour.line, borderRadius: radius.full, flex: 1, height: STEP_HEIGHT },
  stepDone: { backgroundColor: colour.accent },
  steps: { flexDirection: 'row', gap: space.spaceXs },
});
