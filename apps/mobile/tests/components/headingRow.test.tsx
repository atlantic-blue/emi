import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { space, textStyle } from '@emi/tokens';
import { Pressable, StyleSheet, Text, type TextStyle, type ViewStyle } from 'react-native';

import {
  HeadingRow,
  fitsSideBySide,
  headingRowEndTestID,
  headingRowMeasureTestID,
} from '../../src/components/HeadingRow';

/**
 * A heading and the link beside it stay on one line while both fit. When they do not, the link
 * moves under the heading and keeps its full size, and neither one is squeezed.
 */

const rowTestID = 'row';
const headingStyle = textStyle('headline-sm');
const linkStyle = textStyle('label-md');

describe('whether a heading and its link fit side by side', () => {
  it('fits when the two widths and the gap are no wider than the row', () => {
    expect(fitsSideBySide({ rowWidth: 343, headingWidth: 150, endWidth: 150, gap: 12 })).toBe(true);
  });

  it('does not fit when the gap is what is missing, so the two are never drawn touching', () => {
    expect(fitsSideBySide({ rowWidth: 343, headingWidth: 170, endWidth: 170, gap: 12 })).toBe(
      false,
    );
  });

  it('does not fit before the row has a width', () => {
    expect(fitsSideBySide({ rowWidth: 0, headingWidth: 10, endWidth: 10, gap: 12 })).toBe(false);
  });
});

async function theRow(): Promise<void> {
  await render(
    <HeadingRow
      end={
        <Pressable accessibilityRole="link" testID="link">
          <Text style={linkStyle} testID="link-label">
            Другие выделения
          </Text>
        </Pressable>
      }
      heading="Месячные"
      headingStyle={headingStyle}
      headingTestID="heading"
      testID={rowTestID}
    />,
  );
}

async function layOut(testID: string, width: number): Promise<void> {
  await act(() =>
    fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 24 } },
    }),
  );
}

async function measured(widths: {
  readonly row: number;
  readonly heading: number;
  readonly end: number;
}): Promise<void> {
  await layOut(rowTestID, widths.row);
  await layOut(headingRowMeasureTestID(rowTestID), widths.heading);
  await layOut(headingRowEndTestID(rowTestID), widths.end);
}

function rowStyle(): ViewStyle {
  return StyleSheet.flatten(screen.getByTestId(rowTestID).props.style) as ViewStyle;
}

describe('a heading and its link drawn on a phone', () => {
  it('keeps the two on one line, at each end, when they fit', async () => {
    await theRow();
    await measured({ row: 343, heading: 120, end: 140 });

    expect(rowStyle().flexDirection).toBe('row');
    expect(rowStyle().justifyContent).toBe('space-between');
  });

  it('moves the link under the heading when the two do not fit side by side', async () => {
    await theRow();
    await measured({ row: 343, heading: 200, end: 160 });

    expect(rowStyle().flexDirection).toBe('column');
    expect(rowStyle().alignItems).toBe('flex-start');
    expect(rowStyle().rowGap).toBe(space.spaceXs);
  });

  it('keeps the heading first and the link second in either arrangement', async () => {
    await theRow();
    await measured({ row: 343, heading: 200, end: 160 });

    const order = screen
      .getAllByTestId(/^(heading|link)$/)
      .map((element) => element.props.testID as string);

    expect(order).toEqual(['heading', 'link']);
  });

  it('never lets the link shrink, and never changes its size', async () => {
    await theRow();
    await measured({ row: 343, heading: 200, end: 160 });

    const end = StyleSheet.flatten(
      screen.getByTestId(headingRowEndTestID(rowTestID)).props.style,
    ) as ViewStyle;
    const label = StyleSheet.flatten(screen.getByTestId('link-label').props.style) as TextStyle;

    expect(end.flexShrink).toBe(0);
    expect(label.fontSize).toBe(linkStyle.fontSize);
  });

  it('lets the heading wrap between words, at its own size, and never cuts it', async () => {
    await theRow();
    await measured({ row: 343, heading: 400, end: 160 });

    const heading = screen.getByTestId('heading');
    const drawn = StyleSheet.flatten(heading.props.style) as TextStyle;

    expect(heading.props.numberOfLines).toBeUndefined();
    expect(heading.props.adjustsFontSizeToFit).toBeUndefined();
    expect(drawn.fontSize).toBe(headingStyle.fontSize);
  });

  it('reads the heading to a screen reader once, as a header', async () => {
    await theRow();

    const read = screen.getAllByText('Месячные');

    expect(read).toHaveLength(1);
    expect(read[0]?.props.accessibilityRole).toBe('header');
  });

  it('measures the heading on one line, at its own size', async () => {
    await theRow();

    const measure = screen.getByTestId(headingRowMeasureTestID(rowTestID), {
      includeHiddenElements: true,
    });

    expect(measure.props.numberOfLines).toBe(1);
    expect((StyleSheet.flatten(measure.props.style) as TextStyle).fontSize).toBe(
      headingStyle.fontSize,
    );
  });
});
