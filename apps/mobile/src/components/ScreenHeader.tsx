import { MINIMUM_TAP_TARGET, colour, space, textStyle } from '@emi/tokens';
import { CappedText as Text } from '@emi/ui';
import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * A title between a button at each end. The title wraps between words and is never cut or shrunk.
 * The ends keep their full size, and both take the width of the wider one so the title stays in
 * the middle of the glass. When the longest word of the title does not fit between the ends, the
 * title moves to its own line under them.
 */

export function screenHeaderStartTestID(testID: string): string {
  return `${testID}-start`;
}

export function screenHeaderEndTestID(testID: string): string {
  return `${testID}-end`;
}

export function screenHeaderWordTestID(testID: string, word: string): string {
  return `${testID}-word-${word}`;
}

export function screenHeaderBeforeTitleTestID(testID: string): string {
  return `${testID}-before-title`;
}

export function screenHeaderAfterTitleTestID(testID: string): string {
  return `${testID}-after-title`;
}

export interface HeaderWidths {
  readonly rowWidth: number;
  readonly startWidth: number;
  readonly endWidth: number;
  readonly longestWord: number;
  readonly gap: number;
  /** The buttons that sit right beside the title, with the gap each one keeps from it. */
  readonly besideTitle?: number;
}

export function titleFitsBetween(widths: HeaderWidths): boolean {
  const side = Math.max(widths.startWidth, widths.endWidth);

  return (
    widths.longestWord <= widths.rowWidth - 2 * side - 2 * widths.gap - (widths.besideTitle ?? 0)
  );
}

interface Props {
  readonly title: string;
  readonly start: ReactNode;
  readonly testID: string;
  readonly end?: ReactNode;
  readonly titleTestID?: string;
  /** A button drawn right before the title, which moves with the title when it moves under. */
  readonly beforeTitle?: ReactNode;
  readonly afterTitle?: ReactNode;
}

const GAP = space.spaceSm;

export function ScreenHeader(props: Props): ReactNode {
  const words = [...new Set(props.title.split(/\s+/).filter((word) => word !== ''))];
  const [rowWidth, setRowWidth] = useState(0);
  const [startWidth, setStartWidth] = useState<number | undefined>(undefined);
  const [endWidth, setEndWidth] = useState<number | undefined>(undefined);
  const [wordWidths, setWordWidths] = useState<Readonly<Record<string, number>>>({});
  const [beforeWidth, setBeforeWidth] = useState<number | undefined>(undefined);
  const [afterWidth, setAfterWidth] = useState<number | undefined>(undefined);
  const hasBefore = props.beforeTitle !== undefined;
  const hasAfter = props.afterTitle !== undefined;
  const isMeasured =
    rowWidth > 0 &&
    startWidth !== undefined &&
    endWidth !== undefined &&
    (!hasBefore || beforeWidth !== undefined) &&
    (!hasAfter || afterWidth !== undefined) &&
    words.every((word) => wordWidths[word] !== undefined);
  const besideTitle =
    (hasBefore ? (beforeWidth ?? 0) + GAP : 0) + (hasAfter ? (afterWidth ?? 0) + GAP : 0);
  const side = isMeasured ? Math.max(startWidth, endWidth) : undefined;
  const isTitleUnder =
    isMeasured &&
    !titleFitsBetween({
      rowWidth,
      startWidth,
      endWidth,
      longestWord: Math.max(0, ...words.map((word) => wordWidths[word] ?? 0)),
      gap: GAP,
      besideTitle,
    });

  const measure = (
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
            setWordWidths((now) => (now[word] === width ? now : { ...now, [word]: width }));
          }}
          style={[styles.title, styles.word]}
          testID={screenHeaderWordTestID(props.testID, word)}
        >
          {word}
        </Text>
      ))}
    </View>
  );
  const startSide = (
    <View
      style={[styles.side, styles.startSide, { minWidth: side }]}
      testID={`${props.testID}-start-side`}
    >
      <View
        onLayout={(event) => setStartWidth(Math.ceil(event.nativeEvent.layout.width))}
        style={styles.natural}
        testID={screenHeaderStartTestID(props.testID)}
      >
        {props.start}
      </View>
    </View>
  );
  const endSide = (
    <View
      style={[styles.side, styles.endSide, { minWidth: side }]}
      testID={`${props.testID}-end-side`}
    >
      <View
        onLayout={(event) => setEndWidth(Math.ceil(event.nativeEvent.layout.width))}
        style={styles.natural}
        testID={screenHeaderEndTestID(props.testID)}
      >
        {props.end}
      </View>
    </View>
  );
  const titleText = (
    <Text
      accessibilityRole="header"
      style={[
        styles.title,
        isTitleUnder && !hasBefore && !hasAfter ? undefined : styles.titleBetween,
      ]}
      testID={props.titleTestID}
    >
      {props.title}
    </Text>
  );
  const title =
    !hasBefore && !hasAfter ? (
      titleText
    ) : (
      <View style={[styles.titleRow, isTitleUnder ? undefined : styles.titleBetween]}>
        {hasBefore ? (
          <View
            onLayout={(event) => setBeforeWidth(Math.ceil(event.nativeEvent.layout.width))}
            style={styles.natural}
            testID={screenHeaderBeforeTitleTestID(props.testID)}
          >
            {props.beforeTitle}
          </View>
        ) : null}
        {titleText}
        {hasAfter ? (
          <View
            onLayout={(event) => setAfterWidth(Math.ceil(event.nativeEvent.layout.width))}
            style={styles.natural}
            testID={screenHeaderAfterTitleTestID(props.testID)}
          >
            {props.afterTitle}
          </View>
        ) : null}
      </View>
    );

  if (isTitleUnder) {
    return (
      <View
        onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
        style={styles.stacked}
        testID={props.testID}
      >
        {measure}
        <View style={styles.ends}>
          {startSide}
          {endSide}
        </View>
        {title}
      </View>
    );
  }

  return (
    <View
      onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
      style={styles.row}
      testID={props.testID}
    >
      {measure}
      {startSide}
      {title}
      {endSide}
    </View>
  );
}

const styles = StyleSheet.create({
  endSide: { justifyContent: 'flex-end' },
  ends: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: MINIMUM_TAP_TARGET,
  },
  measure: {
    height: 0,
    left: 0,
    opacity: 0,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    width: 10000,
  },
  natural: { flexShrink: 0 },
  row: {
    alignItems: 'center',
    columnGap: GAP,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: MINIMUM_TAP_TARGET,
  },
  side: { alignItems: 'center', flexDirection: 'row', flexShrink: 0 },
  stacked: { flexDirection: 'column', rowGap: space.spaceXs },
  startSide: { justifyContent: 'flex-start' },
  title: { color: colour.text, textAlign: 'center', ...textStyle('headline-sm') },
  titleBetween: { flexBasis: 0, flexGrow: 1, flexShrink: 1 },
  titleRow: { alignItems: 'center', columnGap: GAP, flexDirection: 'row' },
  word: { alignSelf: 'flex-start', flexShrink: 0 },
});
