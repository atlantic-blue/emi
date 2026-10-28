import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { textStyle } from '@emi/tokens';
import { StyleSheet, type TextStyle } from 'react-native';

import { textLinkLabelTestID } from '../../src/components/Button';
import { tileTitleTestID } from '../../src/components/SelectableTile';
import {
  LABEL_SCALES,
  MINIMUM_LABEL_SCALE,
  WholeWordsText,
  cutsAWord,
  isOneWord,
} from '../../src/components/WholeWordsText';
import {
  BOARD_COLUMNS,
  HygieneProductsPage,
  NARROW_COLUMNS,
  productTileNameTestID,
  productTileTestID,
} from '../../src/features/hygiene/HygieneProductsPage';
import { productOrder } from '../../src/features/hygiene/products';
import {
  GroupTiles,
  NARROW_TILES_IN_A_ROW,
  TILES_IN_A_ROW,
  groupTileNameTestID,
  groupTileTestID,
} from '../../src/features/log/GroupTiles';
import { HEADER_END, LogHeader, logHeaderEndTestID } from '../../src/features/log/LogHeader';
import { groupHeadings } from '../../src/features/log/SymptomGroup';
import {
  BOARD_TILE_BASIS,
  NARROW_TILE_BASIS,
  Today,
  todayCellTestID,
  todayTestID,
} from '../../src/features/onboarding/Today';
import { todayChoices, todayLabels } from '../../src/features/onboarding/copy';
import { OnAPhone } from '../fixtures/theSafeArea';

/**
 * Issue 320: on the smallest iPhone, at 375 points, a label in a tile, a chip or a header slot
 * broke inside a word, mostly in Russian. A one word label now shrinks to fit one line, and a label
 * of several words shrinks until no word is cut. Neither goes under 85 per cent of its size.
 */

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'ru-RU' }] }));

const labelStyle = textStyle('label-md');
const LABEL_SIZE = labelStyle.fontSize ?? 0;
const LABEL_LINE = labelStyle.lineHeight ?? 0;

const groups = [
  'sleep',
  'appetite',
  'digestive',
  'skin',
  'mood',
  'energy',
  'pain',
  'head',
  'libido',
] as const;

function styleOf(testID: string): TextStyle {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style) as TextStyle;
}

function expectTheShrinkRule(testID: string): void {
  const text = screen.getByTestId(testID);

  expect(text.props.numberOfLines).toBe(1);
  expect(text.props.adjustsFontSizeToFit).toBe(true);
  expect(text.props.minimumFontScale).toBe(MINIMUM_LABEL_SCALE);
}

function layOut(testID: string, lines: readonly string[]): void {
  fireEvent(screen.getByTestId(testID), 'textLayout', {
    nativeEvent: { lines: lines.map((text) => ({ text })) },
  });
}

