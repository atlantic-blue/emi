import type { Focus } from '@emi/crypto';
import { space, textStyle } from '@emi/tokens';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as TheReactTheApplicationShips from 'react';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { fluidGridCellTestID, fluidGridWordTestID } from '../../../src/components/FluidGrid';
import { tileTitleTestID } from '../../../src/components/SelectableTile';
import { cutsAWord } from '../../../src/components/WholeWordsText';
import { focusGridTestID, focusTestID } from '../../../src/features/onboarding/Focus';
import * as theToday from '../../../src/features/onboarding/Today';
import { focusChoices } from '../../../src/features/onboarding/copy';
import type { Language } from '../../../src/language/language';

let mockPhoneTag: string | undefined = 'en-GB';

// The catalogue is read once when the test identifiers are imported, before this file sets the tag.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockPhoneTag ?? 'en-GB' }],
}));

/**
 * The seven focus tiles of the first run wrap onto more lines, in the order of the groups, when
 * the widest word of a name does not fit its tile. No word breaks and no name shrinks.
 *
 * The widths were read on the iPhone SE (3rd generation) simulator, from the words the grid
 * measures. Each holds the sides of a tile and of its cell, less the gap the grid adds itself, so
 * a word fits its tile when its width and that gap fit the cell.
 */

const theRowOnTheSmallestIPhone = 351;

type Measured = Readonly<Record<string, number>>;

const wordsAtTheLargestTextSize: Readonly<Record<Language, Measured>> = {
  en: {
    Sleep: 70,
    Mood: 71,
    Energy: 82.5,
    Skin: 59,
    and: 54,
    hair: 55,
    Appetite: 97.5,
    Digestive: 102.5,
    symptoms: 111.5,
    Pain: 59,
  },
  es: {
    Sueño: 75.5,
    Ánimo: 78,
    Energía: 86.5,
    Piel: 53.5,
    y: 33.5,
    pelo: 59.5,
    Apetito: 87,
    Síntomas: 101.5,
    digestivos: 109.5,
    Dolor: 68.5,
  },
  ru: {
    Сон: 58.5,
    Настроение: 134.5,
    Энергия: 100.5,
    Кожа: 75,
    и: 34.5,
    волосы: 92.5,
    Аппетит: 100,
    Работа: 91,
    ЖКТ: 67,
    Боль: 69,
  },
};

const russianAtTheNormalSize: Measured = {
  Сон: 50.5,
  Настроение: 108.5,
  Энергия: 82.5,
  Кожа: 63,
  и: 32,
  волосы: 76.5,
  Аппетит: 82,
  Работа: 75,
  ЖКТ: 57,
  Боль: 58.5,
};

const thePhoneOf: Readonly<Record<Language, string>> = { en: 'en-GB', es: 'es-ES', ru: 'ru-RU' };

function theFocusIn(language: Language): TheReactTheApplicationShips.ReactElement {
  mockPhoneTag = thePhoneOf[language];

  let drawn: TheReactTheApplicationShips.ReactElement | undefined;

  jest.isolateModules(() => {
    jest.doMock('react', () => TheReactTheApplicationShips);
    const { OnAPhone } = jest.requireActual('../../fixtures/theSafeArea');
    const focus = jest.requireActual('../../../src/features/onboarding/Focus');
    const create = TheReactTheApplicationShips.createElement;
    const doNothing = (): undefined => undefined;

    drawn = create(
      OnAPhone,
      null,
      create(focus.Focus, {
        chosen: [],
        onPress: doNothing,
        onContinue: doNothing,
        onBack: doNothing,
        onSkip: doNothing,
      }),
    );
  });

  if (drawn === undefined) {
    throw new Error(`nothing drew the focus question for a phone reading ${language}`);
  }

  return drawn;
}

function theNameOf(group: Focus): string {
  return String(screen.getByTestId(tileTitleTestID(focusTestID(group))).props.children);
}

function wordsOf(label: string): string[] {
  return label.split(/\s+/).filter((word) => word !== '');
}

async function thePhoneLaysOutTheGrid(measured: Measured): Promise<void> {
  await fireEvent(screen.getByTestId(focusGridTestID), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: theRowOnTheSmallestIPhone, height: 400 } },
  });
  const words = new Set(focusChoices.flatMap((group) => wordsOf(theNameOf(group))));

  for (const word of words) {
    const width = measured[word];

    if (width === undefined) {
      throw new Error(`no width was read on the simulator for "${word}"`);
    }

    await fireEvent(
      screen.getByTestId(fluidGridWordTestID(focusGridTestID, word), {
        includeHiddenElements: true,
      }),
      'layout',
      { nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } } },
    );
  }
}

function theCellWidth(at: number): number {
  const share = (StyleSheet.flatten(
    screen.getByTestId(fluidGridCellTestID(focusGridTestID, at)).props.style,
  ) ?? {}) as ViewStyle;

  if (typeof share.width !== 'string' || !share.width.endsWith('%')) {
    throw new Error(`the tile at ${at} has no share of the row`);
  }

  return (theRowOnTheSmallestIPhone * Number.parseFloat(share.width)) / 100;
}

function theLines(): Focus[][] {
  const lines: Focus[][] = [];
  let line = 0;
  let from = 0;

  focusChoices.forEach((group, at) => {
    const width = theCellWidth(at);

    if (from + width > theRowOnTheSmallestIPhone + 0.01) {
      line += 1;
      from = 0;
    }
    from += width;
    lines[line] = [...(lines[line] ?? []), group];
  });

  return lines;
}

/** The lines the phone draws a name on, with a word wider than its tile cut where it runs out. */
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

function inRowsOf(count: number): Focus[][] {
  const rows: Focus[][] = [];

  for (let at = 0; at < focusChoices.length; at += count) {
    rows.push(focusChoices.slice(at, at + count));
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

describe('the focus tiles on the smallest iPhone', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('should carry no fallback to a narrower grid on the Today question', () => {
    expect(Object.keys(theToday)).not.toContain('NARROW_TILE_BASIS');
  });

  for (const { language, size, measured, columns } of theCases) {
    it(`should read the groups in order, ${columns} to a row, in ${language} at ${size} text size`, async () => {
      await render(theFocusIn(language));
      await thePhoneLaysOutTheGrid(measured);

      expect(theLines()).toEqual(inRowsOf(columns));
    });

    it(`should never break a word of a name in ${language} at ${size} text size`, async () => {
      await render(theFocusIn(language));
      await thePhoneLaysOutTheGrid(measured);

      focusChoices.forEach((group, at) => {
        const name = theNameOf(group);
        const room = theCellWidth(at) - space.spaceXs;

        expect(cutsAWord(name, theLinesOnThePhone(name, room, measured))).toBe(false);
      });
    });

    it(`should draw every name at its own size in ${language} at ${size} text size`, async () => {
      await render(theFocusIn(language));
      await thePhoneLaysOutTheGrid(measured);

      for (const group of focusChoices) {
        const name = screen.getByTestId(tileTitleTestID(focusTestID(group)));

        expect((StyleSheet.flatten(name.props.style) as TextStyle).fontSize).toBe(
          textStyle('choice-sm').fontSize,
        );
        expect(name.props.adjustsFontSizeToFit).toBeFalsy();
        expect(name.props.onTextLayout).toBeUndefined();
      }
    });
  }
});
