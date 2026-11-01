import { test as bdd } from 'playwright-bdd';

/** What the server said when she asked for the address, which the steps after the ask read. */
export interface WhatTheSiteAnswered {
  status: number | null;
}

/**
 * What came back from the live host: the status, the headers the edge added, and the address she
 * ended on after every move. A page is not opened for these, because a redirect and a header are
 * answers to a request and a browser that followed them has already thrown the first answer away.
 */
export interface WhatCameBack {
  status: number | null;
  headers: Record<string, string>;
  landedOn: string | null;
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
 */
export const test = bdd.extend<{
  answered: WhatTheSiteAnswered;
  cameBack: WhatCameBack;
}>({
  answered: async ({}, handTo) => {
    await handTo({ status: null });
  },
  cameBack: async ({}, handTo) => {
    await handTo({ status: null, headers: {}, landedOn: null });
  },
});
