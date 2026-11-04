import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import RootLayout from '../../apps/website/app/[lang]/layout';
import NotFound from '../../apps/website/app/[lang]/not-found';
import HomePage from '../../apps/website/app/[lang]/page';
import { type Language, languages, wordsIn } from '../../apps/website/app/words';

const feature = loadFeature(
  join(__dirname, '26.22-every-page-has-the-header-and-the-footer.feature'),
);

const repositoryRoot = resolve(__dirname, '..', '..');

const websiteWorkspace = join(repositoryRoot, 'apps', 'website');

// Drawing three languages of the home page takes longer than the tier's own limit allows.
jest.setTimeout(120_000);

/**
 * The page the site has not grown yet: the privacy policy, the calculator, the support page, the
 * page to buy on. Each one of those will be its own words inside a `main` and nothing else, so
 * that is what stands in for all of them here. If this arrives with the two bands around it, so
 * does every page after it.
 */
const A_PAGE_NOBODY_HAS_WRITTEN_YET = 'The page the site has not grown yet';

/** How many of one element a page drew, which is the question a count of one answers. */
function howMany(markup: string, element: string): number {
  return [...markup.matchAll(new RegExp(`<${element}\\b`, 'g'))].length;
}

async function documentAround(children: ReactNode, lang: string): Promise<string> {
  return renderToStaticMarkup(await RootLayout({ children, params: Promise.resolve({ lang }) }));
}

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

interface WhatSheOpened {
  /** How a reader would say which page this is, for the message a failure prints. */
  readonly page: string;
  readonly language: Language;
  readonly markup: string;
}

defineFeature(feature, (test) => {
  test('every page has the header and the footer', ({ given, then, and }) => {
    const opened: WhatSheOpened[] = [];
    let aPageNobodyHasWrittenYet = '';

    given(
      'a woman opens each home page the site serves, and an address the site does not have',
      async () => {
        for (const language of languages) {
          opened.push({
            page: `the home page in ${language}`,
            language,
            markup: await documentAround(
              await HomePage({ params: Promise.resolve({ lang: language }) }),
              language,
            ),
          });
          opened.push({
            page: `the page she reached by accident, under ${language}`,
            language,
            markup: await documentAround(<NotFound />, language),
          });
        }

        expect(opened).toHaveLength(languages.length * 2);
      },
    );

    then('she gets one band at the top and one band at the foot, on every one of them', () => {
      for (const { page, markup } of opened) {
        expect({ page, top: howMany(markup, 'header'), foot: howMany(markup, 'footer') }).toEqual({
          page,
          top: 1,
          foot: 1,
        });
      }
    });

    and('a page nobody has written yet gives her the same two bands', async () => {
      aPageNobodyHasWrittenYet = await documentAround(
        <main>{A_PAGE_NOBODY_HAS_WRITTEN_YET}</main>,
        'en',
      );

      expect(aPageNobodyHasWrittenYet).toContain(A_PAGE_NOBODY_HAS_WRITTEN_YET);
      expect(howMany(aPageNobodyHasWrittenYet, 'header')).toBe(1);
      expect(howMany(aPageNobodyHasWrittenYet, 'footer')).toBe(1);

      // The two bands are the whole way in and the whole way out, so a reader of this page can
      // reach the product and read what Emi is not, with nobody having written a word of it.
      const words = wordsIn('en');

      expect(aPageNobodyHasWrittenYet).toContain(`aria-label="${words.headerHomeLabel}"`);
      expect(aPageNobodyHasWrittenYet).toContain(words.footerCopyright);
      expect(aPageNobodyHasWrittenYet).toContain(words.footerSupport);
    });

    and(
      'both bands read in the language of the page she is on, including the page she reached by accident',
      () => {
        for (const { page, language, markup } of opened) {
          const words = wordsIn(language);

          expect({ page, says: markup.includes(`aria-label="${words.headerHomeLabel}"`) }).toEqual({
            page,
            says: true,
          });
          expect({ page, home: markup.includes(`href="/${language}/"`) }).toEqual({
            page,
            home: true,
          });

          // The band at the foot marks the one language of three she is reading, so the mark says
          // the same thing from the other end of the page.
          const sheIsReading = new RegExp(`<a[^>]*aria-current="page"[^>]*href="/${language}/"`);

          expect({ page, marked: sheIsReading.test(markup) }).toEqual({ page, marked: true });
          expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
        }
      },
    );

    and(
      'a browser counts the two bands on all three home pages and on an address the site does not have',
      () => {
        const sentence = 'every page has the header and the footer';
        const theFeature = read(
          join(websiteWorkspace, 'e2e', 'features', 'theFrameOfEveryPage.feature'),
        );
        const theSteps = read(join(websiteWorkspace, 'e2e', 'steps', 'theFrameOfEveryPage.ts'));

        expect(theFeature).toContain(`Scenario Outline: ${sentence}`);

        for (const address of ['/en/', '/ru/', '/es/', '/en/nothing/']) {
          expect(theFeature).toContain(`| ${address}`);
        }

        // By landmark and by count, because that is the pair a reader's software goes by and the
        // pair a page drawing a band twice fails.
        expect(theSteps).toContain("'banner'");
        expect(theSteps).toContain("'contentinfo'");
        expect(theSteps).toContain('toHaveCount(1)');
      },
    );
  });
});
