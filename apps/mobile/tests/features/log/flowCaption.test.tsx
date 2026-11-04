import type { Flow } from '@emi/cycle';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as TheReactTheApplicationShips from 'react';

import type {
  logFlowCaptionTestID as CaptionTestID,
  logFlowOtherDischargeTestID as OtherDischargeTestID,
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
 * From the logPeriodSpotting board: the flow section of the log is called Period, a line under the
 * five flows says what the flow she picked means, and a link beside the heading opens the Period
 * page, where she logs discharge that is not her period. The words are written out here rather
 * than read off the catalogue, so a change to the catalogue fails this test.
 */

type ABleedingFlow = Exclude<Flow, 'none'>;

interface WhatTheSectionSays {
  readonly title: string;
  /** The line under the flows for each flow that carries blood. None and no pick carry no line. */
  readonly caption: Readonly<Record<ABleedingFlow, string>>;
  readonly link: string;
  /** The heading the section had before, which no longer shows. */
  readonly before: string;
}

const theSectionSays: Readonly<Record<Language, WhatTheSectionSays>> = {
  en: {
    title: 'Period',
    caption: {
      spotting: 'Spotting: Small traces of blood or brownish discharge',
      light: 'Light: A little blood through the day',
      medium: 'Medium: A steady flow of blood',
      heavy: 'Heavy: A lot of blood. You change your pad or tampon often',
    },
    link: 'Other discharge',
    before: 'Your flow',
  },
  es: {
    title: 'Regla',
    caption: {
      spotting: 'Manchado: Pequeños restos de sangre o flujo marrón',
      light: 'Ligero: Un poco de sangre a lo largo del día',
      medium: 'Medio: Un flujo de sangre constante',
      heavy: 'Abundante: Mucha sangre. Cambias la compresa o el tampón a menudo',
    },
    link: 'Otro flujo',
    before: 'Tu flujo',
  },
  ru: {
    title: 'Месячные',
    caption: {
      spotting: 'Следы: Небольшие следы крови или коричневатые выделения',
      light: 'Скудные: Немного крови в течение дня',
      medium: 'Средние: Равномерные выделения крови',
      heavy: 'Обильные: Много крови. Прокладку или тампон приходится часто менять',
    },
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
    readonly caption: typeof CaptionTestID;
    readonly link: typeof OtherDischargeTestID;
  };
}

/** The log of today as a woman whose phone reads the language sees it, from a fresh load of its copy. */
function theLogIn(
  language: Language,
  onOtherDischarge: () => void,
  chosen: Flow | undefined,
): TheLog {
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
          chosen,
          marked: false,
          groups: [],
          symptoms: [],
          note: '',
          onPick: doNothing,
          onMark: doNothing,
          onOpenGroup: doNothing,
          onSearch: doNothing,
          onOtherDischarge,
          onToggleSymptom: doNothing,
          onNote: doNothing,
          onLeave: doNothing,
          onDone: doNothing,
        }),
      ),
      ids: {
        title: flow.logFlowTitleTestID,
        caption: flow.logFlowCaptionTestID,
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
      const log = theLogIn(language, doNothing, 'light');
      await render(log.drawn);

      expect(whatItSays(log.ids.title)).toBe(says.title);
      expect(screen.queryByText(says.before)).toBeNull();
    });

    for (const chosen of Object.keys(says.caption) as ABleedingFlow[]) {
      it(`says what ${chosen} means in ${language} when she picks ${chosen}`, async () => {
        const log = theLogIn(language, doNothing, chosen);
        await render(log.drawn);

        expect(whatItSays(log.ids.caption)).toBe(says.caption[chosen]);
      });
    }

    for (const chosen of ['none', undefined] as const) {
      it(`shows no line under the flows in ${language} when she picks ${chosen ?? 'nothing'}`, async () => {
        const log = theLogIn(language, doNothing, chosen);
        await render(log.drawn);

        expect(screen.queryByTestId(log.ids.caption)).toBeNull();
        for (const caption of Object.values(says.caption)) {
          const meaning = caption.slice(caption.indexOf(': ') + 2);
          expect(screen.queryByText(meaning, { exact: false })).toBeNull();
        }
      });
    }

    it(`offers ${says.link} as a link that opens the Period page in ${language}`, async () => {
      const opened = jest.fn();
      const log = theLogIn(language, opened, 'light');
      await render(log.drawn);

      const link = screen.getByTestId(log.ids.link);
      expect(link.props.accessibilityRole).toBe('link');
      expect(whatItSays(log.ids.link)).toBe(says.link);

      await fireEvent.press(link);
      expect(opened).toHaveBeenCalledTimes(1);
    });
  }
});
