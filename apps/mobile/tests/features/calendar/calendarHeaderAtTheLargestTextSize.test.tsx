import { textStyle } from '@emi/tokens';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as TheReactTheApplicationShips from 'react';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import {
  screenHeaderAfterTitleTestID,
  screenHeaderBeforeTitleTestID,
  screenHeaderWordTestID,
} from '../../../src/components/ScreenHeader';
import {
  calendarBackTestID,
  calendarEarlierTestID,
  calendarLaterTestID,
  calendarHeaderEndTestID,
  calendarHeaderStartTestID,
  calendarHeaderTestID,
  calendarTitleTestID,
  calendarTodayTestID,
} from '../../../src/features/calendar/CalendarScreen';
import type { Language } from '../../../src/language/language';

let mockPhoneTag: string | undefined = 'en-GB';

// The catalogue is read once when the test identifiers are imported, before this file sets the tag.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockPhoneTag ?? 'en-GB' }],
}));

/**
 * The header of the month: the way back, the arrow to the month before, the month, the arrow to the
 * month after, and Today. The month is never cut or shrunk, and the four buttons keep their full
 * size on the glass. When the longest word of the month does not fit between them, the month and
 * its two arrows move to a line of their own under the way back and Today.
 *
 * The widths were read on the iPhone SE (3rd generation) simulator: the header row, the way back,
 * Today, and each word of the month on one line.
 */

interface Measured {
  readonly today: number;
  readonly words: Readonly<Record<string, number>>;
}

const theRowOnTheSmallestIPhone = 343;
const theWayBack = 44;
const anArrow = 44;

const theCases: readonly {
  readonly language: Language;
  readonly size: string;
  readonly title: string;
  readonly measured: Measured;
  readonly line: 'between' | 'under';
}[] = [
  {
    language: 'en',
    size: 'the largest',
    title: 'November 2026',
    measured: { today: 56, words: { November: 115.5, 2026: 56.5 } },
    line: 'under',
  },
  {
    language: 'es',
    size: 'the largest',
    title: 'Noviembre 2026',
    measured: { today: 44, words: { Noviembre: 122, 2026: 56.5 } },
    line: 'between',
  },
  {
    language: 'ru',
    size: 'the largest',
    title: 'Ноябрь 2026',
    measured: { today: 82.5, words: { Ноябрь: 91.5, 2026: 56.5 } },
    line: 'under',
  },
  {
    language: 'ru',
    size: 'the normal',
    title: 'Ноябрь 2026',
    measured: { today: 63.5, words: { Ноябрь: 70.5, 2026: 43.5 } },
    line: 'between',
  },
];

const thePhoneOf: Readonly<Record<Language, string>> = { en: 'en-GB', es: 'es-ES', ru: 'ru-RU' };

function theMonthIn(language: Language): TheReactTheApplicationShips.ReactElement {
  mockPhoneTag = thePhoneOf[language];

  let drawn: TheReactTheApplicationShips.ReactElement | undefined;

  jest.isolateModules(() => {
    jest.doMock('react', () => TheReactTheApplicationShips);
    const { OnAPhone } = jest.requireActual('../../fixtures/theSafeArea');
    const calendar = jest.requireActual('../../../src/features/calendar/CalendarScreen');
    const november = jest.requireActual('../../fixtures/theNovemberSheReads');
    const create = TheReactTheApplicationShips.createElement;

    drawn = create(OnAPhone, null, create(calendar.CalendarScreen, november.theNovemberSheReads()));
  });

  if (drawn === undefined) {
    throw new Error(`nothing drew the month for a phone reading ${language}`);
  }

  return drawn;
}

async function layOut(testID: string, width: number): Promise<void> {
  await fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 30 } },
  });
}

