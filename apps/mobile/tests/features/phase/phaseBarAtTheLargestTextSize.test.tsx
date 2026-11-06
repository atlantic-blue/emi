import { type CyclePhaseName, cyclePhaseDays } from '@emi/cycle';
import { phaseNames, textStyle } from '@emi/tokens';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as TheReactTheApplicationShips from 'react';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { fluidGridCellTestID, fluidGridWordTestID } from '../../../src/components/FluidGrid';
import { cutsAWord } from '../../../src/components/WholeWordsText';
import {
  phaseBarGridTestID,
  phaseBarLabelTestID,
  phaseBarPartTestID,
} from '../../../src/features/phase/PhaseBar';
import type { Language } from '../../../src/language/language';

let mockPhoneTag: string | undefined = 'en-GB';

// The catalogue is read once when the test identifiers are imported, before this file sets the tag.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockPhoneTag ?? 'en-GB' }],
}));

/**
 * The four phases under the bars wrap onto more lines, in phase order, when the widest word of a
 * phase does not fit a quarter of the row. No word breaks and no label shrinks.
 *
 * The widths were read on the iPhone SE (3rd generation) simulator, from the words the grid
 * measures. Each holds the side room of a part, because the grid measures the word with it.
 */

const theRowOnTheSmallestIPhone = 341;

type Measured = Readonly<Record<string, number>>;

const theDigits: Measured = { 1: 12.5, 3: 14.5, 4: 15.5, 13: 21, 14: 22, 18: 21.5, 19: 21, 28: 24 };

const theRussianDigits: Measured = { 1: 15, 3: 15, 4: 15, 13: 24, 14: 24, 18: 24, 19: 24, 28: 24 };

const wordsAtTheLargestTextSize: Readonly<Record<Language, Measured>> = {
  en: {
    ...theDigits,
    Period: 51,
    Follicular: 69,
    Ovulation: 73.5,
    Luteal: 48.5,
    days: 38.5,
    to: 21,
  },
  es: {
    ...theDigits,
    Periodo: 59.5,
    Folicular: 65,
    Ovulación: 75.5,
    Lútea: 45,
    días: 34,
    a: 14,
  },
  ru: {
    ...theRussianDigits,
    Месячные: 83,
    Фолликулярная: 129.5,
    Овуляция: 80.5,
    Лютеиновая: 102,
    дни: 34.5,
    с: 14,
    по: 25,
  },
};

const russianAtTheNormalSize: Measured = {
  1: 13,
  3: 13,
  4: 13.5,
  13: 20,
  14: 20,
  18: 20,
  19: 20,
  28: 20,
  Месячные: 65.5,
  Фолликулярная: 102,
  Овуляция: 64,
  Лютеиновая: 80.5,
  дни: 28.5,
  с: 12.5,
  по: 20.5,
};

const thePhoneOf: Readonly<Record<Language, string>> = { en: 'en-GB', es: 'es-ES', ru: 'ru-RU' };

const theDays = cyclePhaseDays({ cycleLengthDays: 28, periodLengthDays: 3, ovulationDay: 16 });

function theBarIn(language: Language): TheReactTheApplicationShips.ReactElement {
  mockPhoneTag = thePhoneOf[language];

  let drawn: TheReactTheApplicationShips.ReactElement | undefined;

  jest.isolateModules(() => {
    jest.doMock('react', () => TheReactTheApplicationShips);
    const { OnAPhone } = jest.requireActual('../../fixtures/theSafeArea');
    const bar = jest.requireActual('../../../src/features/phase/PhaseBar');
    const create = TheReactTheApplicationShips.createElement;

    drawn = create(
      OnAPhone,
      null,
      create(bar.PhaseBar, { phase: 'luteal' satisfies CyclePhaseName, phaseDays: theDays }),
    );
  });

  if (drawn === undefined) {
    throw new Error(`nothing drew the phase bar for a phone reading ${language}`);
  }

  return drawn;
}

function theLabelOf(phase: CyclePhaseName): string {
  return String(screen.getByTestId(phaseBarLabelTestID(phase)).props.children);
}

function wordsOf(label: string): string[] {
  return label.split(/\s+/).filter((word) => word !== '');
}

