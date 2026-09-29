import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import type { ProfileRecord } from '@emi/crypto';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { yourAnswersCopy } from './copy';
import {
  type YourAnswerRow,
  answersReadBesideTheQuestion,
  theAnswerSheGave,
  yourAnswerRows,
} from './herAnswers';

export const yourAnswersScreenTestID = 'your-answers-screen';
export const yourAnswersTitleTestID = 'your-answers-title';
export const yourAnswersBackTestID = 'your-answers-back';

export function yourAnswerRowTestID(row: YourAnswerRow): string {
  return `your-answers-row-${row}`;
}

interface RowProps {
  readonly row: YourAnswerRow;
  readonly answer: string | undefined;
}

/**
 * One question and what she said to it. A short answer sits on the question's own line and a
 * sentence sits under it, which is the only difference between the two shapes.
 */
function Row({ row, answer }: RowProps): ReactNode {
  const beside = answersReadBesideTheQuestion.includes(row);

  return (
    <View style={beside ? styles.rowBeside : styles.row} testID={yourAnswerRowTestID(row)}>
      <Text style={styles.question}>{yourAnswersCopy.rows[row]}</Text>
      {answer === undefined ? null : <Text style={styles.answer}>{answer}</Text>}
    </View>
  );
}

/**
 * Her first run, read back to her.
 *
 * Eight rows, which is exactly what the hold sealed. The screen adds no answer and takes none
 * away, and a question she skipped keeps its row with nothing under it, because an invented
 * default would read as something she said.
 *
 * Nothing here writes. The answers arrive opened, from the one sealed row the route reads.
 */
export function YourAnswers({
  answers,
  onBack,
}: {
  readonly answers: ProfileRecord | undefined;
  readonly onBack: () => void;
}): ReactNode {
  return (
    <Screen testID={yourAnswersScreenTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title} testID={yourAnswersTitleTestID}>
            {yourAnswersCopy.title}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            style={styles.back}
            testID={yourAnswersBackTestID}
          >
            <Text style={styles.backLabel}>{yourAnswersCopy.back}</Text>
          </Pressable>
        </View>

        {yourAnswerRows.map((row) => (
          <Row answer={theAnswerSheGave(row, answers)} key={row} row={row} />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  answer: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-lg'),
  },
  back: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  backLabel: {
    color: colour.primary,
    ...textStyle('body-lg'),
  },
  body: { flexGrow: 1, paddingHorizontal: space.spaceLg, paddingVertical: space.spaceXl },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  question: {
    color: colour.onSurface,
    ...textStyle('body-lg'),
  },
  row: {
    backgroundColor: colour.surfaceContainerLowest,
    borderRadius: radius.md,
    justifyContent: 'center',
    marginTop: space.spaceMd,
    minHeight: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceMd,
    paddingVertical: space.spaceSm,
    rowGap: space.spaceXs,
  },
  rowBeside: {
    alignItems: 'center',
    backgroundColor: colour.surfaceContainerLowest,
    borderRadius: radius.md,
    columnGap: space.spaceMd,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space.spaceMd,
    minHeight: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceMd,
    paddingVertical: space.spaceSm,
  },
  title: {
    color: colour.onSurface,
    ...textStyle('headline-lg'),
  },
});
