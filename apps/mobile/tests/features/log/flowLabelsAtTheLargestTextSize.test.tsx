import type { Flow } from '@emi/cycle';
import { MINIMUM_TAP_TARGET, textStyle } from '@emi/tokens';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as TheReactTheApplicationShips from 'react';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { textLinkLabelTestID } from '../../../src/components/Button';
import {
  flowLabelTestID,
  flowOptionTestID,
  flowPickerTestID,
} from '../../../src/features/log/FlowPicker';
import { logFlowDoneTestID } from '../../../src/features/log/LogFlow';
import { logHeaderDoneRoomTestID, logHeaderEndTestID } from '../../../src/features/log/LogHeader';
import { type Language, languages } from '../../../src/language/language';

let mockPhoneTag: string | undefined = 'en-GB';

// The catalogue is read once when the test identifiers are imported, before this file sets the tag.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockPhoneTag ?? 'en-GB' }],
}));

/**
 * At the largest text size the five words under the flow discs do not fit across the row of the
 * smallest iPhone in Spanish and in Russian. Where they do not fit, every second word moves to a
 * lower line and each word keeps its full size. Save keeps its whole word at its full size too.
 *
 * The sizes below were read on the iPhone SE (3rd generation) simulator at the largest text size,
 * from the layout of each word on the one row, where a word is drawn at its own width.
 */

const theRowOnTheSmallestIPhone = 303;
const THE_DISC = 54;
const TEXT_GROWTH = 1.3;
const ONE_LINE = 23.5;

const wordsAtTheLargestTextSize: Readonly<Record<Language, Readonly<Record<Flow, number>>>> = {
  en: { none: 42, spotting: 68.5, light: 40.5, medium: 63, heavy: 50.5 },
  es: { none: 66.5, spotting: 81, light: 49.5, medium: 48.5, heavy: 86.5 },
  ru: { none: 31.5, spotting: 56.5, light: 76.5, medium: 74, heavy: 89 },
};

const doneAtTheLargestTextSize: Readonly<Record<Language, number>> = { en: 63, es: 75, ru: 123.5 };

const theFiveInOrder: readonly Flow[] = ['none', 'spotting', 'light', 'medium', 'heavy'];

const thePhoneOf: Readonly<Record<Language, string>> = { en: 'en-GB', es: 'es-ES', ru: 'ru-RU' };

const doNothing = (): undefined => undefined;

/** The log of today, as a woman whose phone reads the language sees it, holding her own pick. */
function theLogIn(language: Language): TheReactTheApplicationShips.ReactElement {
  mockPhoneTag = thePhoneOf[language];

  let drawn: TheReactTheApplicationShips.ReactElement | undefined;

  jest.isolateModules(() => {
    jest.doMock('react', () => TheReactTheApplicationShips);
    const { OnAPhone } = jest.requireActual('../../fixtures/theSafeArea');
    const flow = jest.requireActual('../../../src/features/log/LogFlow');
    const create = TheReactTheApplicationShips.createElement;

    function HerLog(): TheReactTheApplicationShips.ReactElement {
      const [chosen, setChosen] = TheReactTheApplicationShips.useState<Flow | undefined>();

      return create(flow.LogFlow, {
        day: '2026-10-12',
        title: 'Today',
        leave: 'close',
        dones: 'top',
        ring: undefined,
        chosen,
        marked: false,
        groups: [],
        symptoms: [],
        note: '',
        onPick: setChosen,
        onMark: doNothing,
        onOpenGroup: doNothing,
        onSearch: doNothing,
        onOtherDischarge: doNothing,
        onToggleSymptom: doNothing,
        onNote: doNothing,
        onLeave: doNothing,
        onDone: doNothing,
      });
    }

    drawn = create(OnAPhone, null, create(HerLog));
  });

  if (drawn === undefined) {
    throw new Error(`nothing drew the log for a phone reading ${language}`);
  }

  return drawn;
}

