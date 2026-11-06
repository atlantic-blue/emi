import { type PublishedMeasurement, publishedFigures } from '@emi/cycle';
import { textStyle } from '@emi/tokens';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as TheReactTheApplicationShips from 'react';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { headingRowEndTestID, headingRowMeasureTestID } from '../../../src/components/HeadingRow';
import {
  citationFigureTestID,
  citationLabelTestID,
  citationLeadTestID,
  citationPaperTestID,
} from '../../../src/features/cycle/CitationRow';
import {
  sexPageChooseDayTestID,
  sexPageDayRowTestID,
  sexPageDayTestID,
} from '../../../src/features/sex/SexPage';
import type { Language } from '../../../src/language/language';

let mockPhoneTag: string | undefined = 'en-GB';

// The catalogue is read once when the test identifiers are imported, before this file sets the tag.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockPhoneTag ?? 'en-GB' }],
}));

/**
 * The date on the sex page and the label of each published figure share a row with a link or a
 * value. The two stay on one line while both fit at their own size. When they do not, the link or
 * the value moves under the heading, and neither shrinks.
 *
 * The widths were read on the iPhone SE (3rd generation) simulator, from the heading on one line
 * and the end at its own size.
 */

interface Top {
  readonly heading: number;
  readonly end: number;
}

type Figures = Readonly<Record<PublishedMeasurement, Top>>;

interface Measured {
  readonly date: Top;
  readonly figures: Figures;
}

const theDateRow = 335;
const theFigureRow = 311;

const theCases: readonly {
  readonly language: Language;
  readonly size: string;
  readonly measured: Measured;
  readonly isDateStacked: boolean;
  readonly stackedFigures: readonly PublishedMeasurement[];
}[] = [
  {
    language: 'en',
    size: 'the largest',
    measured: {
      date: { heading: 176.5, end: 164.5 },
      figures: {
        'cycle-length': { heading: 103, end: 106 },
        'period-duration': { heading: 108.5, end: 95.5 },
        'cycle-length-variation': { heading: 178, end: 64.5 },
      },
    },
    isDateStacked: true,
    stackedFigures: [],
  },
  {
    language: 'es',
    size: 'the largest',
    measured: {
      date: { heading: 218.5, end: 113.5 },
      figures: {
        'cycle-length': { heading: 145, end: 116.5 },
        'period-duration': { heading: 160.5, end: 92.5 },
        'cycle-length-variation': { heading: 267, end: 59.5 },
      },
    },
    isDateStacked: true,
    stackedFigures: ['cycle-length-variation'],
  },
  {
    language: 'ru',
    size: 'the largest',
    measured: {
      date: { heading: 187, end: 192 },
      figures: {
        'cycle-length': { heading: 117.5, end: 142 },
        'period-duration': { heading: 246.5, end: 83 },
        'cycle-length-variation': { heading: 195.5, end: 61 },
      },
    },
    isDateStacked: true,
    stackedFigures: ['period-duration'],
  },
  {
    language: 'ru',
    size: 'the normal',
    measured: {
      date: { heading: 144, end: 147.5 },
      figures: {
        'cycle-length': { heading: 90.5, end: 109.5 },
        'period-duration': { heading: 189.5, end: 64 },
        'cycle-length-variation': { heading: 150.5, end: 47 },
      },
    },
    isDateStacked: false,
    stackedFigures: [],
  },
];

const thePhoneOf: Readonly<Record<Language, string>> = { en: 'en-GB', es: 'es-ES', ru: 'ru-RU' };

const doNothing = (): undefined => undefined;

function drawnIn(
  language: Language,
  draw: (create: typeof TheReactTheApplicationShips.createElement) => unknown,
): TheReactTheApplicationShips.ReactElement {
  mockPhoneTag = thePhoneOf[language];

  let drawn: TheReactTheApplicationShips.ReactElement | undefined;

  jest.isolateModules(() => {
    jest.doMock('react', () => TheReactTheApplicationShips);
    const { OnAPhone } = jest.requireActual('../../fixtures/theSafeArea');
    const create = TheReactTheApplicationShips.createElement;

    drawn = create(OnAPhone, null, draw(create) as TheReactTheApplicationShips.ReactElement);
  });

  if (drawn === undefined) {
    throw new Error(`nothing drew the page for a phone reading ${language}`);
  }

  return drawn;
}

function theSexPageIn(language: Language): TheReactTheApplicationShips.ReactElement {
  return drawnIn(language, (create) => {
    const sex = jest.requireActual('../../../src/features/sex/SexPage');
    const copy = jest.requireActual('../../../src/features/sex/copy');

    return create(sex.SexPage, {
      day: '2026-11-06',
      today: '2026-11-06',
      heading: copy.sexDayHeading('2026-11-06'),
      question: 'Did you have sex today?',
      held: {},
      onBack: doNothing,
      onSave: doNothing,
      onChooseDay: doNothing,
      onHighlight: doNothing,
    });
  });
}

