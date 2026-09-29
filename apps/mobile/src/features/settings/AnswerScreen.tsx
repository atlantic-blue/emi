import { MINIMUM_TAP_TARGET, colour, space, stroke, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/Button';
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

/** Points. The arrow is read at the size the first run reads its own arrow at. */
const BACK_MARK_SIZE = 22;

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
  onSave,
  onCancel,
  children,
}: Props): ReactNode {
  return (
    <Screen testID={answerScreenTestID}>
      <View style={styles.header} testID={answerHeaderTestID}>
        <Pressable
          accessibilityLabel={answerCopy.back}
          accessibilityRole="button"
          onPress={onCancel}
          style={styles.back}
          testID={answerBackTestID}
        >
          <View style={styles.backMark}>
            <Icon colour={colour.onSurface} name="chevron" size={BACK_MARK_SIZE} />
          </View>
        </Pressable>

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
        <PrimaryButton label={answerCopy.save} onPress={onSave} testID={answerSaveTestID} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // The control takes the room the words leave, so it sits in the middle of the glass rather than
  // under the last paragraph.
  asked: { flexGrow: 1, justifyContent: 'center', paddingVertical: space.spaceXl },
  back: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
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
    color: colour.primary,
    ...textStyle('label-md'),
  },
  footer: {
    borderTopColor: colour.outlineVariant,
    borderTopWidth: stroke.hairline,
    padding: space.spaceLg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.spaceSm,
    paddingTop: space.spaceSm,
  },
  line: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-sm'),
  },
  question: {
    color: colour.onSurface,
    ...textStyle('headline-md'),
  },
  said: { rowGap: space.spaceSm },
  scroll: { flex: 1 },
  title: {
    color: colour.onSurface,
    ...textStyle('label-md'),
  },
});
