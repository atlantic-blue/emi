import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';
import { renderToStaticMarkup } from 'react-dom/server';

import RootLayout from '../../apps/website/app/[lang]/layout';
import HomePage from '../../apps/website/app/[lang]/page';
import { type Language, brandEyebrowOf, languages, wordsIn } from '../../apps/website/app/words';
import { hostsAPageMayNotName } from '../../apps/website/test/theHostsAPageMayName';
import { asPlaywrightReadsIt } from '../../apps/website/test/theConfiguration';
import { approvedDenials } from '../../tools/pipeline/forbiddenClaims';

const feature = loadFeature(join(__dirname, '26.13-the-home-page.feature'));

const websiteWorkspace = resolve(__dirname, '..', '..', 'apps', 'website');

/** The three widths the board was drawn at, smallest first, which is the order the suite reports. */
const theWidthsOfTheBoard = [390, 834, 1280];

/** Where each language writes a denial, which is how the two are picked out of the gate's list. */
const denialOpening: Readonly<Record<Language, string>> = {
  en: 'Emi is not a',
  ru: 'Emi не является',
  es: 'Emi no es un',
};

/**
 * The page Next.js draws for an address, as a reader receives it. Next.js puts the page inside the
 * root layout and answers with one document, so the scenario composes them the same way: the band
 * at the top and the band at the foot are the layout's, and a read of the page on its own would
 * read half of what she is sent.
 */
async function thePageAt(lang: string): Promise<string> {
  const page = await HomePage({ params: Promise.resolve({ lang }) });

  return renderToStaticMarkup(
    await RootLayout({ children: page, params: Promise.resolve({ lang }) }),
  );
}

/** Every sentence the browser suite reads, as one piece of text. */
function whatTheBrowserSuiteReads(): string {
  const suite = asPlaywrightReadsIt();
  const features = [suite.gherkin[0]?.features ?? []]
    .flat()
    .map((pattern) => pattern.replace('*.feature', 'homePage.feature'));

  return features.map((file) => readFileSync(join(websiteWorkspace, file), 'utf8')).join('\n');
}

defineFeature(feature, (test) => {
  test('the home page renders in English, Russian and Spanish', ({ given, then, and }) => {
    const pages = new Map<Language, string>();

    given('a woman opens myemi.app in the language she reads', async () => {
      for (const language of languages) {
        pages.set(language, await thePageAt(language));
      }

      expect([...pages.keys()]).toEqual([...languages]);
    });

    then('she reads what Emi is and what the first month costs, in that language', () => {
      for (const language of languages) {
        const page = pages.get(language) as string;
        const words = wordsIn(language);

        expect(page).toContain(brandEyebrowOf(words));
        expect(page).toContain(words.heroHeadline);
        expect(page).toContain(words.heroLine);
        expect(page).toContain(words.heroPriceLine);
        expect(page).toContain(words.heroCancel);
        expect(page).toContain(words.store);

        // The approved board names no amount on this page, so neither does the page. The till is
        // where a reader is told what a month costs, and `price` is held to the application's own
        // line by the words test beside the site. A number that arrived here would be a second
        // place the price lives, and two places drift. The amount is taken out of the till's own
        // line, because the ring and every drawing on the page are full of numbers that are not
        // money.
        const amount = /\d+[.,]\d\d/.exec(words.price)?.[0] ?? '';

        expect(amount).toMatch(/\d/);
        expect(page).not.toContain(amount);
        expect(page).not.toMatch(/[£$€]/);
      }
    });

    and('she reads what Emi is not, in the words Emi is held to', () => {
      for (const language of languages) {
        const denials = approvedDenials.filter((denial) =>
          denial.startsWith(denialOpening[language]),
        );
        const onThePage = denials.filter(
          (denial) => pages.get(language)?.includes(denial) === true,
        );

        expect(denials.length).toBeGreaterThan(0);
        expect(onThePage).toHaveLength(1);
      }
    });

    and('the other two languages are one press away, in the band at the foot', () => {
      for (const language of languages) {
        const page = pages.get(language) as string;

        for (const spoken of languages) {
          expect(page).toContain(`href="/${spoken}/"`);
        }

        expect(page).toMatch(new RegExp(`<a[^>]*aria-current="page"[^>]*href="/${language}/"`));
      }
    });

    and(
      'an address naming a language the site does not serve tells her there is no such page',
      async () => {
        await expect(thePageAt('de')).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
      },
    );

    and('a browser reads all three pages, at every width the board was drawn at', () => {
      const suite = asPlaywrightReadsIt();
      const sentences = whatTheBrowserSuiteReads();

      expect(suite.widths).toEqual(theWidthsOfTheBoard);
      expect(sentences).toContain('| English  |');
      expect(sentences).toContain('| Russian  |');
      expect(sentences).toContain('| Spanish  |');
      expect(sentences).toContain('she reads the headline and what the first month costs');
      expect(sentences).toContain('she presses Russian in the header');
    });

    and(
      'no page asks another company for anything, and no page keeps anything on her machine',
      () => {
        for (const language of languages) {
          // A press is not a request. The community chat is the one host the page writes down, and
          // her browser goes there when she decides to and not while the page loads, which is what
          // the browser reads below.
          expect(hostsAPageMayNotName(pages.get(language) ?? '')).toEqual([]);
        }

        expect(whatTheBrowserSuiteReads()).toContain('the page asked no other host for anything');
        expect(whatTheBrowserSuiteReads()).toContain('the page kept nothing on her machine');
      },
    );
  });
});
