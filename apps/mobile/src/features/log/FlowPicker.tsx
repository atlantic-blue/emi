import { flowValues } from '@emi/crypto';
import type { Flow } from '@emi/cycle';
import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon, CappedText as Text } from '@emi/ui';
import { type ReactNode, useState } from 'react';
import {
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { words } from '../../language';

/**
 * The five values of design section 6.2, in the order she reads them, from nothing to the heaviest
 * day, each a round disc with its drops as the log board draws them. One press is the whole action:
 * there is no save button here, because the most common thing anybody does in this product is not
 * worth two presses.
 */

export const flowLabel: Readonly<Record<Flow, string>> = {
  none: words('log.flow.none'),
  spotting: words('log.flow.spotting'),
  light: words('log.flow.light'),
  medium: words('log.flow.medium'),
  heavy: words('log.flow.heavy'),
};

export const flowPickerTestID = 'flow-picker';

export function flowOptionTestID(flow: Flow): string {
  return `flow-option-${flow}`;
}

interface Props {
  readonly chosen?: Flow;
  readonly onPick: (flow: Flow) => void;
}

/** Points. The disc each value is drawn in on the log board, and the drawings inside it. */
const FLOW_DISC = 54;
const FLOW_DISC_BORDER = 1.5;
const DROP_SIZE = 13;
const NONE_SIZE = 14;

/** How many drops each value is drawn with. None is drawn as a cross, so it carries no drop. */
export const dropsOf: Readonly<Record<Flow, number>> = {
  none: 0,
  spotting: 1,
  light: 1,
  medium: 2,
  heavy: 3,
};

/** Points. The width and the height of each word, as the row drew it on one line. */
export interface WordSize {
  readonly width: number;
  readonly height: number;
}

/**
 * True when the five values do not fit across the row. Each value takes its disc or its word,
 * whichever is wider, so a row narrower than their sum pushes the words into each other.
 */
export function wordsOverflowTheRow(
  rowWidth: number,
  words: readonly (WordSize | undefined)[],
): boolean {
  if (
    rowWidth <= 0 ||
    words.length !== flowValues.length ||
    words.some((word) => word === undefined)
  ) {
    return false;
  }

  const taken = words.reduce((sum, word) => sum + Math.max(FLOW_DISC, word?.width ?? 0), 0);

  return taken > rowWidth;
}

/**
 * Points. How far a word on two lines moves sideways from the middle of its disc. A word at either
 * end moves inwards until it stays inside the row, and every other word stays centred.
 */
export function sidewaysShift(rowWidth: number, at: number, wordWidth: number): number {
  const step = (rowWidth - FLOW_DISC) / (flowValues.length - 1);
  const centredFrom = FLOW_DISC / 2 + at * step - wordWidth / 2;
  const insideFrom = Math.min(Math.max(centredFrom, 0), rowWidth - wordWidth);

  return insideFrom - centredFrom;
}

export function isOnTheLowerLine(at: number): boolean {
  return at % 2 === 1;
}

export function flowLabelTestID(flow: Flow): string {
  return `flow-label-${flow}`;
}

export function FlowPicker(props: Props): ReactNode {
  const { fontScale } = useWindowDimensions();

  return <FlowOptions key={fontScale} {...props} />;
}

function FlowOptions({ chosen, onPick }: Props): ReactNode {
  const [rowWidth, setRowWidth] = useState(0);
  const [words, setWords] = useState<Partial<Record<Flow, WordSize>>>({});
  const isOnTwoLines = wordsOverflowTheRow(
    rowWidth,
    flowValues.map((flow) => words[flow]),
  );

  const measureTheWord = (flow: Flow) => (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setWords((now) => ({ ...now, [flow]: { width, height } }));
  };

  return (
    <View
      accessibilityRole="radiogroup"
      onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
      style={[styles.options, isOnTwoLines && styles.optionsOnTwoLines]}
      testID={flowPickerTestID}
    >
      {flowValues.map((flow, at) => {
        const isChosen = flow === chosen;
        const ink = isChosen ? colour.onAccent : colour.accent;
        const word = words[flow];
        const isLower = isOnTheLowerLine(at);

        return (
          <Pressable
            accessibilityLabel={flowLabel[flow]}
            accessibilityRole="radio"
            accessibilityState={{ checked: isChosen }}
            key={flow}
            onPress={() => onPick(flow)}
            style={[
              styles.option,
              isOnTwoLines && styles.optionOnTwoLines,
              isOnTwoLines && !isLower && styles.optionOnTheUpperLine,
            ]}
            testID={flowOptionTestID(flow)}
          >
            <View style={[styles.disc, isChosen ? styles.discChosen : styles.discPlain]}>
              {flow === 'none' ? (
                <Icon
                  colour={isChosen ? colour.onAccent : colour.secondaryText}
                  name="close"
                  size={NONE_SIZE}
                />
              ) : (
                Array.from({ length: dropsOf[flow] }, (_unused, drop) => (
                  <Icon colour={ink} key={drop} name="drop" size={DROP_SIZE} />
                ))
              )}
            </View>
            <Text
              onLayout={isOnTwoLines ? undefined : measureTheWord(flow)}
              style={[
                styles.label,
                isOnTwoLines && word !== undefined
                  ? {
                      // The option is as wide as its disc, so the word is given its own width back.
                      width: Math.ceil(word.width) + 1,
                      marginTop: isLower ? word.height : 0,
                      transform: [{ translateX: sidewaysShift(rowWidth, at, word.width) }],
                    }
                  : undefined,
              ]}
              testID={flowLabelTestID(flow)}
            >
              {flowLabel[flow]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: FLOW_DISC_BORDER,
    flexDirection: 'row',
    height: FLOW_DISC,
    justifyContent: 'center',
    width: FLOW_DISC,
  },
  discChosen: { backgroundColor: colour.accent, borderColor: colour.accent },
  discPlain: { backgroundColor: colour.card, borderColor: colour.line },
  label: {
    color: colour.text,
    ...textStyle('label-md'),
    textAlign: 'center',
  },
  // SEE-3. The disc and its word together are the tap target, and the disc alone is past the floor.
  option: {
    alignItems: 'center',
    gap: space.spaceXs,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  // An upper word reaches over the columns of its neighbours, so its press must be found first.
  optionOnTheUpperLine: { zIndex: 1 },
  optionOnTwoLines: { width: FLOW_DISC },
  options: { flexDirection: 'row', justifyContent: 'space-between' },
  optionsOnTwoLines: { alignItems: 'flex-start' },
});
