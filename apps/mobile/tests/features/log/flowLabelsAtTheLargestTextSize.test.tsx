import type { Flow } from '@emi/cycle';
import { MINIMUM_TAP_TARGET, space, textStyle } from '@emi/tokens';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as TheReactTheApplicationShips from 'react';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { textLinkLabelTestID } from '../../../src/components/Button';
import { fluidGridCellTestID, fluidGridWordTestID } from '../../../src/components/FluidGrid';
import * as theFlowPicker from '../../../src/features/log/FlowPicker';
import {
  flowGridTestID,
  flowLabelTestID,
  flowOptionTestID,
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
 * The five words under the flow discs wrap onto more lines, in the order of the options, when the
 * widest word does not fit its column with a gap beside it. No word moves out of its column and no
 * word shrinks.
 *
 * The sizes below were read on the iPhone SE (3rd generation) simulator at the largest text size,
 * from the layout of each word on one line, where a word is drawn at its own width.
 */

const theRowOnTheSmallestIPhone = 303;
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

function theWordOf(flow: Flow): string {
  return String(screen.getByTestId(flowLabelTestID(flow)).props.children);
}

/** The phone lays the row out and reports the width of each word, as it does on each screen. */
async function thePhoneLaysOutTheRow(words: Readonly<Record<Flow, number>>): Promise<void> {
  await fireEvent(screen.getByTestId(flowGridTestID), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: theRowOnTheSmallestIPhone, height: 100 } },
  });
  for (const flow of theFiveInOrder) {
    const word = screen.getByTestId(fluidGridWordTestID(flowGridTestID, theWordOf(flow)), {
      includeHiddenElements: true,
    });

    await fireEvent(word, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: words[flow], height: ONE_LINE } },
    });
  }
}

function styleOf<T>(testID: string): T {
  return (StyleSheet.flatten(screen.getByTestId(testID).props.style) ?? {}) as T;
}

interface DrawnWord {
  readonly flow: Flow;
  readonly line: number;
  readonly left: number;
  readonly right: number;
}

/**
 * Where each word lands: each option takes its share of the row, the options fill a line from the
 * left and then go down, and each word is centred in its option.
 */
function whereTheWordsAre(words: Readonly<Record<Flow, number>>): DrawnWord[] {
  let line = 0;
  let from = 0;

  return theFiveInOrder.map((flow, at) => {
    const share = styleOf<ViewStyle>(fluidGridCellTestID(flowGridTestID, at)).width;

    if (typeof share !== 'string' || !share.endsWith('%')) {
      throw new Error(`the option ${flow} has no share of the row`);
    }

    const width = (theRowOnTheSmallestIPhone * Number.parseFloat(share)) / 100;

    if (from + width > theRowOnTheSmallestIPhone + 0.01) {
      line += 1;
      from = 0;
    }

    const centre = from + width / 2;
    from += width;

    return { flow, line, left: centre - words[flow] / 2, right: centre + words[flow] / 2 };
  });
}

function theLines(drawn: readonly DrawnWord[]): Flow[][] {
  const lines: Flow[][] = [];

  for (const word of drawn) {
    lines[word.line] = [...(lines[word.line] ?? []), word.flow];
  }

  return lines;
}

function gapsOnEachLine(drawn: readonly DrawnWord[]): number[] {
  return drawn.flatMap((word, at) => {
    const before = drawn[at - 1];

    return before !== undefined && before.line === word.line ? [word.left - before.right] : [];
  });
}

function atTheNormalSize(words: Readonly<Record<Flow, number>>): Record<Flow, number> {
  return Object.fromEntries(
    theFiveInOrder.map((flow) => [flow, words[flow] / TEXT_GROWTH]),
  ) as Record<Flow, number>;
}

