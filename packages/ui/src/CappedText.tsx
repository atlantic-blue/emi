import { MAXIMUM_TEXT_GROWTH } from '@emi/tokens';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Text, TextInput } from 'react-native';

/**
 * React Native offers no default for the growth limit, and a default prop on its Text is ignored by
 * the automatic runtime, so every run of text in the product is drawn through this.
 */
export function CappedText(props: ComponentPropsWithRef<typeof Text>): ReactNode {
  return (
    <Text {...props} maxFontSizeMultiplier={props.maxFontSizeMultiplier ?? MAXIMUM_TEXT_GROWTH} />
  );
}

/** The text field, under the same limit as every other run of text. */
export function CappedTextInput(props: ComponentPropsWithRef<typeof TextInput>): ReactNode {
  return (
    <TextInput
      {...props}
      maxFontSizeMultiplier={props.maxFontSizeMultiplier ?? MAXIMUM_TEXT_GROWTH}
    />
  );
}
