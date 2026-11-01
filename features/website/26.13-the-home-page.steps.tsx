import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';
import { renderToStaticMarkup } from 'react-dom/server';

import HomePage from '../../apps/website/app/[lang]/page';
import { type Language, languages, wordsIn } from '../../apps/website/app/words';
import { asPlaywrightReadsIt } from '../../apps/website/test/theConfiguration';
import { approvedDenials } from '../../tools/pipeline/forbiddenClaims';

const feature = loadFeature(join(__dirname, '26.13-the-home-page.feature'));

const websiteWorkspace = resolve(__dirname, '..', '..', 'apps', 'website');

/** The width of a desktop, and the width of the phone most of her reading happens on. */
const desktop = 1280;

const phone = 390;

/** Where each language writes a denial, which is how the two are picked out of the gate's list. */
const denialOpening: Readonly<Record<Language, string>> = {
  en: 'Emi is not a',
  ru: 'Emi не является',
  es: 'Emi no es un',
};

/** The page Next.js draws for an address, as a reader receives it. */
async function thePageAt(lang: string): Promise<string> {
  return renderToStaticMarkup(await HomePage({ params: Promise.resolve({ lang }) }));
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

    then('she reads what Emi is and what it costs, in that language', () => {
      for (const language of languages) {
        const page = pages.get(language) as string;
        const words = wordsIn(language);

        expect(page).toContain(words.brandLine);
        expect(page).toContain(words.tagline);
        expect(page).toContain(words.line);
        expect(page).toContain(words.price);
        expect(page).toContain(words.store);
        expect(page).toContain(words.beta);
      }
    });

    and('she reads what Emi is not, in the two sentences Emi is held to', () => {
      for (const language of languages) {
        const denials = approvedDenials.filter((denial) =>
          denial.startsWith(denialOpening[language]),
        );

        expect(denials).toHaveLength(2);

        for (const denial of denials) {
          expect(pages.get(language)).toContain(denial);
        }
      }
    });

    and('the other two languages are one press away, in the band at the top', () => {
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

    and(
      'a browser reads all three pages, at the width of a desktop and at the width of a phone',
      () => {
        const suite = asPlaywrightReadsIt();
        const sentences = whatTheBrowserSuiteReads();

        expect(suite.widths).toEqual([phone, desktop]);
        expect(sentences).toContain('| English  |');
        expect(sentences).toContain('| Russian  |');
        expect(sentences).toContain('| Spanish  |');
        expect(sentences).toContain('she reads the headline and what Emi costs');
        expect(sentences).toContain('she presses Russian in the header');
      },
    );

    and(
      'no page asks another company for anything, and no page keeps anything on her machine',
      () => {
        for (const language of languages) {
          expect(pages.get(language)).not.toMatch(/https?:\/\//);
        }

        expect(whatTheBrowserSuiteReads()).toContain('the page asked no other host for anything');
        expect(whatTheBrowserSuiteReads()).toContain('the page kept nothing on her machine');
      },
    );
  });
});