async function thePhoneLaysOutTheHeader(title: string, measured: Measured): Promise<void> {
  await layOut(calendarHeaderTestID, theRowOnTheSmallestIPhone);
  await layOut(calendarHeaderStartTestID, theWayBack);
  await layOut(calendarHeaderEndTestID, measured.today);
  await layOut(screenHeaderBeforeTitleTestID(calendarHeaderTestID), anArrow);
  await layOut(screenHeaderAfterTitleTestID(calendarHeaderTestID), anArrow);
  for (const word of title.split(/\s+/)) {
    const width = measured.words[word];

    if (width === undefined) {
      throw new Error(`no width was read on the simulator for "${word}"`);
    }
    await layOut(screenHeaderWordTestID(calendarHeaderTestID, word), width);
  }
}

function styleOf<T>(testID: string): T {
  return (StyleSheet.flatten(screen.getByTestId(testID).props.style) ?? {}) as T;
}

describe('the header of the month on the smallest iPhone', () => {
  afterEach(() => {
    jest.resetModules();
  });

  for (const { language, size, title, measured, line } of theCases) {
    const at = `in ${language} at ${size} text size`;

    it(`should draw the whole month, never cut and at its own size, between the ways ${at}`, async () => {
      await render(theMonthIn(language));
      await thePhoneLaysOutTheHeader(title, measured);

      const drawn = screen.getByTestId(calendarTitleTestID);

      expect(drawn).toHaveTextContent(title);
      expect(drawn.props.numberOfLines).toBeUndefined();
      expect(drawn.props.adjustsFontSizeToFit).toBeFalsy();
      expect((StyleSheet.flatten(drawn.props.style) as TextStyle).fontSize).toBe(
        textStyle('headline-sm').fontSize,
      );
      expect(styleOf<ViewStyle>(calendarHeaderTestID).flexDirection).toBe(
        line === 'between' ? 'row' : 'column',
      );
    });

    it(`should keep the way back and Today at their full size, on the glass, ${at}`, async () => {
      await render(theMonthIn(language));
      await thePhoneLaysOutTheHeader(title, measured);

      const side = Math.ceil(Math.max(theWayBack, measured.today));

      expect(styleOf<ViewStyle>(calendarHeaderStartTestID).flexShrink).toBe(0);
      expect(styleOf<ViewStyle>(calendarHeaderEndTestID).flexShrink).toBe(0);
      expect(styleOf<ViewStyle>(`${calendarHeaderTestID}-start-side`).minWidth).toBe(side);
      expect(styleOf<ViewStyle>(`${calendarHeaderTestID}-end-side`).minWidth).toBe(side);
      expect(2 * side).toBeLessThanOrEqual(theRowOnTheSmallestIPhone);
    });

    it(`should keep both arrows at their full size beside the month ${at}`, async () => {
      await render(theMonthIn(language));
      await thePhoneLaysOutTheHeader(title, measured);

      for (const arrow of [calendarEarlierTestID, calendarLaterTestID]) {
        expect(styleOf<ViewStyle>(arrow)).toMatchObject({ height: 44, width: 44 });
      }
      expect(
        styleOf<ViewStyle>(screenHeaderBeforeTitleTestID(calendarHeaderTestID)).flexShrink,
      ).toBe(0);
      expect(
        styleOf<ViewStyle>(screenHeaderAfterTitleTestID(calendarHeaderTestID)).flexShrink,
      ).toBe(0);
    });

    it(`should read the ways and the month in the order the line places them ${at}`, async () => {
      await render(theMonthIn(language));
      await thePhoneLaysOutTheHeader(title, measured);

      const order = screen
        .getAllByTestId(
          new RegExp(
            `^(${[calendarBackTestID, calendarEarlierTestID, calendarTitleTestID, calendarLaterTestID, calendarTodayTestID].join('|')})$`,
          ),
        )
        .map((element) => element.props.testID as string);

      expect(order).toEqual(
        line === 'between'
          ? [
              calendarBackTestID,
              calendarEarlierTestID,
              calendarTitleTestID,
              calendarLaterTestID,
              calendarTodayTestID,
            ]
          : [
              calendarBackTestID,
              calendarTodayTestID,
              calendarEarlierTestID,
              calendarTitleTestID,
              calendarLaterTestID,
            ],
      );
    });
  }
});