describe('the flow options no longer stagger their words', () => {
  it('should carry no lower line layout', () => {
    expect(Object.keys(theFlowPicker)).not.toContain('isOnTheLowerLine');
    expect(Object.keys(theFlowPicker)).not.toContain('sidewaysShift');
    expect(Object.keys(theFlowPicker)).not.toContain('wordsOverflowTheRow');
  });

  for (const language of languages) {
    it(`should never push a word down or sideways out of its option in ${language}`, async () => {
      await render(theLogIn(language));
      await thePhoneLaysOutTheRow(wordsAtTheLargestTextSize[language]);

      for (const flow of theFiveInOrder) {
        const label = styleOf<TextStyle & { transform?: unknown }>(flowLabelTestID(flow));

        expect(label.marginTop).toBeUndefined();
        expect(label.transform).toBeUndefined();
        expect(label.width).toBeUndefined();
      }
    });
  }
});

describe('the five flow words at the largest text size on the smallest iPhone', () => {
  afterEach(() => {
    jest.resetModules();
  });

  for (const language of languages) {
    const words = wordsAtTheLargestTextSize[language];

    it(`should read the words in option order, three and then two, in ${language}`, async () => {
      await render(theLogIn(language));
      await thePhoneLaysOutTheRow(words);

      expect(theLines(whereTheWordsAre(words))).toEqual([
        ['none', 'spotting', 'light'],
        ['medium', 'heavy'],
      ]);
      expect(screen.getAllByTestId(/^flow-option-/).map((option) => option.props.testID)).toEqual(
        theFiveInOrder.map(flowOptionTestID),
      );
    });

    it(`should keep at least the column gap between every two words, inside the row, in ${language}`, async () => {
      await render(theLogIn(language));
      await thePhoneLaysOutTheRow(words);

      const drawn = whereTheWordsAre(words);

      expect(gapsOnEachLine(drawn)).toHaveLength(3);
      for (const gap of gapsOnEachLine(drawn)) {
        expect(gap).toBeGreaterThanOrEqual(space.spaceXs);
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
        expect(styleOf<TextStyle>(flowLabelTestID(flow)).fontSize).toBe(
          textStyle('label-md').fontSize,
        );
        expect(screen.getByTestId(flowLabelTestID(flow)).props.adjustsFontSizeToFit).toBeFalsy();
      }
    });

    it(`should keep the press target of each option at least ${MINIMUM_TAP_TARGET} points in ${language}`, async () => {
      await render(theLogIn(language));
      await thePhoneLaysOutTheRow(words);

      for (const flow of theFiveInOrder) {
        const option = styleOf<ViewStyle>(flowOptionTestID(flow));

        expect(option.minWidth).toBeGreaterThanOrEqual(MINIMUM_TAP_TARGET);
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

  it('should keep the one line in English at the normal text size', async () => {
    const words = atTheNormalSize(wordsAtTheLargestTextSize.en);

    await render(theLogIn('en'));
    await thePhoneLaysOutTheRow(words);

    expect(theLines(whereTheWordsAre(words))).toEqual([theFiveInOrder]);
  });

  it('should keep at least the column gap between the Russian words at the normal text size', async () => {
    const words = atTheNormalSize(wordsAtTheLargestTextSize.ru);

    await render(theLogIn('ru'));
    await thePhoneLaysOutTheRow(words);

    for (const gap of gapsOnEachLine(whereTheWordsAre(words))) {
      expect(gap).toBeGreaterThanOrEqual(space.spaceXs);
    }
  });

  it('should pick the flow of a word on the second line and keep the lines after the pick', async () => {
    await render(theLogIn('ru'));
    await thePhoneLaysOutTheRow(wordsAtTheLargestTextSize.ru);

    await fireEvent.press(screen.getByTestId(flowOptionTestID('heavy')));

    expect(screen.getByTestId(flowOptionTestID('heavy'))).toBeChecked();
    expect(screen.getByTestId(flowOptionTestID('none'))).not.toBeChecked();
    expect(theLines(whereTheWordsAre(wordsAtTheLargestTextSize.ru))).toEqual([
      ['none', 'spotting', 'light'],
      ['medium', 'heavy'],
    ]);
  });
});
