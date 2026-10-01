import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import type { ProfileRecord } from '@emi/crypto';
import { Icon } from '@emi/ui';
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

/** Points. The mark that says a row opens something, read beside the answer it belongs to. */
const OPENS_MARK_SIZE = 18;

interface RowProps {
  readonly row: YourAnswerRow;
  readonly answer: string | undefined;
  /** Left out by a row that opens nothing, and then no mark is drawn beside it. */
  readonly onOpen?: () => void;
}

/**
 * One question and what she said to it. A short answer sits on the question's own line and a
 * sentence sits under it, which is the only difference between the two shapes.
 *
 * A row she can change carries a mark at its end, so the rows that open something are told apart
 * from the rows that only read by something other than pressing each one to find out.
 */
function Row({ row, answer, onOpen }: RowProps): ReactNode {
  // A row with nothing under it reads on one line either way, so the mark that says it opens sits
  // beside the question rather than alone on a line of its own.
  const style =
    answersReadBesideTheQuestion.includes(row) || answer === undefined
      ? styles.rowBeside
      : styles.row;
  const said = answer === undefined ? null : <Text style={styles.answer}>{answer}</Text>;
  const words = (
    <>
      <Text style={styles.question}>{yourAnswersCopy.rows[row]}</Text>
      {onOpen === undefined ? (
        said
      ) : (
        <View style={styles.opens}>
          {said}
          <Icon colour={colour.quietIcon} name="chevron" size={OPENS_MARK_SIZE} />
        </View>
      )}
    </>
  );

  if (onOpen === undefined) {
    return (
      <View style={style} testID={yourAnswerRowTestID(row)}>
        {words}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onOpen}
      style={style}
      testID={yourAnswerRowTestID(row)}
    >
      {words}
    </Pressable>
  );
}

/**
 * Her first run, read back to her.
 *
 * Eight rows, which is exactly what the hold sealed. The screen adds no answer and takes none
 * away, and a question she skipped keeps its row with nothing under it, because an invented
 * default would read as something she said.
 *
 * Every row opens the question it names, asked again with the control the first run asked it with.
 *
 * Nothing here writes. The answers arrive opened, from the one sealed row the route reads.
 */
export function YourAnswers({
  answers,
  onBack,
  onOpen,
}: {
  readonly answers: ProfileRecord | undefined;
  readonly onBack: () => void;
  /** Left out where nothing is reached from here, which is every drawing of this screen alone. */
  readonly onOpen?: (row: YourAnswerRow) => void;
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
          <Row
            answer={theAnswerSheGave(row, answers)}
            key={row}
            row={row}
            {...(onOpen === undefined
              ? {}
              : {
                  onOpen: () => {
                    onOpen(row);
                  },
                })}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  answer: {
    color: colour.secondaryText,
    ...textStyle('body-lg'),
  },
  back: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  backLabel: {
    color: colour.accent,
    ...textStyle('body-lg'),
  },
  body: { flexGrow: 1, paddingHorizontal: space.spaceLg, paddingVertical: space.spaceXl },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  // What she reads and the mark that says the row opens, kept together at the end of the line so
  // the mark sits against the edge rather than against the answer.
  opens: { alignItems: 'center', columnGap: space.spaceSm, flexDirection: 'row' },
  question: {
    color: colour.text,
    ...textStyle('body-lg'),
  },
  row: {
    backgroundColor: colour.card,
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
    backgroundColor: colour.card,
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
    color: colour.text,
    ...textStyle('headline-lg'),
  },
});
