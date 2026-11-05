import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import RootLayout from '../../apps/website/app/[lang]/layout';
import HomePage from '../../apps/website/app/[lang]/page';
import PrivacyPolicyPage from '../../apps/website/app/[lang]/privacy-policy/page';
import ProtectionPage from '../../apps/website/app/[lang]/privacy/page';
import SupportPage from '../../apps/website/app/[lang]/support/page';
import { type Language, languages, wordsIn } from '../../apps/website/app/words';
import { LANGUAGES_ANCHOR } from '../../apps/website/components/siteHeader';
import {
  NO_PAGE_YET,
  THE_APP_STORE_LISTING,
  THE_EMI_BETA,
  THE_EMI_CODE,
  THE_EMI_COMMUNITY,
  THE_PRIVACY_INBOX,
  THE_SUPPORT_INBOX,
} from '../../apps/website/lib/addresses';
import { thePagesOfTheSite } from '../../apps/website/tools/theFilesACrawlerReads';

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

/**
 * The pages this site serves, each at its own address under each language. It is the list the
 * sitemap is written from, so an address in it is an address a crawler is promised and a reader
 * gets a page for, and a page that ships is added there once.
 */
function everyAddressTheSiteServes(): string[] {
  return languages.flatMap((language) =>
    thePagesOfTheSite.map((page) => `/${language}/${page.path}`),
  );
}

/**
 * Every address a press may carry that is not a page of this site: the three hosts outside it, and
 * the two inboxes her mail application answers. Each one is written out whole in
 * `lib/addresses.ts`, so a press that leaves the site leaves it for somewhere a reader of that one
 * file can see.
 */
const theAddressesOffTheSite = [
  THE_EMI_COMMUNITY,
  THE_EMI_CODE,
  THE_EMI_BETA,
  THE_PRIVACY_INBOX,
  THE_SUPPORT_INBOX,
  // The listing in Apple's store, on the day Apple issues its address. It is empty until then, and
  // no press to the store is drawn while it is empty, so it joins the four only once it is real.
  ...(THE_APP_STORE_LISTING === '' ? [] : [THE_APP_STORE_LISTING]),
];

/** One thing on a page a woman can press, as she meets it. */
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

/** One page of the site as a reader receives it: the address she opened, and the document. */
interface APageSheOpened {
  readonly address: string;
  readonly language: Language;
  readonly presses: readonly APressSheCanMake[];
}

/** What draws each page of the site, by the path the list of pages gives it. */
/** The path the support page sits at under a language, as the list of pages writes it. */
const THE_SUPPORT_PAGE = 'support/';

const whatDrawsThePageAt: Readonly<
  Record<string, (asked: { params: Promise<{ lang: string }> }) => Promise<ReactNode>>
> = {
  '': HomePage,
  'privacy/': ProtectionPage,
  'privacy-policy/': PrivacyPolicyPage,
  'support/': SupportPage,
};

/**
 * The whole document Next.js answers an address with, which is the page inside the root layout.
 * The band at the top and the band at the foot belong to the layout, so a read of the page alone
 * would read fewer presses than she is handed.
 */
