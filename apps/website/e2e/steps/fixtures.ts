import type { PNG } from 'pngjs';

import { test as bdd } from 'playwright-bdd';

/** What the server said when she asked for the address, which the steps after the ask read. */
export interface WhatTheSiteAnswered {
  status: number | null;
  /** The address she is on now, as she would read it in the bar, after every move it made. */
  landedOn: string | null;
  /** How many moves the browser followed before it got her here. */
  moves: number;
  /** The status of the first of those moves, which is what says whether it is permanent. */
  movedBy: number | null;
}

/** Every host the page asked for something, in the order it asked. */
export interface WhatThePageAsked {
  readonly of: string[];
}

/**
 * Every complaint the browser made while the page loaded: a refusal from the content security
 * policy, an error the page threw, or anything else it wrote to the console as an error. A refused
 * script leaves the page standing, so this is the only place the refusal appears.
 */
export interface WhatTheBrowserRefused {
  readonly of: string[];
}

/** The language of the page the scenario opened, for the steps that read it afterwards. */
export interface WhatSheIsReading {
  language: string;
}

/**
 * The two pictures the pixel comparison holds against each other: the design the operator approved,
 * and the page the site serves. Decoded, because what the comparison reads is pixels and not bytes.
 *
 * A fixture rather than a variable in the module, because the two widths run as two tests and a
 * variable here would be one value shared by both.
 */
export interface WhatSheIsLookingAt {
  atTheDesign: PNG | null;
  atThePage: PNG | null;
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
 *
 * The list of hosts is filled by a listener rather than by a step, because the requests a page
 * makes happen while it loads and the step that reads them runs after. The listener is attached
 * when the fixture is built, which is before the step that opens the page.
 */
export const test = bdd.extend<{
  answered: WhatTheSiteAnswered;
  asked: WhatThePageAsked;
  reading: WhatSheIsReading;
  cameBack: WhatCameBack;
  complaints: WhatTheBrowserRefused;
  looking: WhatSheIsLookingAt;
}>({
  answered: async ({}, handTo) => {
    await handTo({ status: null, landedOn: null, moves: 0, movedBy: null });
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
  looking: async ({}, handTo) => {
    await handTo({ atTheDesign: null, atThePage: null });
  },
  cameBack: async ({}, handTo) => {
    await handTo({ status: null, headers: {}, landedOn: null });
  },
  complaints: async ({ page }, handTo) => {
    const of: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        of.push(message.text());
      }
    });
    page.on('pageerror', (thrown) => {
      of.push(thrown.message);
    });

    await handTo({ of });
  },
});
