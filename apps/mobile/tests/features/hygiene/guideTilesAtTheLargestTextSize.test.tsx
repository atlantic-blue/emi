import { textStyle } from '@emi/tokens';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as TheReactTheApplicationShips from 'react';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { fluidGridCellTestID, fluidGridWordTestID } from '../../../src/components/FluidGrid';
import { cutsAWord } from '../../../src/components/WholeWordsText';
import * as theGuide from '../../../src/features/hygiene/HygieneProductsPage';
import {
  hygienePageProductsTestID,
  productTileNameTestID,
  productTileTestID,
} from '../../../src/features/hygiene/HygieneProductsPage';
import { type ProductSlug, productOrder } from '../../../src/features/hygiene/products';
import type { Language } from '../../../src/language/language';

let mockPhoneTag: string | undefined = 'en-GB';

// The catalogue is read once when the test identifiers are imported, before this file sets the tag.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockPhoneTag ?? 'en-GB' }],
}));

/**
 * The eight products of the guide wrap onto more lines, in product order, when the widest word of
 * a name does not fit its column with a gap beside it. No word breaks and no name shrinks.
 *
 * The widths were read on the iPhone SE (3rd generation) simulator, from the words the grid
 * measures.
 */

const theRowOnTheSmallestIPhone = 335;

type Measured = Readonly<Record<string, number>>;

const wordsAtTheLargestTextSize: Readonly<Record<Language, Measured>> = {
  en: {
    Panty: 45.5,
    liner: 34,
    Pad: 29.5,
    Reusable: 70.5,
    cloth: 40,
    pad: 29.5,
    Tampon: 63.5,
    Period: 50.5,
    underwear: 84,
    Menstrual: 77.5,
    cup: 29,
    disc: 32,
    Sponge: 59.5,
  },
  es: {
    Salvaslip: 68.5,
    Compresa: 80,
    de: 19.5,
    tela: 29.5,
    reutilizable: 86,
    Tampón: 63.5,
    Ropa: 40,
    interior: 57.5,
    menstrual: 78,
    Copa: 41.5,
    Disco: 43.5,
    Esponja: 61.5,
  },
  ru: {
    Ежедневная: 107.5,
    прокладка: 95.5,
    Прокладка: 98,
    Многоразовая: 127,
    тканевая: 80.5,
    Тампон: 65.5,
    Менструальные: 138,
    трусы: 52,
    Менструальная: 135.5,
    чаша: 47,
    Менструальный: 139.5,
    диск: 40.5,
    Спонж: 58.5,
  },
};

const russianAtTheNormalSize: Measured = {
  Ежедневная: 82.5,
  прокладка: 73.5,
  Прокладка: 75.5,
  Многоразовая: 98,
  тканевая: 62,
  Тампон: 50.5,
  Менструальные: 106.5,
  трусы: 40,
  Менструальная: 104.5,
  чаша: 36,
  Менструальный: 107,
  диск: 31.5,
  Спонж: 45,
};

const thePhoneOf: Readonly<Record<Language, string>> = { en: 'en-GB', es: 'es-ES', ru: 'ru-RU' };

function theGuideIn(language: Language): TheReactTheApplicationShips.ReactElement {
  mockPhoneTag = thePhoneOf[language];

  let drawn: TheReactTheApplicationShips.ReactElement | undefined;

  jest.isolateModules(() => {
    jest.doMock('react', () => TheReactTheApplicationShips);
    const { OnAPhone } = jest.requireActual('../../fixtures/theSafeArea');
    const page = jest.requireActual('../../../src/features/hygiene/HygieneProductsPage');
    const create = TheReactTheApplicationShips.createElement;
    const doNothing = (): undefined => undefined;

    drawn = create(
      OnAPhone,
      null,
      create(page.HygieneProductsPage, { onBack: doNothing, onOpen: doNothing, onQuiz: doNothing }),
    );
  });

  if (drawn === undefined) {
    throw new Error(`nothing drew the guide for a phone reading ${language}`);
  }

  return drawn;
}

function theNameOf(slug: ProductSlug): string {
  return String(screen.getByTestId(productTileNameTestID(slug)).props.children);
}

function wordsOf(label: string): string[] {
  return label.split(/\s+/).filter((word) => word !== '');
}

