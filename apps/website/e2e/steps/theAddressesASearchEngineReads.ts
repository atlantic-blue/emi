import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { test } from './fixtures';

const { Then } = createBdd(test);

/**
 * The host and the languages, written out here rather than read from the site. A scenario that
 * took them from the files the pages read would agree with the pages whatever the pages said.
 */
const THE_SITE = 'https://myemi.app';

const THE_LANGUAGES = ['en', 'ru', 'es'] as const;

/** What a search engine reads when the reader's language is none of the three. */
const FOR_A_READER_OF_NONE = 'x-default';

/** The language a reader of none of the three is offered the page in. */
const THE_LANGUAGE_FOR_A_READER_OF_NONE = 'en';

/**
 * The page she is on, with the language taken off the front. The head of a page names the same
 * page in each language, so the path is the part that stays and the language is the part that
 * changes. Read off the address she is on rather than off the page, because a page that named the
 * wrong path would then be held to the path it named.
 */
function thePathOf(address: string): string {
  return new URL(address).pathname.replace(/^\/[a-z]{2}\//, '/');
}

/** Every address the page names under one relation, in the order the head writes them. */
async function named(page: Page, selector: string): Promise<(string | null)[]> {
  return page
    .locator(`head ${selector}`)
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
}

Then('the page names {string} as its own address, whole', async ({ page }, address: string) => {
  expect(await named(page, 'link[rel="canonical"]')).toEqual([`${THE_SITE}${address}`]);
});

Then(
  'it names the same page in each language, and the English page for a reader of none',
  async ({ page }) => {
    const path = thePathOf(page.url());
    const every = await named(page, 'link[rel="alternate"]');

    expect(every).toHaveLength(THE_LANGUAGES.length + 1);

    for (const language of THE_LANGUAGES) {
      expect(await named(page, `link[rel="alternate"][hreflang="${language}"]`)).toEqual([
        `${THE_SITE}/${language}${path}`,
      ]);
    }

    expect(await named(page, `link[rel="alternate"][hreflang="${FOR_A_READER_OF_NONE}"]`)).toEqual([
      `${THE_SITE}/${THE_LANGUAGE_FOR_A_READER_OF_NONE}${path}`,
    ]);
  },
);

Then('the page names no address of its own, and no other language', async ({ page }) => {
  expect(await named(page, 'link[rel="canonical"]')).toEqual([]);
  expect(await named(page, 'link[rel="alternate"]')).toEqual([]);
});
