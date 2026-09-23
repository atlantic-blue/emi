import { colour, radius, space, stroke, textStyle } from '@emi/tokens';
import { type ReactNode, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

/**
 * One line she types into, with the question above it.
 *
 * The question is set in the display face because the document asks a field to read as a prompt in
 * a journal rather than as a form label, and the words she types are body text.
 *
 * The focused state is a change of border colour and not a glow. Nothing in this product is lit.
 */

interface Props {
  /** The question above the box, which is also what a screen reader reads out for the box. */
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** The greyed words inside an empty box. Left out where the label says enough on its own. */
  readonly hint?: string;
  readonly testID?: string;
}

/** Points. Four above the tap floor of contract SEE-3, which is the height of a button. */
const FIELD_HEIGHT = 48;

export function TextField({ label, value, onChange, hint, testID }: Props): ReactNode {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        onBlur={() => {
          setFocused(false);
        }}
        onChangeText={onChange}
        onFocus={() => {
          setFocused(true);
        }}
        placeholder={hint}
        placeholderTextColor={colour.onSurfaceVariant}
        style={focused ? [styles.box, styles.focused] : styles.box}
        testID={testID}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colour.surfaceContainerLowest,
    borderColor: colour.outlineVariant,
    borderRadius: radius.lg,
    borderWidth: stroke.hairline,
    color: colour.onSurface,
    minHeight: FIELD_HEIGHT,
    padding: space.spaceMd,
    ...textStyle('body-md'),
  },
  field: { gap: space.spaceSm },
  focused: { borderColor: colour.primaryContainer },
  label: {
    color: colour.onSurface,
    ...textStyle('headline-sm'),
  },
});
