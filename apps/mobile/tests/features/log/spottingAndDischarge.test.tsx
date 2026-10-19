import { fireEvent, render, screen } from '@testing-library/react-native';
import * as TheReactTheApplicationShips from 'react';

import type {
  logFlowOtherDischargeTestID as OtherDischargeTestID,
  logFlowSpottingHintTestID as SpottingHintTestID,
  logFlowTitleTestID as TitleTestID,
} from '../../../src/features/log/LogFlow';
import { type Language, languages } from '../../../src/language/language';
import { textIn } from '../../fixtures/renderedText';

/** The language her phone reports. Every load of the copy, isolated or not, asks this one value. */
let mockPhoneTag = 'en-GB';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockPhoneTag }],
}));

/**
 * Issue 329, from the logPeriodSpotting board: the flow section of the log is called Period, a line
 * under the five flows says what spotting means, and a link beside the heading opens the Period
 * page, where she logs discharge that is not her period. The words are written out here rather
 * than read off the catalogue, so a change to the catalogue fails this test.
 */

interface WhatTheSectionSays {
  readonly title: string;
  readonly hint: string;
  readonly link: string;
  /** The heading the section had before, which no longer shows. */
  readonly before: string;
}

const theSectionSays: Readonly<Record<Language, WhatTheSectionSays>> = {
  en: {
    title: 'Period',
    hint: 'Spotting: Small traces of blood or brownish discharge',
    link: 'Other discharge',
    before: 'Your flow',
  },
  es: {
    title: 'Regla',
    hint: 'Manchado: Pequeños restos de sangre o flujo marrón',
    link: 'Otro flujo',
    before: 'Tu flujo',
  },
  ru: {
    title: 'Месячные',
    hint: 'Мазня: Небольшие следы крови или коричневатые выделения',
    link: 'Другие выделения',
    before: 'Ваши выделения',
  },
};

const thePhoneOf: Readonly<Record<Language, string>> = { en: 'en-GB', es: 'es-ES', ru: 'ru-RU' };

const doNothing = (): undefined => undefined;

interface TheLog {
  readonly drawn: TheReactTheApplicationShips.ReactElement;
  readonly ids: {
    readonly title: typeof TitleTestID;
    readonly hint: typeof SpottingHintTestID;
    readonly link: typeof OtherDischargeTestID;
  };
}

/** The log of today as a woman whose phone reads the language sees it, from a fresh load of its copy. */
function theLogIn(language: Language, onOtherDischarge: () => void): TheLog {
  mockPhoneTag = thePhoneOf[language];

  let log: TheLog | undefined;

  jest.isolateModules(() => {
    jest.doMock('react', () => TheReactTheApplicationShips);
    const { OnAPhone } = jest.requireActual('../../fixtures/theSafeArea');
    const flow = jest.requireActual('../../../src/features/log/LogFlow');
    const create = TheReactTheApplicationShips.createElement;

    log = {
      drawn: create(
        OnAPhone,
        null,
        create(flow.LogFlow, {
          day: '2026-10-12',
          title: 'Today',
          leave: 'close',
          dones: 'top',
          ring: undefined,
          chosen: 'light',
          marked: false,
          groups: [],
          symptoms: [],
          onPick: doNothing,
          onMark: doNothing,
          onOpenGroup: doNothing,
          onSearch: doNothing,
          onOtherDischarge,
          onToggleSymptom: doNothing,
          onLeave: doNothing,
          onDone: doNothing,
        }),
      ),
      ids: {
        title: flow.logFlowTitleTestID,
        hint: flow.logFlowSpottingHintTestID,
        link: flow.logFlowOtherDischargeTestID,
      },
    };
  });

  if (log === undefined) {
    throw new Error(`nothing drew the log for a phone reading ${language}`);
  }

  return log;
}

function whatItSays(testID: string): string {
  return textIn(screen.getByTestId(testID)).join('');
}

describe('the Period section of the log', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('covers the three languages Emi ships', () => {
    expect([...languages].sort()).toEqual(Object.keys(theSectionSays).sort());
  });

  for (const language of languages) {
    const says = theSectionSays[language];

    it(`is called ${says.title} in ${language}, not ${says.before}`, async () => {
      const log = theLogIn(language, doNothing);
      await render(log.drawn);

      expect(whatItSays(log.ids.title)).toBe(says.title);
      expect(screen.queryByText(says.before)).toBeNull();
    });

    it(`says what spotting means in ${language}`, async () => {
      const log = theLogIn(language, doNothing);
      await render(log.drawn);

      expect(whatItSays(log.ids.hint)).toBe(says.hint);
    });

    it(`offers ${says.link} as a link that opens the Period page in ${language}`, async () => {
      const opened = jest.fn();
      const log = theLogIn(language, opened);
      await render(log.drawn);

      const link = screen.getByTestId(log.ids.link);
      expect(link.props.accessibilityRole).toBe('link');
      expect(whatItSays(log.ids.link)).toBe(says.link);

      await fireEvent.press(link);
      expect(opened).toHaveBeenCalledTimes(1);
    });
  }
});
