import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { test } from './fixtures';

/**
 * What a browser does with the policy, which is the half no test in the repository can reach. The
 * policy is read off the answer rather than out of the code, and the refusals are read off the
 * console, because a refused script leaves the page standing and says so nowhere else.
 */
const { Given, Then } = createBdd(test);

const theHeadlineSheReads = 'This page does not exist';

/** A secret in a policy, as the specification writes one. */
const aSecret = /'nonce-([A-Za-z0-9+/_-]+={0,2})'/;

Given('a woman opens an address this site does not have', async ({ page, cameBack }) => {
  const answer = await page.goto('/nothing');

  if (answer === null) {
    throw new Error('The browser opened /nothing and reported no answer to read.');
  }

  cameBack.status = answer.status();
  cameBack.headers = answer.headers();
  cameBack.landedOn = new URL(answer.url()).pathname;
});

Then(
  'the answer carries a policy naming a secret, and allows no inline script of its own',
  ({ cameBack }) => {
    const policy = cameBack.headers['content-security-policy'] ?? '';
    const secret = aSecret.exec(policy);

    expect(policy).not.toBe('');
    expect(secret).not.toBeNull();
    expect(policy).toContain(`script-src 'self' 'nonce-${secret?.[1] ?? ''}' 'strict-dynamic'`);
    expect(policy).not.toContain('unsafe-inline');
  },
);

Then('she reads that the page does not exist', async ({ page }) => {
  await expect(page.getByText(theHeadlineSheReads)).toBeVisible();
});

Then('her browser refused nothing on the page', async ({ page, complaints }) => {
  // The page draws itself after it arrives, so a refusal can land after the words do.
  await page.waitForLoadState('networkidle');

  expect(complaints.of).toEqual([]);
});