describe('a label keeps every word whole', () => {
  it('should hold the floor the operator approved, 85 per cent', () => {
    expect(MINIMUM_LABEL_SCALE).toBe(0.85);
    expect(LABEL_SCALES.at(-1)).toBe(MINIMUM_LABEL_SCALE);
  });

  it('should count a label with no space in it as one word', () => {
    expect(isOneWord('Пищеварение')).toBe(true);
    expect(isOneWord(' Готово ')).toBe(true);
    expect(isOneWord('Кожа и волосы')).toBe(false);
  });

  it('should read a wrap at a space as whole words, kept space or not', () => {
    expect(cutsAWord('Кожа и волосы', [{ text: 'Кожа и ' }, { text: 'волосы' }])).toBe(false);
    expect(cutsAWord('Кожа и волосы', [{ text: 'Кожа и' }, { text: 'волосы' }])).toBe(false);
    expect(cutsAWord('Одна', [{ text: 'Одна' }])).toBe(false);
  });

  it('should read a wrap inside a word as a cut', () => {
    expect(cutsAWord('Менструальные трусы', [{ text: 'Менструал' }, { text: 'ьные трусы' }])).toBe(
      true,
    );
    expect(
      cutsAWord('Многоразовая тканевая прокладка', [
        { text: 'Многоразов' },
        { text: 'ая тканевая ' },
        { text: 'прокладка' },
      ]),
    ).toBe(true);
  });

  it('should accept a wrap after a hyphen, where the word allows it', () => {
    expect(cutsAWord('кое-что', [{ text: 'кое-' }, { text: 'что' }])).toBe(false);
  });

  it('should shrink a label of several words a step at a time while a word is cut, and stop at the floor', async () => {
    const cutAtTheFloor = jest.fn();
    await render(
      <WholeWordsText
        label="Менструальные трусы"
        onWordCutAtTheFloor={cutAtTheFloor}
        style={labelStyle}
        testID="label"
      />,
    );

    for (const scale of LABEL_SCALES) {
      expect(styleOf('label').fontSize).toBeCloseTo(LABEL_SIZE * scale);
      expect(styleOf('label').lineHeight).toBeCloseTo(LABEL_LINE * scale);
      expect(styleOf('label').fontFamily).toBe(labelStyle.fontFamily);
      expect(cutAtTheFloor).not.toHaveBeenCalled();
      await act(() => layOut('label', ['Менструал', 'ьные трусы']));
    }

    expect(styleOf('label').fontSize).toBeCloseTo(LABEL_SIZE * MINIMUM_LABEL_SCALE);
    expect(cutAtTheFloor).toHaveBeenCalledTimes(1);
  });

  it('should keep a label of several words at its own size when it wraps between words', async () => {
    await render(<WholeWordsText label="Кожа и волосы" style={labelStyle} testID="label" />);
    await act(() => layOut('label', ['Кожа и ', 'волосы']));

    expect(styleOf('label').fontSize).toBe(LABEL_SIZE);
  });
});

