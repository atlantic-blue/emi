import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';
import { type StyleProp, StyleSheet, type TextLayoutEventData, type TextStyle } from 'react-native';
import { CappedText as Text } from '@emi/ui';

/**
 * A label in a tile, a chip or a header slot sits in a box narrower than the screen. When one word
 * of it is wider than the box, the platform cuts the word across two lines. This text never does
 * that. It shrinks a little until each word fits on a line, and stops at a floor.
 *
 * Russian draws in the system face, which is wider than Figtree, so most of these words are
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

interface SharedScale {
  readonly step: number;
  readonly stepDownFrom: (step: number) => void;
}

const SharedScaleContext = createContext<SharedScale | undefined>(undefined);

/**
 * Labels set side by side read as one scale only when they share one size. Inside this, every
 * label steps down together until no word of any of them is cut, and none shrinks on its own.
 */
export function OneLabelScale({ children }: { readonly children: ReactNode }): ReactNode {
  const [step, setStep] = useState(0);
  // Every label that is cut reports from the same step in one pass, and only the first may move it.
  const stepDownFrom = useCallback((from: number) => {
    setStep((now) => (now === from && now < LABEL_SCALES.length - 1 ? now + 1 : now));
  }, []);
  const shared = useMemo(() => ({ step, stepDownFrom }), [step, stepDownFrom]);

  return <SharedScaleContext.Provider value={shared}>{children}</SharedScaleContext.Provider>;
}

interface Props {
  readonly label: string;
  readonly style: StyleProp<TextStyle>;
  readonly testID?: string;
  /** Told once when a word is still cut at the floor, so the box around it can give more room. */
  readonly onWordCutAtTheFloor?: () => void;
}

export function WholeWordsText({ label, style, testID, onWordCutAtTheFloor }: Props): ReactNode {
  const [ownStep, setOwnStep] = useState(0);
  const shared = useContext(SharedScaleContext);
  const step = shared?.step ?? ownStep;

  if (shared === undefined && isOneWord(label)) {
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
      if (shared === undefined) {
        setOwnStep(step + 1);
      } else {
        shared.stepDownFrom(step);
      }
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
