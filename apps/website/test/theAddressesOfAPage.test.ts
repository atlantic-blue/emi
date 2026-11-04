import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { generateMetadata } from '../app/[lang]/layout';
import { metadata as whatTheMissingPageSays } from '../app/[lang]/not-found';
import { fallbackLanguage, languages } from '../app/words';
import { SITE_ORIGIN } from '../lib/addresses';
import {
  FOR_A_READER_OF_NONE,
  THE_HOME_PAGE,
  theAddressOf,
  theLinksOf,
} from '../lib/theAddressesOfAPage';
import { websiteWorkspace } from './stylesheet';

/**
 * The address of the English home page, written out rather than built the way the module builds
 * it. A test that composed the address the same way would agree with the module whatever the
 * module said.
 */
const theEnglishHomePage = 'https://myemi.app/en/';

const theModule = join(websiteWorkspace, 'lib', 'theAddressesOfAPage.ts');

/** The links the layout gives a page, read from the metadata the site really serves. */
async function theLinksTheLayoutGives(language: string) {
  const metadata = await generateMetadata({ params: Promise.resolve({ lang: language }) });

  return metadata.alternates;
}

describe('the one address of a page, written whole', () => {
  it('is the host, the language, and a slash at the end', () => {
    expect(theAddressOf('en')).toBe(theEnglishHomePage);
  });

  it.each(languages)('writes the address of the page a woman reads in %s', (language) => {
    expect(theAddressOf(language)).toBe(`${SITE_ORIGIN}/${language}/`);
  });

  it('gives a page under a language its own address, so a page added later needs no new code', () => {
    expect(theAddressOf('ru', 'privacy/')).toBe('https://myemi.app/ru/privacy/');
  });

  it('names no language of its own, so a fourth language adds its address with no edit here', () => {
    const source = readFileSync(theModule, 'utf8');

    for (const language of languages) {
      expect({ language, written: source.includes(`'${language}'`) }).toEqual({
        language,
        written: false,
      });
    }
  });
});

describe('the links a search engine reads on every page', () => {
  it.each(languages)('names the page she is reading as the one address, in %s', (language) => {
    expect(theLinksOf(language).canonical).toBe(`${SITE_ORIGIN}/${language}/`);
    expect(theLinksOf(language).canonical).toBe(theAddressOf(language, THE_HOME_PAGE));
  });

  it.each(languages)('names the same page in each of the three languages, from %s', (language) => {
    const named = theLinksOf(language).languages;

    for (const other of languages) {
      expect({ other, address: named[other] }).toEqual({ other, address: theAddressOf(other) });
    }
  });

  it('offers a reader of none of the three the page in the language the site falls back to', () => {
    expect(theLinksOf('ru').languages[FOR_A_READER_OF_NONE]).toBe(theAddressOf(fallbackLanguage));
    expect(theLinksOf('ru').languages[FOR_A_READER_OF_NONE]).toBe(theEnglishHomePage);
  });

  it('names one address for each language and one more for a reader of none, and nothing else', () => {
    expect(Object.keys(theLinksOf('en').languages).sort()).toEqual(
      [...languages, FOR_A_READER_OF_NONE].sort(),
    );
  });

  it.each(languages)(
    'gives the three pages one list, because they are one page, from %s',
    (language) => {
      expect(Object.keys(theLinksOf(language).languages)).toHaveLength(languages.length + 1);
      expect(theLinksOf(language).languages).toEqual(theLinksOf('en').languages);
    },
  );
});

describe('what the layout tells a search engine', () => {
  it.each(languages)('names the address of the page itself in %s', async (language) => {
    expect((await theLinksTheLayoutGives(language))?.canonical).toBe(theAddressOf(language));
  });

  it.each(languages)(
    'names the other two languages and a reader of none in %s',
    async (language) => {
      expect((await theLinksTheLayoutGives(language))?.languages).toEqual(
        theLinksOf(language).languages,
      );
    },
  );

  it('draws the card a chat reads as well, so the links took nothing away', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ lang: 'ru' }) });

    expect(metadata.openGraph?.url).toBe('https://myemi.app/ru/');
    expect(metadata.title).toContain('Emi');
  });
});

describe('the page behind an address the site does not have', () => {
  it('names no address of its own, because the address is not one the site holds', () => {
    expect(whatTheMissingPageSays.alternates).toBeNull();
  });
});
