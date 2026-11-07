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
  editPeriodCancelTestID,
  editPeriodHeaderTestID,
  editPeriodTitleTestID,
} from '../../../src/features/calendar/EditPeriodScreen';
import type { Language } from '../../../src/language/language';

let mockPhoneTag: string | undefined = 'en-GB';

// The catalogue is read once when the test identifiers are imported, before this file sets the tag.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockPhoneTag ?? 'en-GB' }],
}));

/**
 * The header of Edit my period: Cancel and the title. The title wraps between words and is never
 * cut, and Cancel keeps its full size on the glass. The other end is empty, and it takes the width
 * of Cancel so the title stays in the middle.
 *
 * The widths were read on the iPhone SE (3rd generation) simulator: the header row, Cancel, and
 * each word of the title on one line.
 */

interface Measured {
  readonly cancel: number;
  readonly words: Readonly<Record<string, number>>;
}

const theRowOnTheSmallestIPhone = 343;

const theCases: readonly {
  readonly language: Language;
  readonly size: string;
  readonly title: string;
  readonly measured: Measured;
}[] = [
  {
    language: 'en',
    size: 'the largest',
    title: 'Edit my period',
    measured: { cancel: 58, words: { Edit: 44, my: 35, period: 71 } },
  },
  {
    language: 'es',
    size: 'the largest',
    title: 'Editar mi periodo',
    measured: { cancel: 74.5, words: { Editar: 66, mi: 27.5, periodo: 84.5 } },
  },
  {
    language: 'ru',
    size: 'the largest',
    title: 'Изменить мои месячные',
    measured: { cancel: 70.5, words: { Изменить: 117, мои: 47, месячные: 119.5 } },
  },
  {
    language: 'ru',
    size: 'the normal',
    title: 'Изменить мои месячные',
    measured: { cancel: 54, words: { Изменить: 90, мои: 36.5, месячные: 92 } },
  },
];

const thePhoneOf: Readonly<Record<Language, string>> = { en: 'en-GB', es: 'es-ES', ru: 'ru-RU' };

const doNothing = (): undefined => undefined;

const herPeriod = ['2026-11-03', '2026-11-04', '2026-11-05'];

function editMyPeriodIn(language: Language): TheReactTheApplicationShips.ReactElement {
  mockPhoneTag = thePhoneOf[language];

  let drawn: TheReactTheApplicationShips.ReactElement | undefined;

  jest.isolateModules(() => {
    jest.doMock('react', () => TheReactTheApplicationShips);
    const { OnAPhone } = jest.requireActual('../../fixtures/theSafeArea');
    const edit = jest.requireActual('../../../src/features/calendar/EditPeriodScreen');
    const create = TheReactTheApplicationShips.createElement;

    drawn = create(
      OnAPhone,
      null,
      create(edit.EditPeriodScreen, {
        held: herPeriod,
        listed: herPeriod,
        ticked: herPeriod,
        onToggle: doNothing,
        onAddBefore: doNothing,
        onSave: doNothing,
        onCancel: doNothing,
        onDelete: doNothing,
      }),
    );
  });

  if (drawn === undefined) {
    throw new Error(`nothing drew Edit my period for a phone reading ${language}`);
  }

  return drawn;
}

async function layOut(testID: string, width: number): Promise<void> {
  await fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 30 } },
  });
}

async function thePhoneLaysOutTheHeader(title: string, measured: Measured): Promise<void> {
  await layOut(editPeriodHeaderTestID, theRowOnTheSmallestIPhone);
  await layOut(screenHeaderStartTestID(editPeriodHeaderTestID), measured.cancel);
  await layOut(screenHeaderEndTestID(editPeriodHeaderTestID), 0);
  for (const word of title.split(/\s+/)) {
    const width = measured.words[word];

    if (width === undefined) {
      throw new Error(`no width was read on the simulator for "${word}"`);
    }
    await layOut(screenHeaderWordTestID(editPeriodHeaderTestID, word), width);
  }
}

function styleOf<T>(testID: string): T {
  return (StyleSheet.flatten(screen.getByTestId(testID).props.style) ?? {}) as T;
}

describe('the header of Edit my period on the smallest iPhone', () => {
  afterEach(() => {
    jest.resetModules();
  });

  for (const { language, size, title, measured } of theCases) {
    const at = `in ${language} at ${size} text size`;

    it(`should draw the whole title, never cut and at its own size, ${at}`, async () => {
      await render(editMyPeriodIn(language));
      await thePhoneLaysOutTheHeader(title, measured);

      const drawn = screen.getByTestId(editPeriodTitleTestID);

      expect(drawn).toHaveTextContent(title);
      expect(drawn.props.numberOfLines).toBeUndefined();
      expect(drawn.props.adjustsFontSizeToFit).toBeFalsy();
      expect((StyleSheet.flatten(drawn.props.style) as TextStyle).fontSize).toBe(
        textStyle('headline-sm').fontSize,
      );
    });

    it(`should keep Cancel at its full size, on the glass, ${at}`, async () => {
      await render(editMyPeriodIn(language));
      await thePhoneLaysOutTheHeader(title, measured);

      const side = Math.ceil(measured.cancel);
      const label = within(screen.getByTestId(editPeriodCancelTestID)).getByText(/\S/);

      expect((StyleSheet.flatten(label.props.style) as TextStyle).fontSize).toBe(
        textStyle('choice-sm').fontSize,
      );
      expect(label.props.adjustsFontSizeToFit).toBeFalsy();
      expect(styleOf<ViewStyle>(screenHeaderStartTestID(editPeriodHeaderTestID)).flexShrink).toBe(
        0,
      );
      expect(styleOf<ViewStyle>(`${editPeriodHeaderTestID}-start-side`).minWidth).toBe(side);
      expect(styleOf<ViewStyle>(`${editPeriodHeaderTestID}-end-side`).minWidth).toBe(side);
      expect(2 * side).toBeLessThanOrEqual(theRowOnTheSmallestIPhone);
    });

    it(`should read Cancel before the title ${at}`, async () => {
      await render(editMyPeriodIn(language));
      await thePhoneLaysOutTheHeader(title, measured);

      const order = screen
        .getAllByTestId(new RegExp(`^(${editPeriodCancelTestID}|${editPeriodTitleTestID})$`))
        .map((element) => element.props.testID as string);

      expect(order).toEqual([editPeriodCancelTestID, editPeriodTitleTestID]);
    });
  }
});
