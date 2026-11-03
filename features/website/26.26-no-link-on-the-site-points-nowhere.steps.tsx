import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';
import { renderToStaticMarkup } from 'react-dom/server';

import RootLayout from '../../apps/website/app/[lang]/layout';
import HomePage from '../../apps/website/app/[lang]/page';
import { type Language, languages, wordsIn } from '../../apps/website/app/words';
import { SiteFooter } from '../../apps/website/components/siteFooter';
import { NO_PAGE_YET, THE_EMI_COMMUNITY } from '../../apps/website/lib/addresses';

const feature = loadFeature(join(__dirname, '26.26-no-link-on-the-site-points-nowhere.feature'));

const websiteWorkspace = resolve(__dirname, '..', '..', 'apps', 'website');

/**
 * The invite the operator gave for the Emi Community, written out here rather than read from the
 * site. A scenario that took the address from the file the page reads it from would agree with the
 * page whatever the page said.
 */
const theInvite = 'https://t.me/+89GgSCh6Ff85YTZk';

/** The sentences the browser reads against a running site, which carry this rule as well. */
const whatTheBrowserReads = join(
  websiteWorkspace,
  'e2e',
  'features',
  'everyPressTakesHerSomewhere.feature',
);

/** One thing on the page a woman can press, as she meets it. */
interface APressSheCanMake {
  /** Where it takes her. */
  readonly address: string;
  /** What her software reads out: the name written beside it, or the words inside it. */
  readonly called: string;
  /** Whether it keeps her in the tab she is reading in, which keeps the way back on her screen. */
  readonly opensWhereSheIs: boolean;
  /** Whether the page it opens is denied a handle back on the page she came from. */
  readonly handsNothingBack: boolean;
}

/**
 * The page Next.js draws for an address, as a reader receives it. Next.js puts the page inside the
 * root layout and answers with one document, so the scenario composes them the same way.
 */
async function thePageAt(lang: string): Promise<string> {
  const page = await HomePage({ params: Promise.resolve({ lang }) });

  return renderToStaticMarkup(
    await RootLayout({ children: page, params: Promise.resolve({ lang }) }),
  );
}

/**
 * The part of the document the page itself fills. The band at the top and the band at the foot
 * belong to every page of the site, and the one way home the band at the top carries is the one
 * press that is supposed to lead to the page she is on.
 */
function insideThePage(markup: string): string {
  const opens = markup.indexOf('<main');
  const closes = markup.indexOf('</main>');

  if (opens < 0 || closes < opens) {
    throw new Error('The document carries no part of its own, so there is nothing to read.');
  }

  return markup.slice(opens, closes);
}

/** Every press in a piece of markup, in the order a reader meets it. */
function everyPressIn(markup: string): APressSheCanMake[] {
  return [...markup.matchAll(/<a ([^>]*?)>(.*?)<\/a>/g)].map(([, attributes = '', inside = '']) => {
    const attribute = (name: string): string =>
      new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attributes)?.[1] ?? '';
    const words = inside
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const named = attribute('aria-label');

    return {
      address: attribute('href'),
      called: named === '' ? words : named,
      opensWhereSheIs: attribute('target') === '',
      handsNothingBack: attribute('rel').split(' ').includes('noopener'),
    };
  });
}

defineFeature(feature, (test) => {
  test('no link on the site points nowhere', ({ given, then, and }) => {
    const presses = new Map<Language, APressSheCanMake[]>();
    const atTheFoot = new Map<Language, APressSheCanMake[]>();

    given('a woman opens the home page in each of the three languages', async () => {
      for (const language of languages) {
        presses.set(language, everyPressIn(insideThePage(await thePageAt(language))));
        atTheFoot.set(
          language,
          everyPressIn(renderToStaticMarkup(<SiteFooter language={language} />)),
        );
      }

      for (const language of languages) {
        // A read that found nothing to read reports the same as a page where every press is
        // right, so the count of what was read is part of the scenario.
        expect((presses.get(language) ?? []).length).toBeGreaterThan(8);
        expect((atTheFoot.get(language) ?? []).length).toBeGreaterThan(8);
      }
    });

    then('each press inside the page moves her somewhere', () => {
      for (const language of languages) {
        const leadingSomewhere = (presses.get(language) ?? []).filter(
          (press) => press.address !== NO_PAGE_YET,
        );

        expect(leadingSomewhere.length).toBeGreaterThan(6);

        for (const press of leadingSomewhere) {
          // A page of this site sits under the language she is reading, and the one address that
          // is not of this site is the community's.
          expect({
            called: press.called,
            takesHerOn:
              press.address.startsWith(`/${language}/`) || press.address === THE_EMI_COMMUNITY,
          }).toEqual({ called: press.called, takesHerOn: true });
        }
      }
    });

    and(
      'the only presses that lead nowhere are the two to the store, which Apple has not opened yet',
      () => {
        for (const language of languages) {
          const words = wordsIn(language);
          const leadingNowhere = (presses.get(language) ?? []).filter(
            (press) => press.address === NO_PAGE_YET,
          );

          expect(leadingNowhere.map((press) => press.called)).toEqual([words.store, words.store]);
        }
      },
    );

    and(
      'the press that offers her the community opens the community, in the tab she is reading in',
      () => {
        expect(THE_EMI_COMMUNITY).toBe(theInvite);

        for (const language of languages) {
          const words = wordsIn(language);
          const inThePage = (presses.get(language) ?? []).filter(
            (press) => press.called === words.communityJoin,
          );
          const inTheBand = (atTheFoot.get(language) ?? []).filter(
            (press) => press.called === words.footerCommunity,
          );

          expect(inThePage).toEqual([
            {
              address: THE_EMI_COMMUNITY,
              called: words.communityJoin,
              opensWhereSheIs: true,
              handsNothingBack: true,
            },
          ]);
          expect(inTheBand).toEqual([
            {
              address: THE_EMI_COMMUNITY,
              called: words.footerCommunity,
              opensWhereSheIs: true,
              handsNothingBack: true,
            },
          ]);
        }
      },
    );

    and('a browser reads the same page the same way', () => {
      const read = readFileSync(whatTheBrowserReads, 'utf8');

      expect(read).toContain('Scenario Outline: every press on the page takes her somewhere');

      for (const language of languages) {
        expect(read).toContain(`| /${language}/ `);
      }
    });
  });
});
