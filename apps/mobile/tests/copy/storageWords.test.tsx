import { render, screen } from '@testing-library/react-native';
import * as TheReactTheApplicationShips from 'react';

import { type Language, languages } from '../../src/language/language';
import { textIn } from '../fixtures/renderedText';
import { OnAPhone } from '../fixtures/theSafeArea';

/** The language her phone reports. Every load of the copy, isolated or not, asks this one value. */
let mockPhoneTag = 'en-GB';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockPhoneTag }],
}));

/**
 * Onboarding, My data, the delete screen and the page of who can see her records each say where her days are kept. They say it in one
 * set of words, so she never reads two accounts of the same storage and wonders which is true.
 * The words are true in the code: every day goes through `vault.seal` before it is written, and
 * the key lives in this phone's keychain.
 */
const theStorageWords: Readonly<Record<Language, string>> = {
  en: 'encrypted on this phone',
  es: 'cifrado en este teléfono',
  ru: 'в зашифрованном виде на этом телефоне',
};

const thePhoneOf: Readonly<Record<Language, string>> = {
  en: 'en-GB',
  es: 'es-ES',
  ru: 'ru-RU',
};

type Screen = 'onboarding' | 'myData' | 'delete' | 'whoCanSee';

const theScreens: readonly Screen[] = ['onboarding', 'myData', 'delete', 'whoCanSee'];

const doNothing = (): undefined => undefined;

/** One screen as a woman whose phone reads the language sees it, from a fresh load of its copy. */
function theScreenIn(language: Language, which: Screen): TheReactTheApplicationShips.ReactElement {
  mockPhoneTag = thePhoneOf[language];

  let drawn: TheReactTheApplicationShips.ReactElement | undefined;

  jest.isolateModules(() => {
    jest.doMock('react', () => TheReactTheApplicationShips);
    const phone = jest.requireActual('../fixtures/theSafeArea') as { OnAPhone: typeof OnAPhone };
    const create = TheReactTheApplicationShips.createElement;

    if (which === 'onboarding') {
      const { ThePromise } = jest.requireActual('../../src/features/onboarding/ThePromise');
      drawn = create(phone.OnAPhone, null, create(ThePromise, { onContinue: doNothing }));
    } else if (which === 'myData') {
      const { SettingsScreen } = jest.requireActual('../../src/features/settings/SettingsScreen');
      drawn = create(
        phone.OnAPhone,
        null,
        create(SettingsScreen, {
          onAnswers: doNothing,
          onExport: doNothing,
          onWhoCanSee: doNothing,
          onDelete: doNothing,
          onBack: doNothing,
        }),
      );
    } else if (which === 'whoCanSee') {
      const { WhoCanSee } = jest.requireActual('../../src/features/settings/WhoCanSee');
      drawn = create(phone.OnAPhone, null, create(WhoCanSee, { onBack: doNothing }));
    } else {
      const { DeleteEverything } = jest.requireActual(
        '../../src/features/settings/DeleteEverything',
      );
      drawn = create(
        phone.OnAPhone,
        null,
        create(DeleteEverything, {
          stage: 'ready',
          onDelete: doNothing,
          onBack: doNothing,
          onDownload: doNothing,
          onStartAgain: doNothing,
        }),
      );
    }
  });

  if (drawn === undefined) {
    throw new Error(`nothing drew the ${which} screen for a phone reading ${language}`);
  }

  return drawn;
}

async function whatSheReadsOn(language: Language, which: Screen): Promise<string> {
  await render(theScreenIn(language, which));

  return textIn(screen.root).join(' ').toLocaleLowerCase(language);
}

describe('the storage of her days is described in one set of words', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('covers the three languages Emi ships', () => {
    expect([...languages].sort()).toEqual(Object.keys(theStorageWords).sort());
  });

  for (const language of languages) {
    for (const which of theScreens) {
      it(`says "${theStorageWords[language]}" on the ${which} screen in ${language}`, async () => {
        expect(await whatSheReadsOn(language, which)).toContain(theStorageWords[language]);
      });
    }
  }

  it('no longer lists her days on the delete screen without saying they are encrypted', async () => {
    expect(await whatSheReadsOn('en', 'delete')).not.toContain(
      'every day you logged on this phone',
    );
  });
});
