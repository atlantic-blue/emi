import { render, screen } from '@testing-library/react-native';
import * as TheReactTheApplicationShips from 'react';

import { type Language, languages } from '../../src/language/language';
import { textIn } from '../fixtures/renderedText';
import type { OnAPhone } from '../fixtures/theSafeArea';

/** The language her phone reports. Every load of the copy, isolated or not, asks this one value. */
let mockPhoneTag = 'en-GB';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockPhoneTag }],
}));

const thePhoneOf: Readonly<Record<Language, string>> = {
  en: 'en-GB',
  es: 'es-ES',
  ru: 'ru-RU',
};

type Screen = 'myData' | 'export';

const doNothing = (): undefined => undefined;

/**
 * The rows of My data and the two files of the export, in the order she reads them, as the review
 * by a native Russian speaker asked for them: what each row does for her, and what each file holds
 * and in which format. The lock row names what the phone asks for, because the code asks the phone
 * for its own lock with the passcode left as the way past a failed face or finger.
 */
const whatSheReads: Readonly<Record<Screen, Readonly<Record<Language, readonly string[]>>>> = {
  myData: {
    en: [
      'Your answers',
      'Your name and your answers from setup',
      'App lock',
      'Face ID, Touch ID or your phone passcode',
      'Download data',
      'Save your records or make a report for your doctor',
      'Delete data',
      'Delete your records and settings',
    ],
    es: [
      'Tus respuestas',
      'Tu nombre y tus respuestas de la configuración inicial',
      'Bloqueo de la aplicación',
      'Face ID, Touch ID o el código de tu teléfono',
      'Descargar datos',
      'Guarda tus registros o prepara un informe para tu médico',
      'Borrar datos',
      'Borra tus registros y tus ajustes',
    ],
    ru: [
      'Ваши настройки',
      'Имя и ответы из первой настройки',
      'Блокировка входа',
      'Face ID, Touch ID или код телефона',
      'Скачать данные',
      'Сохранить записи или подготовить отчёт для врача',
      'Удалить данные',
      'Удалить записи и настройки',
    ],
  },
  export: {
    en: [
      'Download data',
      'Report for your doctor',
      'Your period dates and day entries, as a web page (.html)',
      'Data file',
      'Everything you logged, in a .json file other apps can open',
    ],
    es: [
      'Descargar datos',
      'Informe para tu médico',
      'Tus fechas de periodo y tus registros diarios, como página web (.html)',
      'Archivo de datos',
      'Todo lo que registraste, en un archivo .json que otras aplicaciones pueden abrir',
    ],
    ru: [
      'Скачать данные',
      'Отчёт для врача',
      'Даты месячных и записи о самочувствии, страница для браузера (.html)',
      'Файл с данными',
      'Все ваши записи в файле .json, который открывают другие приложения',
    ],
  },
};

/** The words these screens said before, which no longer say what the row or the file is for. */
const theWordsThatWent: Readonly<Record<Language, readonly string[]>> = {
  en: [
    'What you told us when you started',
    'On, with your face or your passcode',
    'Two files, made on this phone',
    "One press, and it's gone for good",
    'For a doctor',
    'For an application',
    'Nothing is sent anywhere',
  ],
  es: [
    'Lo que nos contaste al empezar',
    'Activado, con tu cara o tu código de acceso',
    'Dos archivos, creados en este teléfono',
    'Una pulsación, y desaparece para siempre',
    'Para un médico',
    'Para una aplicación',
    'No se envía nada a ninguna parte',
  ],
  ru: ['Включена: по лицу или по коду доступа', 'для переноса записей в другое приложение'],
};

function theScreenIn(language: Language, which: Screen): TheReactTheApplicationShips.ReactElement {
  mockPhoneTag = thePhoneOf[language];

  let drawn: TheReactTheApplicationShips.ReactElement | undefined;

  jest.isolateModules(() => {
    jest.doMock('react', () => TheReactTheApplicationShips);
    const phone = jest.requireActual('../fixtures/theSafeArea') as { OnAPhone: typeof OnAPhone };
    const create = TheReactTheApplicationShips.createElement;

    if (which === 'myData') {
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
    } else {
      const { ExportScreen } = jest.requireActual('../../src/features/export/ExportScreen');
      drawn = create(
        phone.OnAPhone,
        null,
        create(ExportScreen, {
          canShare: true,
          onBack: doNothing,
          onExport: () => Promise.reject(new Error('not pressed')),
          onShare: () => Promise.resolve(),
        }),
      );
    }
  });

  if (drawn === undefined) {
    throw new Error(`nothing drew the ${which} screen for a phone reading ${language}`);
  }

  return drawn;
}

async function theLinesOf(language: Language, which: Screen): Promise<string[]> {
  await render(theScreenIn(language, which));

  return textIn(screen.root);
}

describe('My data and the export say what each row and each file is for', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('covers the three languages Emi ships', () => {
    expect([...languages].sort()).toEqual(Object.keys(thePhoneOf).sort());
  });

  for (const language of languages) {
    for (const which of ['myData', 'export'] as const) {
      it(`reads the ${which} words in order in ${language}`, async () => {
        const lines = await theLinesOf(language, which);
        const expected = whatSheReads[which][language];

        expect(lines.filter((line) => expected.includes(line))).toEqual(expected);
      });
    }

    it(`no longer says the old words on either screen in ${language}`, async () => {
      const myData = (await theLinesOf(language, 'myData')).join('\n');
      jest.resetModules();
      const exported = (await theLinesOf(language, 'export')).join('\n');

      for (const old of theWordsThatWent[language]) {
        expect({ old, onMyData: myData.includes(old) }).toEqual({ old, onMyData: false });
        expect({ old, onExport: exported.includes(old) }).toEqual({ old, onExport: false });
      }
    });
  }
});
