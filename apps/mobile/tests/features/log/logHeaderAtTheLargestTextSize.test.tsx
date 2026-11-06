import { textStyle } from '@emi/tokens';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as TheReactTheApplicationShips from 'react';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { textLinkLabelTestID } from '../../../src/components/Button';
import {
  screenHeaderEndTestID,
  screenHeaderStartTestID,
  screenHeaderWordTestID,
} from '../../../src/components/ScreenHeader';
import { logFlowDoneTestID, logFlowWhenTestID } from '../../../src/features/log/LogFlow';
import { logHeaderLeaveTestID, logHeaderTestID } from '../../../src/features/log/LogHeader';
import {
  logSymptomsDoneTestID,
  logSymptomsTitleTestID,
} from '../../../src/features/log/LogSymptoms';
import type { Language } from '../../../src/language/language';

let mockPhoneTag: string | undefined = 'en-GB';

// The catalogue is read once when the test identifiers are imported, before this file sets the tag.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockPhoneTag ?? 'en-GB' }],
}));

/**
 * The header of the log, of its symptom sheet and of a past day. The title wraps between words and
 * is never cut. The way out and Done keep their full size. When the longest word of the title does
 * not fit between them, the title moves to its own line under them.
 *
 * The widths were read on the iPhone SE (3rd generation) simulator: the header row, the way out,
 * Done, and each word of the title on one line.
 */

interface Measured {
  readonly done: number;
  readonly words: Readonly<Record<string, number>>;
}

const theRowOnTheSmallestIPhone = 335;
const theWayOut = 44;

const theCases: readonly {
  readonly language: Language;
  readonly size: string;
  readonly today: string;
  readonly pastDay: string;
  readonly measured: Measured;
  readonly isTitleUnder: boolean;
}[] = [
  {
    language: 'en',
    size: 'the largest',
    today: 'Entry for today',
    pastDay: 'Tuesday 3 November',
    measured: {
      done: 63,
      words: { Entry: 60.5, for: 32.5, today: 64, Tuesday: 92.5, 3: 13.5, November: 115.5 },
    },
    isTitleUnder: false,
  },
  {
    language: 'es',
    size: 'the largest',
    today: 'Registro de hoy',
    pastDay: 'Martes 3 noviembre',
    measured: {
      done: 75,
      words: { Registro: 93, de: 27.5, hoy: 41.5, Martes: 76.5, 3: 13.5, noviembre: 117.5 },
    },
    isTitleUnder: false,
  },
  {
    language: 'ru',
    size: 'the largest',
    today: 'Запись за сегодня',
    pastDay: 'Вторник 3 ноября',
    measured: {
      done: 123.5,
      words: { Запись: 86.5, за: 28.5, сегодня: 97, Вторник: 103.5, 3: 14.5, ноября: 88.5 },
    },
    isTitleUnder: true,
  },
  {
    language: 'ru',
    size: 'the normal',
    today: 'Запись за сегодня',
    pastDay: 'Вторник 3 ноября',
    measured: {
      done: 99,
      words: { Запись: 66.5, за: 22, сегодня: 74.5, Вторник: 79.5, 3: 11, ноября: 68 },
    },
    isTitleUnder: false,
  },
];

const thePhoneOf: Readonly<Record<Language, string>> = { en: 'en-GB', es: 'es-ES', ru: 'ru-RU' };

const doNothing = (): undefined => undefined;

type Screen = 'the log' | 'a past day' | 'the symptom sheet';

const theScreens: readonly Screen[] = ['the log', 'a past day', 'the symptom sheet'];

function theScreenIn(
  language: Language,
  which: Screen,
  title: string,
): TheReactTheApplicationShips.ReactElement {
  mockPhoneTag = thePhoneOf[language];

  let drawn: TheReactTheApplicationShips.ReactElement | undefined;

  jest.isolateModules(() => {
    jest.doMock('react', () => TheReactTheApplicationShips);
    const { OnAPhone } = jest.requireActual('../../fixtures/theSafeArea');
    const flow = jest.requireActual('../../../src/features/log/LogFlow');
    const symptoms = jest.requireActual('../../../src/features/log/LogSymptoms');
    const asked = jest.requireActual('../../../src/features/log/askedGroup');
    const create = TheReactTheApplicationShips.createElement;
    const leave = which === 'a past day' ? 'back' : 'close';

    drawn = create(
      OnAPhone,
      null,
      which === 'the symptom sheet'
        ? create(symptoms.LogSymptoms, {
            title,
            leave,
            asked: asked.symptomsOfAGroup('mood'),
            held: [],
            focus: [],
            onLeave: doNothing,
            onSave: doNothing,
          })
        : create(flow.LogFlow, {
            day: '2026-11-03',
            title,
            leave,
            dones: which === 'a past day' ? 'top-and-foot' : 'top',
            ring: undefined,
            chosen: undefined,
            marked: false,
            groups: [],
            symptoms: [],
            note: '',
            onPick: doNothing,
            onMark: doNothing,
            onOpenGroup: doNothing,
            onSearch: doNothing,
            onOtherDischarge: doNothing,
            onToggleSymptom: doNothing,
            onNote: doNothing,
            onLeave: doNothing,
            onDone: doNothing,
          }),
    );
  });

  if (drawn === undefined) {
    throw new Error(`nothing drew ${which} for a phone reading ${language}`);
  }

  return drawn;
}

