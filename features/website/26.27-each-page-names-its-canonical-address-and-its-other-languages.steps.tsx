import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

import { generateMetadata } from '../../apps/website/app/[lang]/layout';
import { metadata as whatTheMissingPageSays } from '../../apps/website/app/[lang]/not-found';
import { type Language, languages } from '../../apps/website/app/words';

const feature = loadFeature(
  join(__dirname, '26.27-each-page-names-its-canonical-address-and-its-other-languages.feature'),
);

const websiteWorkspace = resolve(__dirname, '..', '..', 'apps', 'website');

/**
 * The three addresses, written out rather than built the way the site builds them. A scenario that
 * composed them from the same host and the same list would agree with the site whatever the site
 * said, and these three are what a search engine is being told.
 */
const theAddresses: Readonly<Record<Language, string>> = {
  en: 'https://myemi.app/en/',
  ru: 'https://myemi.app/ru/',
  es: 'https://myemi.app/es/',
};

/** The language tag a search engine reads for a reader whose language is none of the three. */
const forAReaderOfNone = 'x-default';

/** The file the addresses are built in, which is the one place a language list is read. */
const theBuilder = join(websiteWorkspace, 'lib', 'theAddressesOfAPage.ts');

/** The sentences a browser reads against a running site, which carry these links as well. */
const whatTheBrowserReads = join(
  websiteWorkspace,
  'e2e',
  'features',
  'theAddressesASearchEngineReads.feature',
);

/** What one page tells a search engine: its own address, and the same page in other languages. */
interface WhatAPageNames {
  readonly ofItself: string | null | undefined;
  readonly ofEachLanguage: Readonly<Record<string, unknown>>;
}

async function whatThePageNamesIn(language: Language): Promise<WhatAPageNames> {
  const metadata = await generateMetadata({ params: Promise.resolve({ lang: language }) });
  const links = metadata.alternates;

  return {
    ofItself: typeof links?.canonical === 'string' ? links.canonical : null,
    ofEachLanguage: links?.languages ?? {},
  };
}

defineFeature(feature, (test) => {
  test('each page names its canonical address and its other languages', ({ given, then, and }) => {
    const named = new Map<Language, WhatAPageNames>();

    given('a search engine reads each page of myemi.app', async () => {
      for (const language of languages) {
        named.set(language, await whatThePageNamesIn(language));
      }

      // A read that found nothing reports the same as a page where every link is right, so the
      // count of what was read is part of the scenario.
      expect(named.size).toBe(languages.length);
    });

    then('each page names one address of its own, whole, in the language she is reading', () => {
      for (const language of languages) {
        expect({ language, address: named.get(language)?.ofItself }).toEqual({
          language,
          address: theAddresses[language],
        });
      }
    });

    and('each page names the same page in each of the three languages', () => {
      const theSamePageInEveryLanguage = Object.fromEntries(
        languages.map((language) => [language, theAddresses[language]]),
      );

      for (const language of languages) {
        const read = named.get(language)?.ofEachLanguage ?? {};

        for (const other of languages) {
          expect({ page: language, other, address: read[other] }).toEqual({
            page: language,
            other,
            address: theSamePageInEveryLanguage[other],
          });
        }
      }
    });

    and('a reader of none of the three languages is offered the English page', () => {
      for (const language of languages) {
        expect({
          page: language,
          offered: (named.get(language)?.ofEachLanguage ?? {})[forAReaderOfNone],
        }).toEqual({ page: language, offered: theAddresses.en });
      }
    });

    and('a fourth language would carry its own links, with no new code', () => {
      // The links a page names are one per language and one for a reader of none, so the list the
      // site keeps is what a page carries rather than anything written out beside it.
      for (const language of languages) {
        expect(Object.keys(named.get(language)?.ofEachLanguage ?? {}).sort()).toEqual(
          [...languages, forAReaderOfNone].sort(),
        );
      }

      const source = readFileSync(theBuilder, 'utf8');

      for (const language of languages) {
        expect({ language, written: source.includes(`'${language}'`) }).toEqual({
          language,
          written: false,
        });
      }
    });

    and('the page behind an address the site does not have names no address at all', () => {
      expect(whatTheMissingPageSays.alternates).toBeNull();
    });

    and('a browser reads the same links against a running site', () => {
      const read = readFileSync(whatTheBrowserReads, 'utf8');

      expect(read).toContain(
        'Scenario Outline: the page names its own address and the languages it is written in',
      );
      expect(read).toContain('Scenario: the page she reached by accident names no address');

      for (const language of languages) {
        expect(read).toContain(`| /${language}/ `);
      }
    });
  });
});
