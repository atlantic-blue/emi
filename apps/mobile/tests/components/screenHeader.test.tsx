import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { textStyle } from '@emi/tokens';
import { Pressable, StyleSheet, Text, type TextStyle, type ViewStyle } from 'react-native';

import {
  ScreenHeader,
  screenHeaderAfterTitleTestID,
  screenHeaderBeforeTitleTestID,
  screenHeaderEndTestID,
  screenHeaderStartTestID,
  screenHeaderWordTestID,
  titleFitsBetween,
} from '../../src/components/ScreenHeader';

/**
 * A title between a button at each end. The title wraps and is never cut. The buttons keep their
 * full size and width. When the longest word of the title does not fit between them, the title
 * moves to its own line under the buttons.
 */

const headerTestID = 'header';
const titleTestID = 'title';
const endStyle = textStyle('button-md');

describe('whether a title fits between the two ends', () => {
  it('fits when its longest word and a gap on each side fit between the wider end twice', () => {
    expect(
      titleFitsBetween({ rowWidth: 343, startWidth: 44, endWidth: 70, longestWord: 180, gap: 8 }),
    ).toBe(true);
  });

  it('does not fit when its longest word is wider than the room between the ends', () => {
    expect(
      titleFitsBetween({ rowWidth: 343, startWidth: 44, endWidth: 70, longestWord: 190, gap: 8 }),
    ).toBe(false);
  });

  it('sizes the room from the wider end, so the title stays in the middle of the glass', () => {
    expect(
      titleFitsBetween({ rowWidth: 343, startWidth: 120, endWidth: 44, longestWord: 100, gap: 8 }),
    ).toBe(false);
  });

  it('takes the buttons beside the title off the room, so a title that fitted alone moves under', () => {
    const widths = { rowWidth: 343, startWidth: 44, endWidth: 70, longestWord: 150, gap: 8 };

    expect(titleFitsBetween(widths)).toBe(true);
    expect(titleFitsBetween({ ...widths, besideTitle: 104 })).toBe(false);
  });
});

async function theHeaderWithArrows(title: string): Promise<void> {
  await render(
    <ScreenHeader
      afterTitle={<Pressable accessibilityRole="button" testID="later" />}
      beforeTitle={<Pressable accessibilityRole="button" testID="earlier" />}
      end={<Pressable accessibilityRole="button" testID="cancel" />}
      start={<Pressable accessibilityRole="button" testID="back" />}
      testID={headerTestID}
      title={title}
      titleTestID={titleTestID}
    />,
  );
}

async function measuredWithArrows(
  rowWidth: number,
  words: Readonly<Record<string, number>>,
): Promise<void> {
  await measured(rowWidth, words);
  await layOut(screenHeaderBeforeTitleTestID(headerTestID), 44);
  await layOut(screenHeaderAfterTitleTestID(headerTestID), 44);
}

function drawnOrderWithArrows(): readonly string[] {
  return screen
    .getAllByTestId(/^(back|earlier|title|later|cancel)$/)
    .map((element) => element.props.testID as string);
}

describe('a header with a button on each side of the title', () => {
  it('draws the buttons right beside the title, between the two ends, when it fits', async () => {
    await theHeaderWithArrows('Ноябрь 2026');
    await measuredWithArrows(343, { Ноябрь: 70, '2026': 44 });

    expect(styleOf(headerTestID).flexDirection).toBe('row');
    expect(drawnOrderWithArrows()).toEqual(['back', 'earlier', 'title', 'later', 'cancel']);
  });

  it('moves the title and both its buttons under the ends when the title does not fit', async () => {
    await theHeaderWithArrows('Ноябрь 2026');
    await measuredWithArrows(343, { Ноябрь: 100, '2026': 57 });

    expect(styleOf(headerTestID).flexDirection).toBe('column');
    expect(drawnOrderWithArrows()).toEqual(['back', 'cancel', 'earlier', 'title', 'later']);
  });

  it('keeps both buttons at their full size and never shrinks or cuts the title', async () => {
    await theHeaderWithArrows('Ноябрь 2026');
    await measuredWithArrows(343, { Ноябрь: 100, '2026': 57 });

    expect(styleOf(screenHeaderBeforeTitleTestID(headerTestID)).flexShrink).toBe(0);
    expect(styleOf(screenHeaderAfterTitleTestID(headerTestID)).flexShrink).toBe(0);
    expect(screen.getByTestId(titleTestID).props.numberOfLines).toBeUndefined();
    expect(styleOf(titleTestID).fontSize).toBe(textStyle('headline-sm').fontSize);
  });

  it('keeps the title between the ends until both buttons beside it are measured', async () => {
    await theHeaderWithArrows('Ноябрь 2026');
    await measured(343, { Ноябрь: 100, '2026': 57 });

    expect(styleOf(headerTestID).flexDirection).toBe('row');
  });
});

