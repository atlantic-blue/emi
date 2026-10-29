import { longestNote } from '@emi/crypto';
import { colour, radius, space, stroke, textStyle } from '@emi/tokens';
import { CappedText as Text, CappedTextInput as TextInput } from '@emi/ui';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '../../components/Card';
import { words } from '../../language';

export const dayNoteCopy = {
  title: words('log.note.title'),
  placeholder: words('log.note.placeholder'),
} as const;

export const dayNoteTestID = 'log-flow-note';
export const dayNoteFieldTestID = 'log-flow-note-field';

/** Points. Room for about four lines before the box grows with what she writes. */
const NOTE_HEIGHT = 96;

interface Props {
  readonly note: string;
  readonly onChange: (note: string) => void;
  readonly onEndEditing: () => void;
}

export function DayNote({ note, onChange, onEndEditing }: Props): ReactNode {
  return (
    <Card testID={dayNoteTestID}>
      <View style={styles.inside}>
        <Text accessibilityRole="header" style={styles.title}>
          {dayNoteCopy.title}
        </Text>
        <TextInput
          accessibilityLabel={dayNoteCopy.title}
          // The box counts UTF-16 units and the record counts code points, so a note the box
          // accepts is never longer than the record allows.
          maxLength={longestNote}
          multiline
          onChangeText={onChange}
          onEndEditing={onEndEditing}
          placeholder={dayNoteCopy.placeholder}
          placeholderTextColor={colour.secondaryText}
          style={styles.field}
          testID={dayNoteFieldTestID}
          value={note}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  field: {
    borderColor: colour.line,
    borderRadius: radius.md,
    borderWidth: stroke.hairline,
    color: colour.text,
    minHeight: NOTE_HEIGHT,
    padding: space.spaceMd,
    textAlignVertical: 'top',
    ...textStyle('body-lg'),
  },
  inside: { gap: space.spaceMd },
  title: { color: colour.text, ...textStyle('headline-sm') },
});