async function layOut(testID: string, width: number): Promise<void> {
  await fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 30 } },
  });
}

async function thePhoneLaysOutTheHeader(title: string, measured: Measured): Promise<void> {
  await layOut(logHeaderTestID, theRowOnTheSmallestIPhone);
  await layOut(screenHeaderStartTestID(logHeaderTestID), theWayOut);
  await layOut(screenHeaderEndTestID(logHeaderTestID), measured.done);
  for (const word of new Set(title.split(/\s+/))) {
    const width = measured.words[word];

    if (width === undefined) {
      throw new Error(`no width was read on the simulator for "${word}"`);
    }
    await layOut(screenHeaderWordTestID(logHeaderTestID, word), width);
  }
}

function theTitleOf(which: Screen): string {
  return which === 'the symptom sheet' ? logSymptomsTitleTestID : logFlowWhenTestID;
}

function theDoneOf(which: Screen): string {
  return which === 'the symptom sheet' ? logSymptomsDoneTestID : logFlowDoneTestID;
}

function styleOf<T>(testID: string): T {
  return (StyleSheet.flatten(screen.getByTestId(testID).props.style) ?? {}) as T;
}

describe('the header of the log on the smallest iPhone', () => {
  afterEach(() => {
    jest.resetModules();
  });

  for (const { language, size, today, pastDay, measured, isTitleUnder } of theCases) {
    for (const which of theScreens) {
      const title = which === 'a past day' ? pastDay : today;
      const at = `on ${which} in ${language} at ${size} text size`;

      it(`should draw the whole title, never cut and at its own size, ${at}`, async () => {
        await render(theScreenIn(language, which, title));
        await thePhoneLaysOutTheHeader(title, measured);

        const drawn = screen.getByTestId(theTitleOf(which));

        expect(drawn).toHaveTextContent(title);
        expect(drawn.props.numberOfLines).toBeUndefined();
        expect(drawn.props.ellipsizeMode).toBeUndefined();
        expect(drawn.props.adjustsFontSizeToFit).toBeFalsy();
        expect((StyleSheet.flatten(drawn.props.style) as TextStyle).fontSize).toBe(
          textStyle('headline-sm').fontSize,
        );
      });

      it(`should ${isTitleUnder ? 'move the title under' : 'keep the title between'} the buttons ${at}`, async () => {
        await render(theScreenIn(language, which, title));
        await thePhoneLaysOutTheHeader(title, measured);

        expect(styleOf<ViewStyle>(logHeaderTestID).flexDirection).toBe(
          isTitleUnder ? 'column' : 'row',
        );
      });

      it(`should keep the way out and Done at their full size, on the glass, ${at}`, async () => {
        await render(theScreenIn(language, which, title));
        await thePhoneLaysOutTheHeader(title, measured);

        const side = Math.ceil(Math.max(theWayOut, measured.done));

        expect(styleOf<ViewStyle>(screenHeaderStartTestID(logHeaderTestID)).flexShrink).toBe(0);
        expect(styleOf<ViewStyle>(screenHeaderEndTestID(logHeaderTestID)).flexShrink).toBe(0);
        expect(styleOf<ViewStyle>(`${logHeaderTestID}-end-side`).minWidth).toBe(side);
        expect(styleOf<ViewStyle>(`${logHeaderTestID}-start-side`).minWidth).toBe(side);
        expect(2 * side).toBeLessThanOrEqual(theRowOnTheSmallestIPhone);
        expect(styleOf<TextStyle>(textLinkLabelTestID(theDoneOf(which)) ?? '').fontSize).toBe(
          textStyle('button-md').fontSize,
        );
      });

      it(`should read the way out, ${isTitleUnder ? 'Done and the title' : 'the title and Done'} in that order ${at}`, async () => {
        await render(theScreenIn(language, which, title));
        await thePhoneLaysOutTheHeader(title, measured);

        const order = screen
          .getAllByTestId(
            new RegExp(`^(${logHeaderLeaveTestID}|${theTitleOf(which)}|${theDoneOf(which)})$`),
          )
          .map((element) => element.props.testID as string);

        expect(order).toEqual(
          isTitleUnder
            ? [logHeaderLeaveTestID, theDoneOf(which), theTitleOf(which)]
            : [logHeaderLeaveTestID, theTitleOf(which), theDoneOf(which)],
        );
      });
    }
  }
});
