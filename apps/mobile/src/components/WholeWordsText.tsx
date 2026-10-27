import { type ReactNode, useState } from 'react';
import {
  type StyleProp,
  StyleSheet,
  Text,
  type TextLayoutEventData,
  type TextStyle,
} from 'react-native';

/**
 * A label in a tile, a chip or a header slot sits in a box narrower than the screen. When one word
 * of it is wider than the box, the platform cuts the word across two lines. This text never does
 * that. It shrinks a little until each word fits on a line, and stops at a floor.
 *
 * Russian draws in Mulish, which is wider than Figtree, so most of these words are
 * Russian ones on the smallest iPhone, at 375 points.
 */

/** The smallest a label is drawn, as a share of its size. Smaller than this reads as a mistake. */
export const MINIMUM_LABEL_SCALE = 0.85;

/** The sizes a label with spaces in it steps down through, from its own size to the floor. */
export const LABEL_SCALES = [1, 0.95, 0.9, MINIMUM_LABEL_SCALE] as const;

export function isOneWord(label: string): boolean {
  return !/\s/.test(label.trim());
}

/**
 * True when the platform ended a line inside a word of the label. A line may or may not keep the
 * space it wrapped at, so each line is laid back over the label and the two letters either side of
 * the wrap are read. A wrap after a hyphen is where the word allows it.
 */
export function cutsAWord(label: string, lines: readonly { readonly text: string }[]): boolean {
  let position = 0;

  for (const line of lines.slice(0, -1)) {
    position += line.text.length;
    const before = label.charAt(position - 1);
    const after = label.charAt(position);
    if (before !== '' && after !== '' && !/[\s\-\u00AD]/.test(before) && !/\s/.test(after)) {
      return true;
    }
    while (/\s/.test(label.charAt(position))) {
      position += 1;
    }
  }

  return false;
}

interface Props {
  readonly label: string;
  readonly style: StyleProp<TextStyle>;
  readonly testID?: string;
  /** Told once when a word is still cut at the floor, so the box around it can give more room. */
  readonly onWordCutAtTheFloor?: () => void;
}

export function WholeWordsText({ label, style, testID, onWordCutAtTheFloor }: Props): ReactNode {
  const [step, setStep] = useState(0);

  if (isOneWord(label)) {
    return (
      <Text
        adjustsFontSizeToFit
        minimumFontScale={MINIMUM_LABEL_SCALE}
        numberOfLines={1}
        style={style}
        testID={testID}
      >
        {label}
      </Text>
    );
  }

  const scale = LABEL_SCALES[step] ?? MINIMUM_LABEL_SCALE;
  const { fontFamily, fontSize, lineHeight } = StyleSheet.flatten(style);
  const scaled: TextStyle = {
    fontFamily,
    fontSize: fontSize === undefined ? undefined : fontSize * scale,
    lineHeight: lineHeight === undefined ? undefined : lineHeight * scale,
  };

  function readLines(lines: TextLayoutEventData['lines']): void {
    if (!cutsAWord(label, lines)) {
      return;
    }
    if (step < LABEL_SCALES.length - 1) {
      setStep(step + 1);
      return;
    }
    onWordCutAtTheFloor?.();
  }

  return (
    <Text
      onTextLayout={(event) => readLines(event.nativeEvent.lines)}
      style={[style, scaled]}
      testID={testID}
    >
      {label}
    </Text>
  );
}