async function thePhoneLaysOutTheBar(measured: Measured): Promise<void> {
  await fireEvent(screen.getByTestId(phaseBarGridTestID), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: theRowOnTheSmallestIPhone, height: 100 } },
  });
  const words = new Set(phaseNames.flatMap((phase) => wordsOf(theLabelOf(phase))));

  for (const word of words) {
    const width = measured[word];

    if (width === undefined) {
      throw new Error(`no width was read on the simulator for "${word}"`);
    }

    await fireEvent(
      screen.getByTestId(fluidGridWordTestID(phaseBarGridTestID, word), {
        includeHiddenElements: true,
      }),
      'layout',
      { nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } } },
    );
  }
}

function theCellWidth(at: number): number {
  const share = (StyleSheet.flatten(
    screen.getByTestId(fluidGridCellTestID(phaseBarGridTestID, at)).props.style,
  ) ?? {}) as ViewStyle;

  if (typeof share.width !== 'string' || !share.width.endsWith('%')) {
    throw new Error(`the part at ${at} has no share of the row`);
  }

  return (theRowOnTheSmallestIPhone * Number.parseFloat(share.width)) / 100;
}

function theLines(): CyclePhaseName[][] {
  const lines: CyclePhaseName[][] = [];
  let line = 0;
  let from = 0;

  phaseNames.forEach((phase, at) => {
    const width = theCellWidth(at);

    if (from + width > theRowOnTheSmallestIPhone + 0.01) {
      line += 1;
      from = 0;
    }
    from += width;
    lines[line] = [...(lines[line] ?? []), phase];
  });

  return lines;
}

/**
 * The lines the phone draws the label on: a line at each break of the label and between words, and
 * a word wider than its part cut where the room runs out, as the phone cuts it.
 */
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

describe('the phase bar on the smallest iPhone', () => {
  afterEach(() => {
    jest.resetModules();
  });

  for (const { language, size, measured } of theCases) {
    it(`should read the phases in order in ${language} at ${size} text size`, async () => {
      await render(theBarIn(language));
      await thePhoneLaysOutTheBar(measured);

      expect(theLines().flat()).toEqual(phaseNames);
      expect(
        screen
          .getAllByTestId(/^phase-bar-(period|follicular|ovulation|luteal)$/)
          .map((part) => part.props.testID),
      ).toEqual(phaseNames.map(phaseBarPartTestID));
    });

    it(`should never break a word of a phase in ${language} at ${size} text size`, async () => {
      await render(theBarIn(language));
      await thePhoneLaysOutTheBar(measured);

      phaseNames.forEach((phase, at) => {
        const label = theLabelOf(phase);

        expect(cutsAWord(label, theLinesOnThePhone(label, theCellWidth(at), measured))).toBe(false);
      });
    });

    it(`should draw every label at its own size in ${language} at ${size} text size`, async () => {
      await render(theBarIn(language));
      await thePhoneLaysOutTheBar(measured);

      for (const phase of phaseNames) {
        const label = screen.getByTestId(phaseBarLabelTestID(phase));

        expect((StyleSheet.flatten(label.props.style) as TextStyle).fontSize).toBe(
          textStyle('label-sm').fontSize,
        );
        expect(label.props.adjustsFontSizeToFit).toBeFalsy();
      }
    });
  }

  it('should take two lines of two in Russian at the largest text size', async () => {
    await render(theBarIn('ru'));
    await thePhoneLaysOutTheBar(wordsAtTheLargestTextSize.ru);

    expect(theLines()).toEqual([
      ['period', 'follicular'],
      ['ovulation', 'luteal'],
    ]);
  });

  it('should take two lines of two in Russian at the normal text size', async () => {
    await render(theBarIn('ru'));
    await thePhoneLaysOutTheBar(russianAtTheNormalSize);

    expect(theLines()).toEqual([
      ['period', 'follicular'],
      ['ovulation', 'luteal'],
    ]);
  });

  for (const language of ['en', 'es'] as const) {
    it(`should keep the four phases on one line in ${language} at the largest text size`, async () => {
      await render(theBarIn(language));
      await thePhoneLaysOutTheBar(wordsAtTheLargestTextSize[language]);

      expect(theLines()).toEqual([phaseNames]);
    });
  }
});