function theFiguresIn(language: Language): TheReactTheApplicationShips.ReactElement {
  return drawnIn(language, (create) => {
    const figures = jest.requireActual('../../../src/features/cycle/CitationRow');

    return create(figures.FiguresScreen, { figures: publishedFigures, onBack: doNothing });
  });
}

async function layOut(testID: string, width: number): Promise<void> {
  await fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 30 } },
  });
}

async function thePhoneLaysOut(testID: string, row: number, top: Top): Promise<void> {
  await layOut(testID, row);
  await layOut(headingRowMeasureTestID(testID), top.heading);
  await layOut(headingRowEndTestID(testID), top.end);
}

async function thePhoneLaysOutTheFigures(figures: Figures): Promise<void> {
  for (const figure of publishedFigures) {
    await thePhoneLaysOut(
      citationLeadTestID(figure.measures),
      theFigureRow,
      figures[figure.measures],
    );
  }
}

function styleOf<T>(testID: string): T {
  return (StyleSheet.flatten(screen.getByTestId(testID).props.style) ?? {}) as T;
}

describe('the date row of the sex page on the smallest iPhone', () => {
  afterEach(() => {
    jest.resetModules();
  });

  for (const { language, size, measured, isDateStacked } of theCases) {
    const at = `in ${language} at ${size} text size`;

    it(`should ${isDateStacked ? 'move the link under' : 'keep the link beside'} the date ${at}`, async () => {
      await render(theSexPageIn(language));
      await thePhoneLaysOut(sexPageDayRowTestID, theDateRow, measured.date);

      expect(styleOf<ViewStyle>(sexPageDayRowTestID).flexDirection).toBe(
        isDateStacked ? 'column' : 'row',
      );
    });

    it(`should read the date before the link, and never cut or shrink either ${at}`, async () => {
      await render(theSexPageIn(language));
      await thePhoneLaysOut(sexPageDayRowTestID, theDateRow, measured.date);

      const order = screen
        .getAllByTestId(new RegExp(`^(${sexPageDayTestID}|${sexPageChooseDayTestID})$`))
        .map((element) => element.props.testID as string);
      const date = screen.getByTestId(sexPageDayTestID);

      expect(order).toEqual([sexPageDayTestID, sexPageChooseDayTestID]);
      expect(date.props.numberOfLines).toBeUndefined();
      expect((StyleSheet.flatten(date.props.style) as TextStyle).fontSize).toBe(
        textStyle('label-md').fontSize,
      );
      expect(styleOf<ViewStyle>(headingRowEndTestID(sexPageDayRowTestID)).flexShrink).toBe(0);
    });
  }
});

describe('the rows of the published figures on the smallest iPhone', () => {
  afterEach(() => {
    jest.resetModules();
  });

  for (const { language, size, measured, stackedFigures } of theCases) {
    const at = `in ${language} at ${size} text size`;

    it(`should move a value under its label only where the two do not fit ${at}`, async () => {
      await render(theFiguresIn(language));
      await thePhoneLaysOutTheFigures(measured.figures);

      for (const figure of publishedFigures) {
        expect(styleOf<ViewStyle>(citationLeadTestID(figure.measures)).flexDirection).toBe(
          stackedFigures.includes(figure.measures) ? 'column' : 'row',
        );
      }
    });

    it(`should read the label, the value and then the paper, at full size ${at}`, async () => {
      await render(theFiguresIn(language));
      await thePhoneLaysOutTheFigures(measured.figures);

      for (const figure of publishedFigures) {
        const lead = citationLeadTestID(figure.measures);
        const order = screen
          .getAllByTestId(
            new RegExp(
              `^(${citationLabelTestID(figure.measures)}|${citationFigureTestID(figure.measures)}|${citationPaperTestID(figure.measures)})$`,
            ),
          )
          .map((element) => element.props.testID as string);
        const value = screen.getByTestId(citationFigureTestID(figure.measures));

        expect(order).toEqual([
          citationLabelTestID(figure.measures),
          citationFigureTestID(figure.measures),
          citationPaperTestID(figure.measures),
        ]);
        expect((StyleSheet.flatten(value.props.style) as TextStyle).fontSize).toBe(
          textStyle('label-md').fontSize,
        );
        expect(styleOf<ViewStyle>(headingRowEndTestID(lead)).flexShrink).toBe(0);
        expect(
          screen.getByTestId(citationLabelTestID(figure.measures)).props.numberOfLines,
        ).toBeUndefined();
      }
    });
  }
});