async function thePhoneLaysOutTheGrid(measured: Measured): Promise<void> {
  await fireEvent(screen.getByTestId(hygienePageProductsTestID), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: theRowOnTheSmallestIPhone, height: 400 } },
  });
  const words = new Set(productOrder.flatMap((slug) => wordsOf(theNameOf(slug))));

  for (const word of words) {
    const width = measured[word];

    if (width === undefined) {
      throw new Error(`no width was read on the simulator for "${word}"`);
    }

    await fireEvent(
      screen.getByTestId(fluidGridWordTestID(hygienePageProductsTestID, word), {
        includeHiddenElements: true,
      }),
      'layout',
      { nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } } },
    );
  }
}

function theCellWidth(at: number): number {
  const share = (StyleSheet.flatten(
    screen.getByTestId(fluidGridCellTestID(hygienePageProductsTestID, at)).props.style,
  ) ?? {}) as ViewStyle;

  if (typeof share.width !== 'string' || !share.width.endsWith('%')) {
    throw new Error(`the product at ${at} has no share of the row`);
  }

  return (theRowOnTheSmallestIPhone * Number.parseFloat(share.width)) / 100;
}

function theLines(): ProductSlug[][] {
  const lines: ProductSlug[][] = [];
  let line = 0;
  let from = 0;

  productOrder.forEach((slug, at) => {
    const width = theCellWidth(at);

    if (from + width > theRowOnTheSmallestIPhone + 0.01) {
      line += 1;
      from = 0;
    }
    from += width;
    lines[line] = [...(lines[line] ?? []), slug];
  });

  return lines;
}

/** The lines the phone draws a name on, with a word wider than its column cut where it runs out. */
function theLinesOnThePhone(label: string, room: number, measured: Measured): { text: string }[] {
  return wordsOf(label).flatMap((word) => {
    const width = measured[word] ?? 0;

    if (width <= room) {
      return [{ text: word }];
    }

    const fits = Math.max(1, Math.floor((word.length * room) / width));

    return [{ text: word.slice(0, fits) }, { text: word.slice(fits) }];
  });
}

function inRowsOf(count: number): ProductSlug[][] {
  const rows: ProductSlug[][] = [];

  for (let at = 0; at < productOrder.length; at += count) {
    rows.push(productOrder.slice(at, at + count));
  }

  return rows;
}

const theCases: readonly {
  readonly language: Language;
  readonly size: string;
  readonly measured: Measured;
  readonly columns: number;
}[] = [
  { language: 'en', size: 'the largest', measured: wordsAtTheLargestTextSize.en, columns: 3 },
  { language: 'es', size: 'the largest', measured: wordsAtTheLargestTextSize.es, columns: 3 },
  { language: 'ru', size: 'the largest', measured: wordsAtTheLargestTextSize.ru, columns: 2 },
  { language: 'ru', size: 'the normal', measured: russianAtTheNormalSize, columns: 3 },
];

describe('the guide tiles on the smallest iPhone', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('should carry no fallback to a narrower grid', () => {
    expect(Object.keys(theGuide)).not.toContain('NARROW_COLUMNS');
  });

  for (const { language, size, measured, columns } of theCases) {
    it(`should read the products in order, ${columns} to a row, in ${language} at ${size} text size`, async () => {
      await render(theGuideIn(language));
      await thePhoneLaysOutTheGrid(measured);

      expect(theLines()).toEqual(inRowsOf(columns));
      expect(
        screen
          .getAllByTestId(/^hygiene-product-/)
          .map((tile) => tile.props.testID)
          .filter((testID: string) =>
            productOrder.some((slug) => productTileTestID(slug) === testID),
          ),
      ).toEqual(productOrder.map(productTileTestID));
    });

    it(`should never break a word of a name in ${language} at ${size} text size`, async () => {
      await render(theGuideIn(language));
      await thePhoneLaysOutTheGrid(measured);

      productOrder.forEach((slug, at) => {
        const name = theNameOf(slug);

        expect(cutsAWord(name, theLinesOnThePhone(name, theCellWidth(at), measured))).toBe(false);
      });
    });

    it(`should draw every name at its own size in ${language} at ${size} text size`, async () => {
      await render(theGuideIn(language));
      await thePhoneLaysOutTheGrid(measured);

      for (const slug of productOrder) {
        const name = screen.getByTestId(productTileNameTestID(slug));

        expect((StyleSheet.flatten(name.props.style) as TextStyle).fontSize).toBe(
          textStyle('label-md').fontSize,
        );
        expect(name.props.adjustsFontSizeToFit).toBeFalsy();
      }
    });
  }
});
