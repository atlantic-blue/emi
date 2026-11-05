import { space } from '@emi/tokens';
import { CappedText as Text } from '@emi/ui';
import { type ReactNode, useState } from 'react';
import { type StyleProp, StyleSheet, type TextStyle, View } from 'react-native';

/**
 * A heading with a link or a value at the other end of its row. The two stay on one line while
 * both fit at their own size. When they do not, the end moves under the heading. Neither shrinks,
 * and the heading wraps only between words.
 */

export function headingRowEndTestID(testID: string): string {
  return `${testID}-end`;
}

export function headingRowMeasureTestID(testID: string): string {
  return `${testID}-measure`;
}

export interface RowWidths {
  readonly rowWidth: number;
  readonly headingWidth: number;
  readonly endWidth: number;
  readonly gap: number;
}

export function fitsSideBySide(widths: RowWidths): boolean {
  return (
    widths.rowWidth > 0 && widths.headingWidth + widths.gap + widths.endWidth <= widths.rowWidth
  );
}

interface Props {
  readonly heading: string;
  readonly headingStyle: StyleProp<TextStyle>;
  readonly end: ReactNode;
  readonly testID: string;
  readonly headingTestID?: string;
}

const GAP = space.spaceMd;

export function HeadingRow(props: Props): ReactNode {
  const [rowWidth, setRowWidth] = useState(0);
  const [headingWidth, setHeadingWidth] = useState<number | undefined>(undefined);
  const [endWidth, setEndWidth] = useState<number | undefined>(undefined);
  const isMeasured = rowWidth > 0 && headingWidth !== undefined && endWidth !== undefined;
  const isStacked = isMeasured && !fitsSideBySide({ rowWidth, headingWidth, endWidth, gap: GAP });

  return (
    <View
      onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
      style={isStacked ? styles.stacked : styles.sideBySide}
      testID={props.testID}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={styles.measure}
      >
        <Text
          numberOfLines={1}
          onLayout={(event) => setHeadingWidth(Math.ceil(event.nativeEvent.layout.width))}
          style={[props.headingStyle, styles.natural]}
          testID={headingRowMeasureTestID(props.testID)}
        >
          {props.heading}
        </Text>
      </View>
      <Text
        accessibilityRole="header"
        style={[props.headingStyle, styles.heading]}
        testID={props.headingTestID}
      >
        {props.heading}
      </Text>
      <View
        onLayout={(event) => setEndWidth(Math.ceil(event.nativeEvent.layout.width))}
        style={styles.end}
        testID={headingRowEndTestID(props.testID)}
      >
        {props.end}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  end: { flexShrink: 0 },
  heading: { flexShrink: 1 },
  measure: {
    height: 0,
    left: 0,
    opacity: 0,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    width: 10000,
  },
  natural: { alignSelf: 'flex-start', flexShrink: 0 },
  sideBySide: {
    alignItems: 'center',
    columnGap: GAP,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stacked: { alignItems: 'flex-start', flexDirection: 'column', rowGap: space.spaceXs },
});