/** The phone lays the row out and reports the size of each word, as it does on each screen. */
async function thePhoneLaysOutTheRow(words: Readonly<Record<Flow, number>>): Promise<void> {
  for (const flow of theFiveInOrder) {
    await fireEvent(screen.getByTestId(flowLabelTestID(flow)), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: words[flow], height: ONE_LINE } },
    });
  }
  await fireEvent(screen.getByTestId(flowPickerTestID), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: theRowOnTheSmallestIPhone, height: 100 } },
  });
}

interface DrawnWord {
  readonly flow: Flow;
  readonly line: 'upper' | 'lower';
  readonly left: number;
  readonly right: number;
}

type Shifted = TextStyle & { readonly transform?: readonly { readonly translateX?: number }[] };

function styleOf<T>(testID: string): T {
  return (StyleSheet.flatten(screen.getByTestId(testID).props.style) ?? {}) as T;
}

/**
 * Where each word lands, laid out the way the row asks: the options spread with the free room
 * shared between them, and each word centred on its option and moved by its own shift.
 */
function whereTheWordsAre(words: Readonly<Record<Flow, number>>): DrawnWord[] {
  const options = theFiveInOrder.map((flow) => {
    const option = styleOf<ViewStyle>(flowOptionTestID(flow));
    const width = typeof option.width === 'number' ? option.width : Math.max(THE_DISC, words[flow]);

    return { flow, width, label: styleOf<Shifted>(flowLabelTestID(flow)) };
  });
  const free = theRowOnTheSmallestIPhone - options.reduce((sum, each) => sum + each.width, 0);
  const between = free / (options.length - 1);

  let from = 0;

  return options.map(({ flow, width, label }) => {
    const centre = from + width / 2 + (label.transform?.[0]?.translateX ?? 0);
    from += width + between;

    return {
      flow,
      line: typeof label.marginTop === 'number' && label.marginTop > 0 ? 'lower' : 'upper',
      left: centre - words[flow] / 2,
      right: centre + words[flow] / 2,
    };
  });
}

function gapsOnEachLine(drawn: readonly DrawnWord[]): number[] {
  return (['upper', 'lower'] as const).flatMap((line) => {
    const onIt = drawn.filter((word) => word.line === line);

    return onIt.slice(1).map((word, at) => word.left - (onIt[at]?.right ?? 0));
  });
}

function linesOf(drawn: readonly DrawnWord[], line: DrawnWord['line']): Flow[] {
  return drawn.filter((word) => word.line === line).map((word) => word.flow);
}

