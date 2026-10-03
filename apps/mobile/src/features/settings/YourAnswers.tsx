import { colour, space, textStyle } from '@emi/tokens';
import type { ProfileRecord } from '@emi/crypto';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { RoundIconButton } from '../../components/RoundIconButton';
import { RowGroup } from '../../components/RowGroup';
import { Screen } from '../../components/Screen';
import { SettingsRow } from '../../components/SettingsRow';
import { yourAnswersCopy } from './copy';
import { type YourAnswerRow, theAnswerSheGave, yourAnswerRows } from './herAnswers';

export const yourAnswersScreenTestID = 'your-answers-screen';
export const yourAnswersTitleTestID = 'your-answers-title';
export const yourAnswersBackTestID = 'your-answers-back';

/** The header of the screen, which the drawing names as the part the title sits inside. */
export const yourAnswersHeaderTestID = 'your-answers-header';

/** The one card the eight rows stand on, which carries the hairline between two of them. */
export const yourAnswersRowsTestID = 'your-answers-rows';

export function yourAnswerRowTestID(row: YourAnswerRow): string {
  return `your-answers-row-${row}`;
}

/** The set holds one chevron, pointing the way on, so the way back is the same drawing turned. */
const TURNED_AROUND = [{ rotate: '180deg' }] as const;

/**
 * Her first run, read back to her.
 *
 * Eight rows on one card, which is exactly what the hold sealed. The screen adds no answer and
 * takes none away, and a question she skipped keeps its row with nothing beside it, because an
 * invented default would read as something she said.
 *
 * The rows carry no symbol. A column of eight tiles would say nothing the question does not
 * already say, and the prototype draws none here, where it draws one on every row of Privacy.
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
    <Screen drawsTheWash testID={yourAnswersScreenTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header} testID={yourAnswersHeaderTestID}>
          <View style={styles.backMark}>
            <RoundIconButton
              accessibilityLabel={yourAnswersCopy.back}
              icon="chevron"
              onPress={onBack}
              testID={yourAnswersBackTestID}
            />
          </View>
          <Text accessibilityRole="header" style={styles.title} testID={yourAnswersTitleTestID}>
            {yourAnswersCopy.title}
          </Text>
          <View style={styles.evenUp} />
        </View>

        <RowGroup testID={yourAnswersRowsTestID}>
          {yourAnswerRows.map((row) => {
            const said = theAnswerSheGave(row, answers);

            return (
              <SettingsRow
                key={row}
                label={yourAnswersCopy.rows[row]}
                testID={yourAnswerRowTestID(row)}
                {...(said === undefined ? {} : { value: said })}
                {...(onOpen === undefined
                  ? {}
                  : {
                      onPress: () => {
                        onOpen(row);
                      },
                    })}
              />
            );
          })}
        </RowGroup>
      </ScrollView>
    </Screen>
  );
}

/** Points. The room the way back takes, kept on the other side so the title stays in the middle. */
const THE_ROOM_A_WAY_BACK_TAKES = 44;

const styles = StyleSheet.create({
  backMark: { transform: TURNED_AROUND },
  body: { flexGrow: 1, paddingHorizontal: space.margin, paddingVertical: space.spaceXl },
  evenUp: { width: THE_ROOM_A_WAY_BACK_TAKES },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.spaceLg,
  },
  title: {
    color: colour.text,
    textAlign: 'center',
    ...textStyle('headline-sm'),
  },
});
