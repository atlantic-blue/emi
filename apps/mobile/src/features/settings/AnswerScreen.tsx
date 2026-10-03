import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/Button';
import { RoundIconButton } from '../../components/RoundIconButton';
import { Screen } from '../../components/Screen';
import { answerCopy, gaveAtFirstRunSentence } from './copy';

export const answerScreenTestID = 'answer-screen';
export const answerHeaderTestID = 'answer-header';
export const answerTitleTestID = 'answer-title';
export const answerBackTestID = 'answer-back';
export const answerCancelTestID = 'answer-cancel';
export const answerQuestionTestID = 'answer-question';
export const answerLinesTestID = 'answer-lines';
export const answerHeldTestID = 'answer-held';
export const answerSaveTestID = 'answer-save';

/** The set holds one chevron, pointing the way on, so the way back is the same drawing turned. */
const TURNED_AROUND = [{ rotate: '180deg' }] as const;

interface Props {
  /** The row of her answers this screen changes, which names the screen at the top. */
  readonly title: string;
  /** The question the first run asked, word for word, so she recognises what she is answering. */
  readonly question: string;
  /** The lines the first run put under that question. */
  readonly lines: readonly string[];
  /** What she gave at the first run, read as she read it there. Left out where she skipped it. */
  readonly held: string | undefined;
  /**
   * Left out where saving is always available. A screen whose control can be left holding no answer
   * at all sets it, because a save of nothing would take away the answer she came here to correct.
   */
  readonly saveIsReady?: boolean;
  readonly onSave: () => void;
  readonly onCancel: () => void;
  /** The control the first run gave this answer, which this screen borrows rather than replaces. */
  readonly children: ReactNode;
}

/**
 * The frame every changed answer stands in: what she is changing at the top, the question the
 * first run asked under it, the control it was asked with, and Save held at the bottom.
 *
 * Nothing is written until Save. The two ways out of the header both leave the answer where it
 * was, so a woman who opened the row to look at what she said can leave without changing it.
 *
 * The line saying what she gave at the first run sits under the control rather than inside it. The
 * control already reads the number she is choosing now, and two numbers in one place would leave
 * her reading which of them is the answer.
 */
export function AnswerScreen({
  title,
  question,
  lines,
  held,
  saveIsReady = true,
  onSave,
  onCancel,
  children,
}: Props): ReactNode {
  return (
    <Screen drawsTheWash testID={answerScreenTestID}>
      <View style={styles.header} testID={answerHeaderTestID}>
        <View style={styles.backMark}>
          <RoundIconButton
            accessibilityLabel={answerCopy.back}
            icon="chevron"
            onPress={onCancel}
            testID={answerBackTestID}
          />
        </View>

        <Text accessibilityRole="header" style={styles.title} testID={answerTitleTestID}>
          {title}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={styles.cancel}
          testID={answerCancelTestID}
        >
          <Text style={styles.cancelLabel}>{answerCopy.cancel}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} style={styles.scroll}>
        <Text accessibilityRole="header" style={styles.question} testID={answerQuestionTestID}>
          {question}
        </Text>

        <View style={styles.asked}>{children}</View>

        <View style={styles.said} testID={answerLinesTestID}>
          {lines.map((line) => (
            <Text key={line} style={styles.line}>
              {line}
            </Text>
          ))}
          {held === undefined ? null : (
            <Text style={styles.line} testID={answerHeldTestID}>
              {gaveAtFirstRunSentence(held)}
            </Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          isReady={saveIsReady}
          label={answerCopy.save}
          onPress={onSave}
          testID={answerSaveTestID}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // The control takes the room the words leave, so it sits in the middle of the glass rather than
  // under the last paragraph.
  asked: { flexGrow: 1, justifyContent: 'center', paddingVertical: space.spaceXl },
  backMark: { transform: TURNED_AROUND },
  body: {
    flexGrow: 1,
    paddingBottom: space.spaceLg,
    paddingHorizontal: space.spaceLg,
    paddingTop: space.spaceMd,
  },
  cancel: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceSm,
  },
  cancelLabel: {
    color: colour.accent,
    ...textStyle('label-md'),
  },
  footer: { padding: space.margin },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.spaceMd,
    paddingTop: space.spaceSm,
  },
  line: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
  },
  question: {
    color: colour.text,
    textAlign: 'center',
    ...textStyle('headline-md'),
  },
  said: {
    backgroundColor: colour.card,
    borderRadius: radius.xl,
    padding: space.spaceLg,
    rowGap: space.spaceSm,
  },
  scroll: { flex: 1 },
  title: {
    color: colour.text,
    textAlign: 'center',
    ...textStyle('headline-sm'),
  },
});
