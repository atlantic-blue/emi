import { textStyle } from '@emi/tokens';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import * as TheReactTheApplicationShips from 'react';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { headingRowEndTestID, headingRowMeasureTestID } from '../../../src/components/HeadingRow';
import {
  logFlowFlowTopTestID,
  logFlowOtherDischargeTestID,
  logFlowSearchTestID,
  logFlowSymptomsTopTestID,
  logFlowTitleTestID,
} from '../../../src/features/log/LogFlow';
import type { Language } from '../../../src/language/language';

let mockPhoneTag: string | undefined = 'en-GB';

// The catalogue is read once when the test identifiers are imported, before this file sets the tag.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockPhoneTag ?? 'en-GB' }],
}));

/**
 * The top of each card on the log holds a heading and a link. The two stay on one line while both
 * fit at their own size. When they do not, the link moves under the heading, and neither shrinks.
 *
 * The widths were read on the iPhone SE (3rd generation) simulator, from the heading on one line
 * and the link at its own size.
 */

interface Top {
  readonly heading: number;
  readonly end: number;
}

interface Measured {
  readonly flow: Top;
  readonly symptoms: Top;
}

const theRowOnTheSmallestIPhone = 303;

const theCases: readonly {
  readonly language: Language;
  readonly size: string;
  readonly measured: Measured;
  readonly isFlowStacked: boolean;
}[] = [
  {
    language: 'en',
    size: 'the largest',
    measured: { flow: { heading: 71, end: 151.5 }, symptoms: { heading: 118.5, end: 77 } },
    isFlowStacked: false,
  },
  {
    language: 'es',
    size: 'the largest',
    measured: { flow: { heading: 61.5, end: 99 }, symptoms: { heading: 102, end: 75.5 } },
    isFlowStacked: false,
  },
  {
    language: 'ru',
    size: 'the largest',
    measured: { flow: { heading: 123, end: 188 }, symptoms: { heading: 172.5, end: 75 } },
    isFlowStacked: true,
  },
  {
    language: 'ru',
    size: 'the normal',
    measured: { flow: { heading: 94.5, end: 149.5 }, symptoms: { heading: 132.5, end: 63.5 } },
    isFlowStacked: false,
  },
];

const thePhoneOf: Readonly<Record<Language, string>> = { en: 'en-GB', es: 'es-ES', ru: 'ru-RU' };

const doNothing = (): undefined => undefined;

function theLogIn(language: Language): TheReactTheApplicationShips.ReactElement {
  mockPhoneTag = thePhoneOf[language];

  let drawn: TheReactTheApplicationShips.ReactElement | undefined;

  jest.isolateModules(() => {
    jest.doMock('react', () => TheReactTheApplicationShips);
    const { OnAPhone } = jest.requireActual('../../fixtures/theSafeArea');
    const flow = jest.requireActual('../../../src/features/log/LogFlow');
    const create = TheReactTheApplicationShips.createElement;

    drawn = create(
      OnAPhone,
      null,
      create(flow.LogFlow, {
        day: '2026-10-12',
        title: 'Today',
        leave: 'close',
        dones: 'top',
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
    throw new Error(`nothing drew the log for a phone reading ${language}`);
  }

  return drawn;
}

async function layOut(testID: string, width: number): Promise<void> {
  await fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 30 } },
  });
}

/** The phone lays out each card top and reports the width of the heading and of the link. */
async function thePhoneLaysOutTheTops(measured: Measured): Promise<void> {
  for (const [testID, top] of [
    [logFlowFlowTopTestID, measured.flow],
    [logFlowSymptomsTopTestID, measured.symptoms],
  ] as const) {
    await layOut(testID, theRowOnTheSmallestIPhone);
    await layOut(headingRowMeasureTestID(testID), top.heading);
    await layOut(headingRowEndTestID(testID), top.end);
  }
}

function styleOf<T>(testID: string): T {
  return (StyleSheet.flatten(screen.getByTestId(testID).props.style) ?? {}) as T;
}

describe('the card tops of the log on the smallest iPhone', () => {
  afterEach(() => {
    jest.resetModules();
  });

  for (const { language, size, measured, isFlowStacked } of theCases) {
    const at = `in ${language} at ${size} text size`;

    it(`should ${isFlowStacked ? 'move the link under' : 'keep the link beside'} the flow heading ${at}`, async () => {
      await render(theLogIn(language));
      await thePhoneLaysOutTheTops(measured);

      expect(styleOf<ViewStyle>(logFlowFlowTopTestID).flexDirection).toBe(
        isFlowStacked ? 'column' : 'row',
      );
    });

    it(`should keep the search link beside the symptoms heading ${at}`, async () => {
      await render(theLogIn(language));
      await thePhoneLaysOutTheTops(measured);

      expect(styleOf<ViewStyle>(logFlowSymptomsTopTestID).flexDirection).toBe('row');
    });

    it(`should read each heading before its link ${at}`, async () => {
      await render(theLogIn(language));
      await thePhoneLaysOutTheTops(measured);

      const order = screen
        .getAllByTestId(
          new RegExp(
            `^(${[logFlowTitleTestID, logFlowOtherDischargeTestID, logFlowSearchTestID].join('|')})$`,
          ),
        )
        .map((element) => element.props.testID as string);

      expect(order).toEqual([logFlowTitleTestID, logFlowOtherDischargeTestID, logFlowSearchTestID]);
      expect(screen.getByTestId(logFlowTitleTestID).props.accessibilityRole).toBe('header');
    });

    it(`should keep each link at its full size ${at}`, async () => {
      await render(theLogIn(language));
      await thePhoneLaysOutTheTops(measured);

      for (const testID of [logFlowFlowTopTestID, logFlowSymptomsTopTestID]) {
        expect(styleOf<ViewStyle>(headingRowEndTestID(testID)).flexShrink).toBe(0);
      }
      for (const link of [logFlowOtherDischargeTestID, logFlowSearchTestID]) {
        const labels = within(screen.getByTestId(link)).getAllByText(/\S/);

        expect(labels.length).toBeGreaterThan(0);
        for (const text of labels) {
          const drawn = StyleSheet.flatten(text.props.style) as TextStyle;

          expect(drawn.fontSize).toBe(textStyle('body-sm').fontSize);
          expect(text.props.adjustsFontSizeToFit).toBeFalsy();
        }
      }
    });

    it(`should never cut the flow heading ${at}`, async () => {
      await render(theLogIn(language));
      await thePhoneLaysOutTheTops(measured);

      const heading = screen.getByTestId(logFlowTitleTestID);

      expect(heading.props.numberOfLines).toBeUndefined();
      expect(heading.props.adjustsFontSizeToFit).toBeFalsy();
    });
  }
});
