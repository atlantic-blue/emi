import { space } from '@emi/tokens';
import { CappedText as Text } from '@emi/ui';
import { Children, type ReactNode, useState } from 'react';
import { type StyleProp, StyleSheet, type TextStyle, View } from 'react-native';

/**
 * A row of options that wraps onto more lines, in the order of the options, when the longest word
 * of any label does not fit its column. No label shrinks and no word breaks: the row gives each
 * option more width by taking fewer columns.
 */

export function fluidGridWordTestID(testID: string, word: string): string {
  return `${testID}-word-${word}`;
}

export function fluidGridCellTestID(testID: string, at: number): string {
  return `${testID}-cell-${at}`;
}

/** Each word of the labels once. A label breaks only at a space, so a hyphenated word is whole. */
export function wordsOf(labels: readonly string[]): readonly string[] {
  return [...new Set(labels.flatMap((label) => label.split(/\s+/).filter((word) => word !== '')))];
}

export interface ColumnsAsked {
  readonly count: number;
  readonly rowWidth: number;
  readonly widestWord: number;
  readonly most: number;
  readonly cellAtLeast: number;
  readonly gap: number;
}

/**
 * The most columns whose width holds the widest word and a gap, and then as few as give the same
 * number of lines, so five options take three and two rather than four and one.
 */
export function columnsFor(asked: ColumnsAsked): number {
  const needed = Math.max(asked.widestWord, asked.cellAtLeast) + asked.gap;
  let fit = 1;

  for (let columns = Math.min(asked.most, asked.count); columns > 1; columns -= 1) {
    if (asked.rowWidth / columns >= needed) {
      fit = columns;
      break;
    }
  }

  if (asked.count <= 0) {
    return fit;
  }

  return Math.ceil(asked.count / Math.ceil(asked.count / fit));
}

interface Props {
  readonly labels: readonly string[];
  readonly labelStyle: StyleProp<TextStyle>;
  readonly most: number;
  /** The narrowest a cell may be, which is the width of what is drawn above the label. */
  readonly cellAtLeast: number;
  readonly children: ReactNode;
  readonly testID: string;
  readonly rowGap?: number;
}

export function FluidGrid(props: Props): ReactNode {
  const cells = Children.toArray(props.children);
  const words = wordsOf(props.labels);
  const [rowWidth, setRowWidth] = useState(0);
  const [widths, setWidths] = useState<Readonly<Record<string, number>>>({});
  const isMeasured = rowWidth > 0 && words.every((word) => widths[word] !== undefined);
  const columns = isMeasured
    ? columnsFor({
        count: cells.length,
        rowWidth,
        widestWord: Math.max(0, ...words.map((word) => widths[word] ?? 0)),
        most: props.most,
        cellAtLeast: props.cellAtLeast,
        gap: space.spaceXs,
      })
    : Math.max(1, props.most);

  return (
    <View onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)} testID={props.testID}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={styles.measure}
      >
        {words.map((word) => (
          <Text
            key={word}
            numberOfLines={1}
            onLayout={(event) => {
              const width = Math.ceil(event.nativeEvent.layout.width);
              setWidths((now) => (now[word] === width ? now : { ...now, [word]: width }));
            }}
            style={[props.labelStyle, styles.word]}
            testID={fluidGridWordTestID(props.testID, word)}
          >
            {word}
          </Text>
        ))}
      </View>
      <View style={[styles.grid, { rowGap: props.rowGap ?? space.spaceMd }]}>
        {cells.map((cell, at) => (
          <View
            key={at}
            style={{ width: `${100 / columns}%` }}
            testID={fluidGridCellTestID(props.testID, at)}
          >
            {cell}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  measure: {
    height: 0,
    left: 0,
    opacity: 0,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    width: 10000,
  },
  word: { alignSelf: 'flex-start', flexShrink: 0 },
});
