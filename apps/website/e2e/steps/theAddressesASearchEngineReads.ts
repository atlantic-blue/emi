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

/** The page a reader of none of the three languages is offered. */
const THE_PAGE_FOR_A_READER_OF_NONE = `${THE_SITE}/en/`;

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
    const every = await named(page, 'link[rel="alternate"]');

    expect(every).toHaveLength(THE_LANGUAGES.length + 1);

    for (const language of THE_LANGUAGES) {
      expect(await named(page, `link[rel="alternate"][hreflang="${language}"]`)).toEqual([
        `${THE_SITE}/${language}/`,
      ]);
    }

    expect(await named(page, `link[rel="alternate"][hreflang="${FOR_A_READER_OF_NONE}"]`)).toEqual([
      THE_PAGE_FOR_A_READER_OF_NONE,
    ]);
  },
);

Then('the page names no address of its own, and no other language', async ({ page }) => {
  expect(await named(page, 'link[rel="canonical"]')).toEqual([]);
  expect(await named(page, 'link[rel="alternate"]')).toEqual([]);
});
