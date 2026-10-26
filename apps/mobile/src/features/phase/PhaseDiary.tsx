import type { DayRecord } from '@emi/crypto';
import { colour, radius, space, stroke, textStyle } from '@emi/tokens';
import { type ReactNode, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { TextLink } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { phasePageCopy } from './copy';
import { type DiaryChip, dayHolds, diaryRowOrder, diaryRows } from './diary';

/**
 * Symptoms, Food and Emotions for today, and a note. A chip writes the moment she presses it, as
 * the log does, and the note writes when she leaves the box.
 */

export const phaseDiaryTestID = 'phase-diary';
export const phaseDiaryNoteTestID = 'phase-diary-note';
export const phaseDiaryAllSymptomsTestID = 'phase-diary-all-symptoms';

export function diaryChipTestID(chip: DiaryChip): string {
  return `phase-diary-${chip.row}-${chip.slug}`;
}

/** Points. The note box, which the board draws at a little over two lines. */
const NOTE_HEIGHT = 64;

interface Props {
  readonly today: DayRecord | undefined;
  readonly onPress: (chip: DiaryChip) => void;
  readonly onNote: (note: string) => void;
  /** The way to every symptom, which the board's six chips do not hold. */
  readonly onAllSymptoms: () => void;
}

export function PhaseDiary({ today, onPress, onNote, onAllSymptoms }: Props): ReactNode {
  const [note, setNote] = useState(today?.note ?? '');

  return (
    <Card testID={phaseDiaryTestID}>
      <View style={styles.body}>
        <Text style={styles.heading}>{phasePageCopy.diary.heading}</Text>
        {diaryRowOrder.map((row) => (
          <View key={row} style={styles.group}>
            <Text style={styles.rowName}>{phasePageCopy.diary.rows[row]}</Text>
            <View style={styles.chips}>
              {diaryRows[row].map((chip) => (
                <Chip
                  isChosen={dayHolds(today, chip)}
                  key={chip.slug}
                  label={chip.label}
                  onPress={() => onPress(chip)}
                  testID={diaryChipTestID(chip)}
                />
              ))}
            </View>
            {row === 'symptoms' ? (
              <TextLink
                label={phasePageCopy.diary.allSymptoms}
                onPress={onAllSymptoms}
                testID={phaseDiaryAllSymptomsTestID}
              />
            ) : null}
          </View>
        ))}
        <TextInput
          accessibilityLabel={phasePageCopy.diary.note}
          multiline
          onChangeText={setNote}
          onEndEditing={() => onNote(note)}
          placeholder={phasePageCopy.diary.note}
          placeholderTextColor={colour.secondaryText}
          style={styles.note}
          testID={phaseDiaryNoteTestID}
          value={note}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.spaceMd },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.spaceSm },
  group: { gap: space.spaceSm },
  heading: {
    color: colour.secondaryText,
    textTransform: 'uppercase',
    ...textStyle('label-md'),
  },
  note: {
    borderColor: colour.line,
    borderRadius: radius.md,
    borderWidth: stroke.hairline,
    color: colour.text,
    minHeight: NOTE_HEIGHT,
    padding: space.spaceMd,
    textAlignVertical: 'top',
    ...textStyle('body-sm'),
  },
  rowName: { color: colour.text, ...textStyle('button-md') },
});