async function theDocumentAt(path: string, lang: Language): Promise<string> {
  const draw = whatDrawsThePageAt[path];

  if (draw === undefined) {
    throw new Error(`Nothing draws the page at ${path}, so the list of pages has moved.`);
  }

  const page = await draw({ params: Promise.resolve({ lang }) });

  return renderToStaticMarkup(
    await RootLayout({ children: page, params: Promise.resolve({ lang }) }),
  );
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

/** The part of a document the band at the foot of the page fills. */
function theBandAtTheFootOf(markup: string): string {
  const opens = markup.indexOf('<footer');
  const closes = markup.indexOf('</footer>');

  if (opens < 0 || closes < opens) {
    throw new Error('The document carries no band at its foot, so there is nothing to read.');
  }

  return markup.slice(opens, closes);
}

/** The part of a document the page itself fills, between the two bands the whole site shares. */
function insideThePage(markup: string): string {
  const opens = markup.indexOf('<main');
  const closes = markup.indexOf('</main>');

  if (opens < 0 || closes < opens) {
    throw new Error('The document carries no part of its own, so there is nothing to read.');
  }

  return markup.slice(opens, closes);
}

defineFeature(feature, (test) => {
  test('no link on the site points nowhere', ({ given, then, and }) => {
    const opened: APageSheOpened[] = [];
    const atTheFoot = new Map<Language, APressSheCanMake[]>();
    const insideTheHomePage = new Map<Language, APressSheCanMake[]>();

    given('a woman opens every page of the site in each of the three languages', async () => {
      for (const language of languages) {
        for (const page of thePagesOfTheSite) {
          const document = await theDocumentAt(page.path, language);

          opened.push({
            address: `/${language}/${page.path}`,
            language,
            presses: everyPressIn(document),
          });

          if (page.path === '') {
            atTheFoot.set(language, everyPressIn(theBandAtTheFootOf(document)));
            insideTheHomePage.set(language, everyPressIn(insideThePage(document)));
          }
        }
      }

      // A read that found nothing to read reports the same as a page where every press is right,
      // so the count of what was read is part of the scenario. Nine pages, and the band at the
      // top and the band at the foot of each of them.
      expect(opened).toHaveLength(languages.length * thePagesOfTheSite.length);
      expect(thePagesOfTheSite.length).toBeGreaterThan(2);

      for (const page of opened) {
        expect({ address: page.address, enough: page.presses.length > 8 }).toEqual({
          address: page.address,
          enough: true,
        });
      }
    });

    then('no press takes her to a page that is still to be built', () => {
      for (const page of opened) {
        const leadingNowhere = page.presses.filter((press) => press.address === NO_PAGE_YET);

        expect({ onThePage: page.address, leadingNowhere: leadingNowhere.length }).toEqual({
          onThePage: page.address,
          leadingNowhere: 0,
        });
      }

      // The five pages nobody has built yet. Not one of them is pressed anywhere on the site, in
      // any language, and the list the sitemap is written from is what says they are not built.
      // The support page was the sixth of these and it is built now, so it is read below as a
      // page of the site rather than here as a page nobody can open.
      for (const path of ['buy/', 'calculator/', 'pulse/', 'sign-in/', 'terms/']) {
        expect(thePagesOfTheSite.map((page) => page.path)).not.toContain(path);

        for (const page of opened) {
          expect({
            onThePage: page.address,
            waitingFor: path,
            pressed: page.presses.some((press) => press.address.endsWith(`/${path}`)),
          }).toEqual({ onThePage: page.address, waitingFor: path, pressed: false });
        }
      }
    });

    and('the three presses to the support page are drawn again, now that the page exists', () => {
      // The page the three carry her to is one the list of pages names, which is what says it is
      // built. Two of the three are in the bands every page of the site shares, so they are read
      // on every page she opened; the third is a card of the home page.
      expect(thePagesOfTheSite.map((page) => page.path)).toContain(THE_SUPPORT_PAGE);

      for (const page of opened) {
        const carryingHer = page.presses.filter(
          (press) => press.address === `/${page.language}/${THE_SUPPORT_PAGE}`,
        );

        expect({
          onThePage: page.address,
          presses: carryingHer.length,
        }).toEqual({
          onThePage: page.address,
          presses: page.address === `/${page.language}/` ? 3 : 2,
        });
      }

      // Each of the three says the word its catalogue gives it, so a press that lost its name is
      // a press her software announces as "link".
      for (const language of languages) {
        const words = wordsIn(language);
        const said = (presses: readonly APressSheCanMake[]): string[] =>
          presses
            .filter((press) => press.address === `/${language}/${THE_SUPPORT_PAGE}`)
            .map((press) => press.called);

        expect(said(atTheFoot.get(language) ?? [])).toEqual([words.footerSupport]);
        expect(said(insideTheHomePage.get(language) ?? [])).toEqual([
          `${words.askTitle} ${words.askLine} ${words.askLink}`,
        ]);
      }
    });

    and(
      'every press she meets leads to a page of this site, or off it to an address the site names',
      () => {
        const served = everyAddressTheSiteServes();

        for (const page of opened) {
          for (const press of page.presses) {
            // The three kinds a press carries. An address of this site, which is one of the pages
            // the sitemap names. An address off it, written out whole in the one file that holds
            // them. Or the list of languages, which stands on the page she is already reading.
            expect({
              onThePage: page.address,
              called: press.called,
              address: press.address,
              leadsSomewhere:
                served.includes(press.address) ||
                theAddressesOffTheSite.includes(press.address) ||
                press.address === `#${LANGUAGES_ANCHOR}`,
            }).toEqual({
              onThePage: page.address,
              called: press.called,
              address: press.address,
              leadsSomewhere: true,
            });
          }
        }
      },
    );

    and(
      'the press that offers her the community opens the community, in the tab she is reading in',
      () => {
        expect(THE_EMI_COMMUNITY).toBe(theInvite);

        for (const language of languages) {
          const words = wordsIn(language);
          const inThePage = (insideTheHomePage.get(language) ?? []).filter(
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

    and('a browser reads the same pages the same way', () => {
      const read = readFileSync(whatTheBrowserReads, 'utf8');

      expect(read).toContain('Scenario Outline: every press on the page takes her somewhere');

      // The browser reads the status the site answers each press with, which this tier cannot,
      // and it reads every page of the site in every language rather than the home page alone.
      expect(read).toContain('answers 200');

      for (const address of everyAddressTheSiteServes()) {
        expect(read).toContain(`| ${address} `);
      }
    });
  });
});
