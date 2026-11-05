import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { textStyle } from '@emi/tokens';
import { StyleSheet, Text, type TextStyle, type ViewStyle } from 'react-native';

import {
  FluidGrid,
  columnsFor,
  fluidGridCellTestID,
  fluidGridWordTestID,
  wordsOf,
} from '../../src/components/FluidGrid';

/**
 * A row of options wraps onto more lines, in the order of the options, when the longest word of
 * any label does not fit its column. No label shrinks and no word breaks: the row takes fewer
 * columns instead.
 */

const fit = { rowWidth: 343, most: 5, cellAtLeast: 44, gap: 8 };

describe('the columns a row of options takes', () => {
  it('takes every option on one line when the widest word fits a fifth of the row', () => {
    expect(columnsFor({ ...fit, count: 5, widestWord: 50 })).toBe(5);
  });

  it('turns five options that fit four columns into three and two, never four and one', () => {
    expect(columnsFor({ ...fit, count: 5, widestWord: 70 })).toBe(3);
  });

  it('takes fewer columns when a word is wider than a column', () => {
    expect(columnsFor({ ...fit, count: 5, widestWord: 120 })).toBe(2);
  });

  it('keeps the gap between two words, so words that fit exactly are not drawn touching', () => {
    expect(columnsFor({ ...fit, count: 5, widestWord: 343 / 5 })).toBeLessThan(5);
  });

  it('gives each option at least the width of its own drawing', () => {
    expect(columnsFor({ ...fit, count: 5, widestWord: 10, cellAtLeast: 100 })).toBe(3);
  });

  it('never takes more columns than it is allowed', () => {
    expect(columnsFor({ ...fit, count: 9, widestWord: 10, most: 4 })).toBe(3);
  });

  it.each([
    ['a word wider than the row', { count: 5, widestWord: 1000 }],
    ['a row with no width yet', { count: 5, widestWord: 50, rowWidth: 0 }],
    ['no options', { count: 0, widestWord: 50 }],
    ['no columns allowed', { count: 5, widestWord: 50, most: 0 }],
  ])('never takes zero columns, with %s', (_case, asked) => {
    expect(columnsFor({ ...fit, ...asked })).toBeGreaterThanOrEqual(1);
  });
});

describe('the words a row measures', () => {
  it('reads each whole word of each label once', () => {
    expect(wordsOf(['Другие выделения', 'Нет', 'Нет'])).toEqual(['Другие', 'выделения', 'Нет']);
  });

  it('keeps a hyphenated word whole, because a word breaks only at a space', () => {
    expect(wordsOf(['Пред-менструальная фаза'])).toEqual(['Пред-менструальная', 'фаза']);
  });
});

const labels = ['Нет', 'Следы', 'Скудные', 'Средние', 'Обильные'] as const;
const labelStyle = textStyle('label-md');
const gridTestID = 'grid';

async function theGrid(): Promise<void> {
  await render(
    <FluidGrid
      cellAtLeast={44}
      labelStyle={labelStyle}
      labels={labels}
      most={5}
      testID={gridTestID}
    >
      {labels.map((label) => (
        <Text key={label} style={labelStyle} testID={`option-${label}`}>
          {label}
        </Text>
      ))}
    </FluidGrid>,
  );
}

async function layOutTheRow(width: number): Promise<void> {
  await act(() =>
    fireEvent(screen.getByTestId(gridTestID), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 0 } },
    }),
  );
}

async function measure(widths: Readonly<Record<string, number>>): Promise<void> {
  for (const [word, width] of Object.entries(widths)) {
    await act(() =>
      fireEvent(
        screen.getByTestId(fluidGridWordTestID(gridTestID, word), { includeHiddenElements: true }),
        'layout',
        {
          nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
        },
      ),
    );
  }
}

function cellWidths(): readonly unknown[] {
  return labels.map(
    (_label, at) =>
      (
        StyleSheet.flatten(
          screen.getByTestId(fluidGridCellTestID(gridTestID, at)).props.style,
        ) as ViewStyle
      ).width,
  );
}

const narrowWords = { Нет: 30, Следы: 48, Скудные: 56, Средние: 56, Обильные: 58 };
const wideWords = { Нет: 40, Следы: 64, Скудные: 82, Средние: 80, Обильные: 84 };

describe('a row of options drawn on a phone', () => {
  it('lays the five options on one line when every word fits', async () => {
    await theGrid();
    await layOutTheRow(343);
    await measure(narrowWords);

    expect(cellWidths()).toEqual(Array.from({ length: 5 }, () => '20%'));
  });

  it('lays them on two lines of three and two when the widest word does not fit a fifth', async () => {
    await theGrid();
    await layOutTheRow(343);
    await measure(wideWords);

    expect(cellWidths()).toEqual(Array.from({ length: 5 }, () => `${100 / 3}%`));
  });

  it('keeps the options in their order, so the lines read left to right and then down', async () => {
    await theGrid();
    await layOutTheRow(343);
    await measure(wideWords);

    expect(screen.getAllByTestId(/^option-/).map((option) => option.props.testID)).toEqual(
      labels.map((label) => `option-${label}`),
    );
  });

  it('never changes the size of a label', async () => {
    await theGrid();
    await layOutTheRow(343);
    await measure(wideWords);

    for (const label of labels) {
      const drawn = StyleSheet.flatten(
        screen.getByTestId(`option-${label}`).props.style,
      ) as TextStyle;

      expect(drawn.fontSize).toBe(labelStyle.fontSize);
    }
  });

  it('measures each word at the size of the label, on one line', async () => {
    await theGrid();

    const word = screen.getByTestId(fluidGridWordTestID(gridTestID, 'Обильные'), {
      includeHiddenElements: true,
    });
    const drawn = StyleSheet.flatten(word.props.style) as TextStyle;

    expect(drawn.fontSize).toBe(labelStyle.fontSize);
    expect(word.props.numberOfLines).toBe(1);
    expect(word.props.adjustsFontSizeToFit).toBeUndefined();
  });

  it('hides the measured words from a screen reader', async () => {
    await theGrid();

    expect(screen.queryByText('Обильные', { includeHiddenElements: false })).not.toBeNull();
    expect(screen.getAllByText('Обильные', { includeHiddenElements: true })).toHaveLength(2);
  });

  it('waits for every word before it chooses fewer columns', async () => {
    await theGrid();
    await layOutTheRow(343);
    await measure({ Обильные: 84 });

    expect(cellWidths()).toEqual(Array.from({ length: 5 }, () => '20%'));
  });
});
