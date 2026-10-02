import { MINIMUM_TAP_TARGET, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import { type ReactNode, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

/**
 * One line she types into, with the question above it.
 *
 * The question is set in the display face because the document asks a field to read as a prompt in
 * a journal rather than as a form label, and the words she types are body text.
 *
 * The focused state thickens the border and takes the colour that acts, and never a glow. Nothing
 * in this product is lit.
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

/** Points. The height the document draws the box at, well above the tap floor of SEE-3. */
const FIELD_HEIGHT = 56;

/** Points. The border while she is in the box, which the document draws at twice the hairline. */
const FOCUS_BORDER = 2;

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
        placeholderTextColor={colour.secondaryText}
        style={focused ? [styles.box, styles.focused] : styles.box}
        testID={testID}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colour.card,
    borderColor: colour.line,
    borderRadius: radius.md,
    borderWidth: stroke.hairline,
    color: colour.text,
    minHeight: Math.max(FIELD_HEIGHT, MINIMUM_TAP_TARGET),
    paddingHorizontal: space.spaceLg,
    paddingVertical: space.spaceSm,
    ...textStyle('body-lg'),
  },
  field: { gap: space.spaceSm },
  focused: {
    borderColor: colour.accent,
    borderWidth: FOCUS_BORDER,
  },
  label: {
    color: colour.text,
    ...textStyle('headline-sm'),
  },
});
