import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { test } from './fixtures';

/**
 * The sentences of the live tier. They read what the edge does: the headers it adds to every
 * answer, and the moves it makes before a request reaches the application at all. A site started
 * on this machine does neither, so these steps belong to the features under e2e/live, which the
 * suite reads only when it is told a host.
 *
 * The request is made without a browser. A browser follows a move and then holds the last answer,
 * so the 301 and its Location are gone by the time anything can read them.
 */
const { When, Then } = createBdd(test);

/** Two years, which is the longest a browser is asked to remember the site. */
const twoYears = 'max-age=63072000; includeSubDomains';

When(
  'she asks the live site for {string}, and follows nothing',
  async ({ request, cameBack }, address: string) => {
    const answer = await request.get(address, { maxRedirects: 0 });

    cameBack.status = answer.status();
    cameBack.headers = answer.headers();
    cameBack.landedOn = answer.url();
  },
);

When(
  'she asks the live site for {string}, and follows every move it gives her',
  async ({ request, cameBack }, address: string) => {
    const answer = await request.get(address);

    cameBack.status = answer.status();
    cameBack.headers = answer.headers();
    cameBack.landedOn = answer.url();
  },
);

Then('the site moves her to {string}', ({ cameBack }, address: string) => {
  expect(cameBack.status).toBe(301);
  expect(cameBack.headers.location).toBe(address);
});

Then('she lands on {string}', ({ cameBack }, address: string) => {
  expect(cameBack.landedOn).toBe(address);
});

Then(
  'the answer tells her browser to come back over https for two years, on every name of the site',
  ({ cameBack }) => {
    expect(cameBack.headers['strict-transport-security']).toBe(twoYears);
  },
);

Then(
  'it lets the page reach this site and nothing else, and puts the page in no frame',
  ({ cameBack }) => {
    const policy = cameBack.headers['content-security-policy'] ?? '';

    // A page is drawn by the function, and that function writes a policy carrying a secret of its
    // own for each answer, so the one on the record here is the shape rather than the string: one
    // origin, a secret for the scripts of this answer, nothing inline allowed on its own account.
    expect(policy).toMatch(/^default-src 'self';/);
    expect(policy).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/_-]+={0,2}' 'strict-dynamic'/);
    expect(policy).not.toContain('unsafe-inline');
    expect(policy).toContain("frame-ancestors 'none'");
    expect(cameBack.headers['x-frame-options']).toBe('DENY');
  },
);

Then('a file it serves from the bucket is covered by the policy of the edge', ({ cameBack }) => {
  expect(cameBack.headers['content-security-policy']).toBe(
    "default-src 'self'; frame-ancestors 'none'",
  );
});

Then('it refuses a guessed type, and keeps her address off another site', ({ cameBack }) => {
  expect(cameBack.headers['x-content-type-options']).toBe('nosniff');
  expect(cameBack.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
});

Then('it hands out neither the camera, nor the microphone, nor her location', ({ cameBack }) => {
  expect(cameBack.headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
});
