import { textStyle } from '@emi/tokens';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as TheReactTheApplicationShips from 'react';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { fluidGridCellTestID, fluidGridWordTestID } from '../../../src/components/FluidGrid';
import { cutsAWord } from '../../../src/components/WholeWordsText';
import {
  highlightGridTestID,
  highlightTestID,
  highlightTitleTestID,
} from '../../../src/features/highlight/HighlightRow';
import {
  type HighlightSlug,
  periodHighlights,
  sexHighlights,
} from '../../../src/features/highlight/highlights';
import type { Language } from '../../../src/language/language';

let mockPhoneTag: string | undefined = 'en-GB';

// The catalogue is read once when the test identifiers are imported, before this file sets the tag.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockPhoneTag ?? 'en-GB' }],
}));

/**
 * The round highlight tiles at the top of the period and sex pages keep every word of a title
 * whole. The row is as wide as the tiles and their gaps, and each tile takes its share of it, so a
 * title has the gap beside its column as room too.
 *
 * The widths were read on the iPhone SE (3rd generation) simulator, from the words the grid
 * measures. The row is as wide as the screen asks, which on the SE is narrower than the page.
 */

const theTestID = 'highlights';

type Measured = Readonly<Record<string, number>>;

const wordsAtTheLargestTextSize: Readonly<Record<Language, Measured>> = {
  en: {
    All: 17.5,
    about: 39.5,
    discharge: 66,
    Hygiene: 56,
    products: 60.5,
    Intercourse: 77.5,
    Learn: 37.5,
    more: 35,
    sex: 22.5,
  },
  es: {
    Todo: 33.5,
    sobre: 38,
    el: 12,
    flujo: 30.5,
    Productos: 69,
    de: 17,
    higiene: 49.5,
    Coito: 37.5,
    Aprende: 58,
    más: 27.5,
    sexo: 31,
  },
  ru: {
    Всё: 26,
    о: 9,
    выделениях: 89.5,
    Средства: 69.5,
    гигиены: 61,
    Половой: 64.5,
    акт: 25,
    Узнать: 51,
    больше: 55.5,
    сексе: 40.5,
  },
};

const russianAtTheNormalSize: Measured = {
  Всё: 20.5,
  о: 7,
  выделениях: 69.5,
  Средства: 54,
  гигиены: 47.5,
  Половой: 50,
  акт: 19.5,
  Узнать: 39.5,
  больше: 43,
  сексе: 31.5,
};

const thePhoneOf: Readonly<Record<Language, string>> = { en: 'en-GB', es: 'es-ES', ru: 'ru-RU' };

function theRowIn(
  language: Language,
  slugs: readonly HighlightSlug[],
): TheReactTheApplicationShips.ReactElement {
  mockPhoneTag = thePhoneOf[language];

  let drawn: TheReactTheApplicationShips.ReactElement | undefined;

  jest.isolateModules(() => {
    jest.doMock('react', () => TheReactTheApplicationShips);
    const { OnAPhone } = jest.requireActual('../../fixtures/theSafeArea');
    const row = jest.requireActual('../../../src/features/highlight/HighlightRow');
    const create = TheReactTheApplicationShips.createElement;

    drawn = create(
      OnAPhone,
      null,
      create(row.HighlightRow, { slugs, onOpen: () => undefined, testID: theTestID }),
    );
  });

  if (drawn === undefined) {
    throw new Error(`nothing drew the highlights for a phone reading ${language}`);
  }

  return drawn;
}

/** Points. The most the row may take, read off the view that holds the grid. */
function theRowOf(grid: string): number {
  const holder = screen.getByTestId(grid).parent;
  const { maxWidth } = (StyleSheet.flatten(holder?.props.style) ?? {}) as ViewStyle;

  if (typeof maxWidth !== 'number') {
    throw new Error('the row of highlights has no width of its own');
  }

  return maxWidth;
}

function theTitleOf(slug: HighlightSlug): string {
  return String(screen.getByTestId(highlightTitleTestID(slug)).props.children);
}

function wordsOf(label: string): string[] {
  return label.split(/\s+/).filter((word) => word !== '');
}