async function theHeader(title: string): Promise<void> {
  await render(
    <ScreenHeader
      end={
        <Pressable accessibilityRole="button" testID="cancel">
          <Text style={endStyle} testID="cancel-label">
            Отмена
          </Text>
        </Pressable>
      }
      start={<Pressable accessibilityLabel="Назад" accessibilityRole="button" testID="back" />}
      testID={headerTestID}
      title={title}
      titleTestID={titleTestID}
    />,
  );
}

async function layOut(testID: string, width: number): Promise<void> {
  await act(() =>
    fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 44 } },
    }),
  );
}

async function measured(rowWidth: number, words: Readonly<Record<string, number>>): Promise<void> {
  await layOut(headerTestID, rowWidth);
  await layOut(screenHeaderStartTestID(headerTestID), 44);
  await layOut(screenHeaderEndTestID(headerTestID), 70);
  for (const [word, width] of Object.entries(words)) {
    await layOut(screenHeaderWordTestID(headerTestID, word), width);
  }
}

function styleOf(testID: string): ViewStyle & TextStyle {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style) as ViewStyle & TextStyle;
}

function drawnOrder(): readonly string[] {
  return screen
    .getAllByTestId(/^(back|title|cancel)$/)
    .map((element) => element.props.testID as string);
}

describe('a header drawn on a phone', () => {
  it('draws the title between the two ends when its longest word fits', async () => {
    await theHeader('Ноябрь 2026');
    await measured(343, { Ноябрь: 90, '2026': 50 });

    expect(styleOf(headerTestID).flexDirection).toBe('row');
    expect(drawnOrder()).toEqual(['back', 'title', 'cancel']);
  });

  it('moves the title under the two ends when its longest word does not fit between them', async () => {
    await theHeader('Продолжительность цикла');
    await measured(343, { Продолжительность: 230, цикла: 60 });

    expect(styleOf(headerTestID).flexDirection).toBe('column');
    expect(drawnOrder()).toEqual(['back', 'cancel', 'title']);
  });

  it('never cuts the title or shrinks it, so it wraps between words', async () => {
    await theHeader('Продолжительность цикла');
    await measured(343, { Продолжительность: 230, цикла: 60 });

    const title = screen.getByTestId(titleTestID);

    expect(title.props.numberOfLines).toBeUndefined();
    expect(title.props.adjustsFontSizeToFit).toBeUndefined();
    expect(styleOf(titleTestID).fontSize).toBe(textStyle('headline-sm').fontSize);
  });

  it('gives both ends the width of the wider one, and never less', async () => {
    await theHeader('Ноябрь 2026');
    await measured(343, { Ноябрь: 90, '2026': 50 });

    for (const side of ['start', 'end']) {
      const drawn = StyleSheet.flatten(
        screen.getByTestId(`${headerTestID}-${side}-side`).props.style,
      ) as ViewStyle;

      expect(drawn.minWidth).toBe(70);
      expect(drawn.flexShrink).toBe(0);
    }
  });

  it('keeps the end word at its own size', async () => {
    await theHeader('Продолжительность цикла');
    await measured(343, { Продолжительность: 230, цикла: 60 });

    expect(styleOf('cancel-label').fontSize).toBe(endStyle.fontSize);
    expect(styleOf(screenHeaderEndTestID(headerTestID)).flexShrink).toBe(0);
  });

  it('reads the title to a screen reader once, as a header', async () => {
    await theHeader('Ноябрь 2026');

    const read = screen.getAllByText('Ноябрь 2026');

    expect(read).toHaveLength(1);
    expect(read[0]?.props.accessibilityRole).toBe('header');
  });

  it('measures each word of the title at the size of the title, on one line', async () => {
    await theHeader('Ноябрь 2026');

    const word = screen.getByTestId(screenHeaderWordTestID(headerTestID, 'Ноябрь'), {
      includeHiddenElements: true,
    });

    expect(word.props.numberOfLines).toBe(1);
    expect((StyleSheet.flatten(word.props.style) as TextStyle).fontSize).toBe(
      textStyle('headline-sm').fontSize,
    );
  });

  it('keeps the title between the ends until every word is measured', async () => {
    await theHeader('Продолжительность цикла');
    await layOut(headerTestID, 343);
    await layOut(screenHeaderStartTestID(headerTestID), 44);
    await layOut(screenHeaderEndTestID(headerTestID), 70);

    expect(styleOf(headerTestID).flexDirection).toBe('row');
  });

  it('draws a header with no end, and keeps the title in the middle', async () => {
    await render(
      <ScreenHeader
        start={<Pressable accessibilityRole="button" testID="back" />}
        testID={headerTestID}
        title="Ноябрь 2026"
        titleTestID={titleTestID}
      />,
    );

    expect(screen.getByTestId(`${headerTestID}-end-side`)).toBeTruthy();
    expect(screen.getByTestId(titleTestID)).toBeTruthy();
  });
});
