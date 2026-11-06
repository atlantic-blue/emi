import { textStyle } from '@emi/tokens';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import * as TheReactTheApplicationShips from 'react';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import {
  screenHeaderEndTestID,
  screenHeaderStartTestID,
  screenHeaderWordTestID,
} from '../../../src/components/ScreenHeader';
import {
  answerBackTestID,
  answerCancelTestID,
  answerHeaderTestID,
  answerTitleTestID,
} from '../../../src/features/settings/AnswerScreen';
import type { Language } from '../../../src/language/language';

let mockPhoneTag: string | undefined = 'en-GB';

// The catalogue is read once when the test identifiers are imported, before this file sets the tag.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockPhoneTag ?? 'en-GB' }],
}));

/**
 * The header of an answer she changes, here the cycle length: the way back, the title and Cancel.
 * The title wraps between words and is never cut, and the way back and Cancel keep their full size
 * on the glass. When the longest word of the title does not fit between them, the title moves to
 * its own line under them.
 *
 * The widths were read on the iPhone SE (3rd generation) simulator: the header row, the way back,
 * Cancel, and each word of the title on one line.
 */

interface Measured {
  readonly cancel: number;
  readonly words: Readonly<Record<string, number>>;
}

const theRowOnTheSmallestIPhone = 351;
const theWayBack = 44;

const theCases: readonly {
  readonly language: Language;
  readonly size: string;
  readonly title: string;
  readonly measured: Measured;
  readonly isTitleUnder: boolean;
}[] = [
  {
    language: 'en',
    size: 'the largest',
    title: 'Cycle length',
    measured: { cancel: 70, words: { Cycle: 63, length: 70 } },
    isTitleUnder: false,
  },
  {
    language: 'es',
    size: 'the largest',
    title: 'Duración del ciclo',
    measured: { cancel: 85.5, words: { Duración: 98.5, del: 33.5, ciclo: 52 } },
    isTitleUnder: false,
  },
  {
    language: 'ru',
    size: 'the largest',
    title: 'Продолжительность цикла',
    measured: { cancel: 81.5, words: { Продолжительность: 252, цикла: 75.5 } },
    isTitleUnder: true,
  },
  {
    language: 'ru',
    size: 'the normal',
    title: 'Продолжительность цикла',
    measured: { cancel: 66.5, words: { Продолжительность: 194, цикла: 58 } },
    isTitleUnder: false,
  },
];

const thePhoneOf: Readonly<Record<Language, string>> = { en: 'en-GB', es: 'es-ES', ru: 'ru-RU' };

const doNothing = (): undefined => undefined;

function theAnswerIn(language: Language): TheReactTheApplicationShips.ReactElement {
  mockPhoneTag = thePhoneOf[language];

  let drawn: TheReactTheApplicationShips.ReactElement | undefined;

  jest.isolateModules(() => {
    jest.doMock('react', () => TheReactTheApplicationShips);
    const { OnAPhone } = jest.requireActual('../../fixtures/theSafeArea');
    const change = jest.requireActual('../../../src/features/settings/ChangeCycleLength');
    const create = TheReactTheApplicationShips.createElement;

    drawn = create(
      OnAPhone,
      null,
      create(change.ChangeCycleLength, { gave: 28, onSave: doNothing, onCancel: doNothing }),
    );
  });

  if (drawn === undefined) {
    throw new Error(`nothing drew the cycle length answer for a phone reading ${language}`);
  }

  return drawn;
}

async function layOut(testID: string, width: number): Promise<void> {
  await fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 30 } },
  });
}

async function thePhoneLaysOutTheHeader(title: string, measured: Measured): Promise<void> {
  await layOut(answerHeaderTestID, theRowOnTheSmallestIPhone);
  await layOut(screenHeaderStartTestID(answerHeaderTestID), theWayBack);
  await layOut(screenHeaderEndTestID(answerHeaderTestID), measured.cancel);
  for (const word of title.split(/\s+/)) {
    const width = measured.words[word];

    if (width === undefined) {
      throw new Error(`no width was read on the simulator for "${word}"`);
    }
    await layOut(screenHeaderWordTestID(answerHeaderTestID, word), width);
  }
}

function styleOf<T>(testID: string): T {
  return (StyleSheet.flatten(screen.getByTestId(testID).props.style) ?? {}) as T;
}

describe('the header of the cycle length answer on the smallest iPhone', () => {
  afterEach(() => {
    jest.resetModules();
  });

  for (const { language, size, title, measured, isTitleUnder } of theCases) {
    const at = `in ${language} at ${size} text size`;

    it(`should draw the whole title, never cut and at its own size, ${at}`, async () => {
      await render(theAnswerIn(language));
      await thePhoneLaysOutTheHeader(title, measured);

      const drawn = screen.getByTestId(answerTitleTestID);

      expect(drawn).toHaveTextContent(title);
      expect(drawn.props.numberOfLines).toBeUndefined();
      expect(drawn.props.adjustsFontSizeToFit).toBeFalsy();
      expect((StyleSheet.flatten(drawn.props.style) as TextStyle).fontSize).toBe(
        textStyle('headline-sm').fontSize,
      );
    });

    it(`should ${isTitleUnder ? 'move the title under' : 'keep the title between'} the buttons ${at}`, async () => {
      await render(theAnswerIn(language));
      await thePhoneLaysOutTheHeader(title, measured);

      expect(styleOf<ViewStyle>(answerHeaderTestID).flexDirection).toBe(
        isTitleUnder ? 'column' : 'row',
      );
    });

    it(`should keep the way back and Cancel at their full size, on the glass, ${at}`, async () => {
      await render(theAnswerIn(language));
      await thePhoneLaysOutTheHeader(title, measured);

      const side = Math.ceil(Math.max(theWayBack, measured.cancel));
      const label = within(screen.getByTestId(answerCancelTestID)).getByText(/\S/);

      expect(styleOf<ViewStyle>(screenHeaderStartTestID(answerHeaderTestID)).flexShrink).toBe(0);
      expect(styleOf<ViewStyle>(screenHeaderEndTestID(answerHeaderTestID)).flexShrink).toBe(0);
      expect(styleOf<ViewStyle>(`${answerHeaderTestID}-start-side`).minWidth).toBe(side);
      expect(styleOf<ViewStyle>(`${answerHeaderTestID}-end-side`).minWidth).toBe(side);
      expect(2 * side).toBeLessThanOrEqual(theRowOnTheSmallestIPhone);
      expect((StyleSheet.flatten(label.props.style) as TextStyle).fontSize).toBe(
        textStyle('label-md').fontSize,
      );
      expect(label.props.adjustsFontSizeToFit).toBeFalsy();
    });

    it(`should read the way back, ${isTitleUnder ? 'Cancel and the title' : 'the title and Cancel'} in that order ${at}`, async () => {
      await render(theAnswerIn(language));
      await thePhoneLaysOutTheHeader(title, measured);

      const order = screen
        .getAllByTestId(
          new RegExp(`^(${answerBackTestID}|${answerTitleTestID}|${answerCancelTestID})$`),
        )
        .map((element) => element.props.testID as string);

      expect(order).toEqual(
        isTitleUnder
          ? [answerBackTestID, answerCancelTestID, answerTitleTestID]
          : [answerBackTestID, answerTitleTestID, answerCancelTestID],
      );
    });
  }
});
