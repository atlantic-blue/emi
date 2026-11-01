import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { test } from './fixtures';

/**
 * Sentences about the shape of an address, which every copy of the site answers the same way:
 * started here or deployed, the framework decides whether a slash is kept.
 *
 * Asked without a browser, because a browser follows a move and then holds the last answer, so
 * the status and the Location of the move are gone by the time anything can read them.
 */
const { When, Then } = createBdd(test);

/** The statuses that move a reader somewhere else rather than answering her. */
const movesHer = [301, 302, 303, 307, 308];

When('she asks for {string}, and follows nothing', async ({ request, cameBack }, address) => {
  const answer = await request.get(address, { maxRedirects: 0 });

  cameBack.status = answer.status();
  cameBack.headers = answer.headers();
  cameBack.landedOn = answer.url();
});

Then('the site answers her rather than moving her', ({ cameBack }) => {
  expect(movesHer).not.toContain(cameBack.status);
  expect(cameBack.headers.location).toBeUndefined();
});

Then('the site moves her, permanently, to {string}', ({ cameBack }, address) => {
  expect(cameBack.status).toBe(308);
  expect(cameBack.headers.location).toBe(address);
});
