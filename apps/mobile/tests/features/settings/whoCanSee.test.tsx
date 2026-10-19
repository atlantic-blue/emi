import { join } from 'node:path';

import { tabTestID } from '@emi/ui';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import {
  settingsScreenTestID,
  settingsWhoCanSeeTestID,
} from '../../../src/features/settings/SettingsScreen';
import {
  whoCanSeeBackTestID,
  whoCanSeeExampleTestID,
  whoCanSeePartTestID,
  whoCanSeeScreenTestID,
  whoCanSeeTitleTestID,
} from '../../../src/features/settings/WhoCanSee';
import { settingsCopy } from '../../../src/features/settings/copy';
import { type Language, type WordKey, catalogueOf, languages } from '../../../src/language';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herPhoneHolds } from '../../fixtures/herPhone';
import { textIn } from '../../fixtures/renderedText';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');

const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

/** Every word the page says, by its key, so each language is read from its own catalogue. */
const thePageKeys: readonly WordKey[] = [
  'settings.whoCanSee.title',
  'settings.whoCanSee.kept.lead',
  'settings.whoCanSee.kept.line',
  'settings.whoCanSee.read.lead',
  'settings.whoCanSee.read.line',
  'settings.whoCanSee.send.lead',
  'settings.whoCanSee.send.line',
  'settings.whoCanSee.example',
];

/** The one sentence allowed to name an account, because it says there is none. */
const theDenialOfAnAccount: WordKey = 'settings.whoCanSee.kept.line';

const anAccountIn: Readonly<Record<Language, RegExp>> = {
  en: /account/i,
  es: /cuenta/i,
  ru: /учётн|учетн|аккаунт/i,
};

const aNoIn: Readonly<Record<Language, RegExp>> = {
  en: /\bno account\b/i,
  es: /no tiene ninguna cuenta/i,
  ru: /нет вашей учётной записи/i,
};

/** A server, a cloud, an upload, a sync or a backup: none of them exists in the code. */
const aCopyElsewhereIn: Readonly<Record<Language, RegExp>> = {
  en: /server|cloud|upload|sync|backup|back up/i,
  es: /servidor|nube|sincroniz|copia de seguridad/i,
  ru: /сервер|облак|синхрониз|резервн/i,
};

function said(language: Language, key: WordKey): string {
  const held = catalogueOf(language)[key];

  return typeof held === 'string' ? held : Object.values(held).join(' ');
}

async function sheOpensPrivacy(): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: '/' });
  await fireEvent.press(screen.getByTestId(tabTestID('settings/index')));
}

describe('the page that says who can see her records', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
    await herPhoneHolds(whenSheOpensIt, [aBleedingDay(dayOf(whenSheOpensIt))], 28);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens from the link on Privacy', async () => {
    await sheOpensPrivacy();

    expect(screen.getByTestId(settingsWhoCanSeeTestID)).toHaveTextContent(
      settingsCopy.whoCanSee.title,
    );

    await fireEvent.press(screen.getByTestId(settingsWhoCanSeeTestID));

    expect(screen.getByTestId(whoCanSeeScreenTestID)).toBeTruthy();
    expect(screen.getByTestId(whoCanSeeTitleTestID)).toHaveTextContent(
      settingsCopy.whoCanSee.title,
    );
  });

  it('goes back to Privacy from the chevron', async () => {
    await sheOpensPrivacy();
    await fireEvent.press(screen.getByTestId(settingsWhoCanSeeTestID));
    await fireEvent.press(screen.getByTestId(whoCanSeeBackTestID));

    expect(screen.queryByTestId(whoCanSeeScreenTestID)).toBeNull();
    expect(screen.getByTestId(settingsScreenTestID)).toBeTruthy();
  });

  it('says three short parts and one example, in that order', async () => {
    await sheOpensPrivacy();
    await fireEvent.press(screen.getByTestId(settingsWhoCanSeeTestID));

    for (const [at, part] of settingsCopy.whoCanSee.parts.entries()) {
      const words = textIn(screen.getByTestId(whoCanSeePartTestID(at)));

      expect(words).toEqual([part.lead, part.line]);
    }
    expect(screen.queryByTestId(whoCanSeePartTestID(3))).toBeNull();
    expect(textIn(screen.getByTestId(whoCanSeeExampleTestID))).toEqual([
      settingsCopy.whoCanSee.example,
    ]);
  });
});

describe('every sentence on the page is true in the code', () => {
  for (const language of languages) {
    it(`names no server, cloud, upload or backup in ${language}`, () => {
      for (const key of thePageKeys) {
        expect({ key, names: said(language, key).match(aCopyElsewhereIn[language]) }).toEqual({
          key,
          names: null,
        });
      }
    });

    it(`names an account only to say there is none, in ${language}`, () => {
      const naming = thePageKeys.filter((key) => anAccountIn[language].test(said(language, key)));

      expect(naming).toEqual([theDenialOfAnAccount]);
      expect(said(language, theDenialOfAnAccount)).toMatch(aNoIn[language]);
    });
  }
});
