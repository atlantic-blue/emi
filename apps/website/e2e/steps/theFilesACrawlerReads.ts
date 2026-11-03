import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { test } from './fixtures';
import type { APageTheListNames } from './fixtures';

const { Given, Then } = createBdd(test);

/**
 * The host, the languages and the two addresses, written out here rather than read from the files
 * the site is built from. A scenario that took them from those files would agree with them
 * whatever they said.
 */
const THE_SITE = 'https://myemi.app';

const THE_LANGUAGES = ['en', 'ru', 'es'] as const;

/** What a crawler reads when the reader's language is none of the three. */
const FOR_A_READER_OF_NONE = 'x-default';

const WHAT_IT_MAY_READ = '/robots.txt';

const WHERE_THE_LIST_IS = '/sitemap.xml';

/** What the namespaces of a sitemap are, which is how a crawler knows what it is holding. */
const A_SITEMAP = 'http://www.sitemaps.org/schemas/sitemap/0.9';

const A_LINK_TO_ANOTHER_LANGUAGE = 'http://www.w3.org/1999/xhtml';

/**
 * The path of an address the list names. The list holds whole addresses on the one host, and a run
 * started on this machine has to ask this copy of the site rather than the live one, so what is
 * asked for is the path. A live run asks the same path of the same host.
 */
function pathOf(address: string): string {
  return new URL(address).pathname;
}

/** The part of a path under the language, which is the page itself. */
function pageIn(address: string): string {
  return pathOf(address).split('/').slice(2).join('/');
}

Given('a crawler arrives at the site and asks what it may read', async ({ request, crawled }) => {
  const answer = await request.get(WHAT_IT_MAY_READ);

  crawled.robots = { status: answer.status(), text: await answer.text() };
});

Then('it is allowed every path, and told where the list of pages is', ({ crawled }) => {
  expect(crawled.robots.status).toBe(200);
  expect(crawled.robots.text).toContain('User-agent: *');
  expect(crawled.robots.text).toContain('Allow: /');
  expect(crawled.robots.text).not.toContain('Disallow');
  expect(crawled.robots.text).toContain(`Sitemap: ${THE_SITE}${WHERE_THE_LIST_IS}`);
});

Then(
  'the list is there, and it is markup a crawler can read',
  async ({ request, page, crawled }) => {
    const answer = await request.get(WHERE_THE_LIST_IS);

    crawled.sitemap = { status: answer.status(), text: await answer.text() };

    expect(crawled.sitemap.status).toBe(200);

    // Read in the browser, by the parser a browser already has, so the markup is held to what a
    // reader of markup makes of it rather than to a pattern that would match broken markup too.
    crawled.pages = await page.evaluate(
      ([markup, sitemap, link]) => {
        const parsed = new DOMParser().parseFromString(markup, 'application/xml');

        if (parsed.getElementsByTagName('parsererror').length > 0) {
          throw new Error(`the list is not markup a crawler can read: ${markup.slice(0, 200)}`);
        }

        if (parsed.documentElement.namespaceURI !== sitemap) {
          throw new Error(
            `the list is ${String(parsed.documentElement.namespaceURI)}, not a sitemap`,
          );
        }

        return [...parsed.getElementsByTagNameNS(sitemap, 'url')].map((entry) => ({
          address: entry.getElementsByTagNameNS(sitemap, 'loc')[0]?.textContent ?? '',
          elsewhere: [...entry.getElementsByTagNameNS(link, 'link')].map((offered) => ({
            forReadersOf: offered.getAttribute('hreflang') ?? '',
            address: offered.getAttribute('href') ?? '',
          })),
        }));
      },
      [crawled.sitemap.text, A_SITEMAP, A_LINK_TO_ANOTHER_LANGUAGE] as const,
    );

    expect(crawled.pages.length).toBeGreaterThan(0);
  },
);

Then('every page on the list answers her', async ({ request, crawled }) => {
  for (const named of crawled.pages) {
    expect({ named: named.address, host: new URL(named.address).host }).toEqual({
      named: named.address,
      host: 'myemi.app',
    });

    const answer = await request.get(pathOf(named.address));

    expect({ named: named.address, status: answer.status() }).toEqual({
      named: named.address,
      status: 200,
    });
  }
});

Then(
  'each page on the list is offered in all three languages, and in English to a reader of none',
  ({ crawled }) => {
    const offeredIn = new Map<string, string[]>();

    for (const named of crawled.pages) {
      const page = pageIn(named.address);
      const expected: APageTheListNames['elsewhere'] = [
        ...THE_LANGUAGES.map((language) => ({
          forReadersOf: language as string,
          address: `${THE_SITE}/${language}/${page}`,
        })),
        { forReadersOf: FOR_A_READER_OF_NONE, address: `${THE_SITE}/en/${page}` },
      ];

      expect({ named: named.address, elsewhere: named.elsewhere }).toEqual({
        named: named.address,
        elsewhere: expected,
      });

      offeredIn.set(page, [
        ...(offeredIn.get(page) ?? []),
        pathOf(named.address).split('/')[1] ?? '',
      ]);
    }

    // A page one language has and another does not is the fault that hands a Russian reader the
    // English page, and it is invisible in any single entry.
    for (const [page, languages] of offeredIn) {
      expect({ page, languages: [...languages].sort() }).toEqual({
        page,
        languages: [...THE_LANGUAGES].sort(),
      });
    }
  },
);
