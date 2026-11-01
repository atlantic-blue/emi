import { test as bdd } from 'playwright-bdd';

/** What the server said when she asked for the address, which the steps after the ask read. */
export interface WhatTheSiteAnswered {
  status: number | null;
}

/** Every host the page asked for something, in the order it asked. */
export interface WhatThePageAsked {
  readonly of: string[];
}

/** The language of the page the scenario opened, for the steps that read it afterwards. */
export interface WhatSheIsReading {
  language: string;
}

/**
 * A scenario asks for one address and then reads the answer across several steps, so the answer
 * is a fixture rather than a variable in the module: two widths run as two tests, and a variable
 * here would be one value shared by both.
 *
 * Playwright reads the destructuring of the first argument to work out which other fixtures a
 * fixture needs, so a fixture that needs none still writes the empty pattern. The second argument
 * hands the value to the test, and it is named for that rather than `use`, which the React rules
 * of this workspace read as a hook.
 *
 * The list of hosts is filled by a listener rather than by a step, because the requests a page
 * makes happen while it loads and the step that reads them runs after. The listener is attached
 * when the fixture is built, which is before the step that opens the page.
 */
export const test = bdd.extend<{
  answered: WhatTheSiteAnswered;
  asked: WhatThePageAsked;
  reading: WhatSheIsReading;
}>({
  answered: async ({}, handTo) => {
    await handTo({ status: null });
  },
  asked: async ({ page }, handTo) => {
    const of: string[] = [];

    page.on('request', (request) => {
      of.push(new URL(request.url()).host);
    });

    await handTo({ of });
  },
  reading: async ({}, handTo) => {
    await handTo({ language: '' });
  },
});