describe('the Russian labels the beta group saw broken on iPhone SE', () => {
  it('should size every name under the log tiles on one shared scale, with no name shrinking on its own', async () => {
    await render(<GroupTiles groups={groups} onOpen={() => undefined} />);

    expect(groupHeadings.appetite).toBe('Аппетит');
    expect(groupHeadings.digestive).toBe('Работа ЖКТ');
    for (const group of groups) {
      const name = screen.getByTestId(groupTileNameTestID(group));
      expect(name.props.adjustsFontSizeToFit).toBeUndefined();
      expect(name.props.onTextLayout).toBeDefined();
      expect(styleOf(groupTileNameTestID(group)).fontSize).toBe(LABEL_SIZE);
    }
  });

  it('should step every name under the log tiles down together when one word is cut', async () => {
    await render(<GroupTiles groups={groups} onOpen={() => undefined} />);

    await act(() => {
      layOut(groupTileNameTestID('mood'), ['Настроени', 'е']);
      layOut(groupTileNameTestID('digestive'), ['Работ', 'а ЖКТ']);
    });

    for (const group of groups) {
      expect(styleOf(groupTileNameTestID(group)).fontSize).toBeCloseTo(
        LABEL_SIZE * LABEL_SCALES[1],
      );
    }
  });

  it('should lay the log tiles three to a row, at their own size again, when a word is still cut at the floor', async () => {
    await render(<GroupTiles groups={groups} onOpen={() => undefined} />);
    const widthOf = (group: (typeof groups)[number]): unknown =>
      StyleSheet.flatten(screen.getByTestId(groupTileTestID(group)).props.style).width;

    expect(widthOf('mood')).toBe(`${100 / TILES_IN_A_ROW}%`);

    for (let step = 0; step < LABEL_SCALES.length; step += 1) {
      await act(() => layOut(groupTileNameTestID('mood'), ['Настроени', 'е']));
    }

    for (const group of groups) {
      expect(widthOf(group)).toBe(`${100 / NARROW_TILES_IN_A_ROW}%`);
      expect(styleOf(groupTileNameTestID(group)).fontSize).toBe(LABEL_SIZE);
    }
  });

  it('should give each one word feeling on the first run Today screen the shrink rule', async () => {
    await render(
      <OnAPhone>
        <Today
          chosen={[]}
          onAllSymptoms={() => undefined}
          onBack={() => undefined}
          onPress={() => undefined}
          onSave={() => undefined}
          onSkip={() => undefined}
        />
      </OnAPhone>,
    );

    expect(todayChoices.filter((slug) => isOneWord(todayLabels[slug])).length).toBeGreaterThan(0);
    for (const slug of todayChoices) {
      if (isOneWord(todayLabels[slug])) {
        expectTheShrinkRule(tileTitleTestID(todayTestID(slug)));
      } else {
        const title = screen.getByTestId(tileTitleTestID(todayTestID(slug)));
        expect(title.props.onTextLayout).toBeDefined();
      }
    }
  });

  it('should give Done in the log header the shrink rule and an end slot that grows past the board width', async () => {
    await render(
      <LogHeader
        doneLabel="Готово"
        doneTestID="done"
        leave="close"
        leaveLabel="Закрыть"
        onDone={() => undefined}
        onLeave={() => undefined}
        title="Сегодня"
        titleTestID="title"
      />,
    );

    expectTheShrinkRule(textLinkLabelTestID('done') ?? '');
    const slot = StyleSheet.flatten(screen.getByTestId(logHeaderEndTestID).props.style) as {
      readonly width?: number;
      readonly minWidth?: number;
      readonly flexGrow?: number;
    };
    expect(slot.width).toBeUndefined();
    expect(slot.minWidth).toBe(HEADER_END);
    expect(slot.flexGrow).toBe(1);
  });

  it('should lay the hygiene products three to a row when a word is still cut at the floor', async () => {
    await render(
      <OnAPhone>
        <HygieneProductsPage
          onBack={() => undefined}
          onOpen={() => undefined}
          onQuiz={() => undefined}
        />
      </OnAPhone>,
    );
    const first = productOrder[0];
    if (first === undefined) {
      throw new Error('The hygiene page holds no product.');
    }
    const cellWidth = (): unknown =>
      StyleSheet.flatten(screen.getByTestId(productTileTestID(first)).props.style).width;

    expect(cellWidth()).toBe(`${100 / BOARD_COLUMNS}%`);

    for (let step = 0; step < LABEL_SCALES.length; step += 1) {
      await act(() =>
        layOut(productTileNameTestID('period-underwear'), ['Менструал', 'ьные трусы']),
      );
    }

    expect(cellWidth()).toBe(`${100 / NARROW_COLUMNS}%`);
  });
  it('should lay the first run Today tiles two to a row when a word is still cut at the floor', async () => {
    await render(
      <OnAPhone>
        <Today
          chosen={[]}
          onAllSymptoms={() => undefined}
          onBack={() => undefined}
          onPress={() => undefined}
          onSave={() => undefined}
          onSkip={() => undefined}
        />
      </OnAPhone>,
    );
    const basisOf = (slug: (typeof todayChoices)[number]): unknown =>
      StyleSheet.flatten(screen.getByTestId(todayCellTestID(slug)).props.style).flexBasis;
    const floorOf = (slug: (typeof todayChoices)[number]): unknown =>
      StyleSheet.flatten(screen.getByTestId(todayCellTestID(slug)).props.style).minWidth;

    expect(basisOf('cramps')).toBe(BOARD_TILE_BASIS);

    for (let step = 0; step < LABEL_SCALES.length; step += 1) {
      await act(() =>
        layOut(tileTitleTestID(todayTestID('breast-tenderness')), ['Чувствительн', 'ость груди']),
      );
    }

    for (const slug of todayChoices) {
      expect(basisOf(slug)).toBe(NARROW_TILE_BASIS);
      expect(floorOf(slug)).toBe(NARROW_TILE_BASIS);
    }
  });
});