async function thePhoneLaysOutTheRow(
  slugs: readonly HighlightSlug[],
  measured: Measured,
): Promise<void> {
  const grid = highlightGridTestID(theTestID);

  await fireEvent(screen.getByTestId(grid), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: theRowOf(grid), height: 120 } },
  });
  const words = new Set(slugs.flatMap((slug) => wordsOf(theTitleOf(slug))));

  for (const word of words) {
    const width = measured[word];

    if (width === undefined) {
      throw new Error(`no width was read on the simulator for "${word}"`);
    }

    await fireEvent(
      screen.getByTestId(fluidGridWordTestID(grid, word), { includeHiddenElements: true }),
      'layout',
      { nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } } },
    );
  }
}

function theCellWidth(at: number): number {
  const share = (StyleSheet.flatten(
    screen.getByTestId(fluidGridCellTestID(highlightGridTestID(theTestID), at)).props.style,
  ) ?? {}) as ViewStyle;

  if (typeof share.width !== 'string' || !share.width.endsWith('%')) {
    throw new Error(`the highlight at ${at} has no share of the row`);
  }

  return (theRowOf(highlightGridTestID(theTestID)) * Number.parseFloat(share.width)) / 100;
}

/** The lines the phone draws a title on, with a word wider than its column cut where it runs out. */
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

const thePages: readonly { readonly page: string; readonly slugs: readonly HighlightSlug[] }[] = [
  { page: 'period', slugs: periodHighlights },
  { page: 'sex', slugs: sexHighlights },
];

const theCases: readonly {
  readonly language: Language;
  readonly size: string;
  readonly measured: Measured;
}[] = [
  { language: 'en', size: 'the largest', measured: wordsAtTheLargestTextSize.en },
  { language: 'es', size: 'the largest', measured: wordsAtTheLargestTextSize.es },
  { language: 'ru', size: 'the largest', measured: wordsAtTheLargestTextSize.ru },
  { language: 'ru', size: 'the normal', measured: russianAtTheNormalSize },
];

describe('the highlight tiles on the smallest iPhone', () => {
  afterEach(() => {
    jest.resetModules();
  });

  for (const { page, slugs } of thePages) {
    for (const { language, size, measured } of theCases) {
      it(`should keep the ${page} page highlights in order on one line in ${language} at ${size} text size`, async () => {
        await render(theRowIn(language, slugs));
        await thePhoneLaysOutTheRow(slugs, measured);

        expect(slugs.map((_slug, at) => theCellWidth(at))).toEqual(slugs.map(() => 104));
        expect(
          screen
            .getAllByTestId(/^highlight-(?!title|grid)/)
            .map((tile) => tile.props.testID)
            .filter((testID: string) => slugs.some((slug) => highlightTestID(slug) === testID)),
        ).toEqual(slugs.map(highlightTestID));
      });

      it(`should never break a word of a ${page} page title in ${language} at ${size} text size`, async () => {
        await render(theRowIn(language, slugs));
        await thePhoneLaysOutTheRow(slugs, measured);

        slugs.forEach((slug, at) => {
          const title = theTitleOf(slug);

          expect(cutsAWord(title, theLinesOnThePhone(title, theCellWidth(at), measured))).toBe(
            false,
          );
        });
      });

      it(`should draw every ${page} page title at its own size in ${language} at ${size} text size`, async () => {
        await render(theRowIn(language, slugs));
        await thePhoneLaysOutTheRow(slugs, measured);

        for (const slug of slugs) {
          const title = screen.getByTestId(highlightTitleTestID(slug));

          expect((StyleSheet.flatten(title.props.style) as TextStyle).fontSize).toBe(
            textStyle('label-sm').fontSize,
          );
          expect(title.props.adjustsFontSizeToFit).toBeFalsy();
        }
      });
    }
  }

  it('should take one column when a word does not fit half the row', async () => {
    await render(theRowIn('ru', periodHighlights));
    await thePhoneLaysOutTheRow(periodHighlights, {
      ...wordsAtTheLargestTextSize.ru,
      выделениях: 120,
    });

    expect(theCellWidth(0)).toBe(208);
  });
});