describe('the five flow words at the largest text size on the smallest iPhone', () => {
  afterEach(() => {
    jest.resetModules();
  });

  for (const language of languages) {
    const words = wordsAtTheLargestTextSize[language];

    it(`should leave a gap on each side of every word, inside the row, in ${language}`, async () => {
      await render(theLogIn(language));
      await thePhoneLaysOutTheRow(words);

      const drawn = whereTheWordsAre(words);

      expect(gapsOnEachLine(drawn).length).toBeGreaterThanOrEqual(3);
      for (const gap of gapsOnEachLine(drawn)) {
        expect(gap).toBeGreaterThan(0);
      }
      for (const word of drawn) {
        expect(word.left).toBeGreaterThanOrEqual(0);
        expect(word.right).toBeLessThanOrEqual(theRowOnTheSmallestIPhone);
      }
    });

    it(`should draw every word whole at its full size in ${language}`, async () => {
      await render(theLogIn(language));
      await thePhoneLaysOutTheRow(words);

      for (const flow of theFiveInOrder) {
        const style = styleOf<TextStyle>(flowLabelTestID(flow));

        expect(style.fontSize).toBe(textStyle('label-md').fontSize);
        expect(screen.getByTestId(flowLabelTestID(flow)).props.adjustsFontSizeToFit).toBeFalsy();
        if (typeof style.width === 'number') {
          expect(style.width).toBeGreaterThanOrEqual(words[flow]);
        }
      }
    });

    it(`should keep the press target of each word at least ${MINIMUM_TAP_TARGET} points in ${language}`, async () => {
      await render(theLogIn(language));
      await thePhoneLaysOutTheRow(words);

      for (const flow of theFiveInOrder) {
        const option = styleOf<ViewStyle>(flowOptionTestID(flow));
        const width = typeof option.width === 'number' ? option.width : THE_DISC;

        expect(width).toBeGreaterThanOrEqual(MINIMUM_TAP_TARGET);
        expect(option.minHeight).toBeGreaterThanOrEqual(MINIMUM_TAP_TARGET);
      }
    });

    it(`should give Save a slot as wide as its word, at its full size, in ${language}`, async () => {
      await render(theLogIn(language));
      const done = doneAtTheLargestTextSize[language];

      const room = screen.getByTestId(logHeaderDoneRoomTestID, { includeHiddenElements: true });
      await fireEvent(room, 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: done, height: 0 } },
      });

      expect(styleOf<ViewStyle>(logHeaderEndTestID).minWidth).toBeGreaterThanOrEqual(done);
      expect(styleOf<TextStyle>(textLinkLabelTestID(logFlowDoneTestID) ?? '').fontSize).toBe(
        textStyle('button-md').fontSize,
      );
    });
  }

  for (const language of ['ru', 'es'] as const) {
    it(`should move Spotting and Medium to a lower line in ${language}, where the row is too short`, async () => {
      await render(theLogIn(language));
      await thePhoneLaysOutTheRow(wordsAtTheLargestTextSize[language]);

      const drawn = whereTheWordsAre(wordsAtTheLargestTextSize[language]);

      expect(linesOf(drawn, 'upper')).toEqual(['none', 'light', 'heavy']);
      expect(linesOf(drawn, 'lower')).toEqual(['spotting', 'medium']);
      expect(styleOf<TextStyle>(flowLabelTestID('medium')).marginTop).toBe(ONE_LINE);
    });
  }

  it('should keep the one row in English, where the five words fit', async () => {
    await render(theLogIn('en'));
    await thePhoneLaysOutTheRow(wordsAtTheLargestTextSize.en);

    expect(linesOf(whereTheWordsAre(wordsAtTheLargestTextSize.en), 'lower')).toEqual([]);
    expect(styleOf<ViewStyle>(flowOptionTestID('spotting')).width).toBeUndefined();
  });

  it('should keep the one row in Russian at the normal text size', async () => {
    const atTheNormalSize = Object.fromEntries(
      theFiveInOrder.map((flow) => [flow, wordsAtTheLargestTextSize.ru[flow] / TEXT_GROWTH]),
    ) as Record<Flow, number>;

    await render(theLogIn('ru'));
    await thePhoneLaysOutTheRow(atTheNormalSize);

    expect(linesOf(whereTheWordsAre(atTheNormalSize), 'lower')).toEqual([]);
    expect(styleOf<ViewStyle>(flowOptionTestID('heavy')).width).toBeUndefined();
  });

  it('should pick the flow of a word on the lower line and keep the two lines after the pick', async () => {
    await render(theLogIn('ru'));
    await thePhoneLaysOutTheRow(wordsAtTheLargestTextSize.ru);

    await fireEvent.press(screen.getByTestId(flowOptionTestID('spotting')));

    expect(screen.getByTestId(flowOptionTestID('spotting'))).toBeChecked();
    expect(screen.getByTestId(flowOptionTestID('none'))).not.toBeChecked();
    expect(styleOf<TextStyle>(flowLabelTestID('spotting')).marginTop).toBe(ONE_LINE);
    expect(styleOf<ViewStyle>(flowOptionTestID('spotting')).width).toBe(THE_DISC);
  });
});
