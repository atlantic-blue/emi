import type { PNG } from 'pngjs';

import type { ABandToLeaveOut, APairOfPictures } from './theDesignComparison';

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
 * What her software found on the page it read: every element a rule refused, the floors the rules
 * really held while they read, and every press she can see with the size of its box.
 *
 * A refusal is kept as a sentence rather than as a structure, because the only reader of it is a
 * person looking at a failed run, and that person needs the rule, the element and the amount.
 */
export interface WhatHerSoftwareFound {
  readonly refused: string[];
  floors: TheFloorsTheRulesHeld | null;
  readonly presses: APressSheCanSee[];
}

/** The numbers the rules were holding the page to, read out of the reader's own settings. */
export interface TheFloorsTheRulesHeld {
  readonly aWord: number;
  readonly aLargeWord: number;
  readonly whereLargeStarts: number;
  readonly aPress: number;
  readonly spaceAroundAPress: number;
}

/** One press on the page, as her thumb meets it: what it is called, and how big its box is. */
export interface APressSheCanSee {
  readonly called: string;
  readonly width: number;
  readonly height: number;
}

/**
 * Each part of the page the pixel comparison holds against the design, with the picture of each
 * taken from both documents. The three pages of the site each name their own parts.
 *
 * A fixture rather than a variable in the module, because the two widths run as two tests and a
 * variable here would be one value shared by both.
 */
export interface WhatSheIsLookingAt {
  atTheDesign: PNG | null;
  atThePage: PNG | null;
  /**
   * Where each band the comparison leaves out stands in each of the two, in the order a reader
   * meets them down the page.
   *
   * Seven are left out of the home page and three of the page that explains the encryption. Most
   * of them carry a press the site no longer draws, because the page behind it is still to be
   * built or because Apple has issued no address for the listing. The board drew a hole where one
   * of the two founders has since written her note, so that band is a different height on each
   * side. And nobody has written a review, so the band of reviews is the whole of its height on
   * the board and nothing at all on the page. The rows outside them all are what line up.
   */
  theBandsInTheDesign: readonly ABandToLeaveOut[] | null;
  theBandsOnThePage: readonly ABandToLeaveOut[] | null;
}

/**
 * Each part of the page the pixel comparison holds against the design, with the picture of each
 * taken from both documents.
 *
 * Parts rather than one whole page, because the words of the privacy policy are version 1 and its
 * board is not, so the page is taller than the drawing and says other things in the middle, and
 * because the two bands the whole site shares draw presses the board still has. The one part named
 * there is what the board still describes.
 *
 * A fixture rather than a variable in the module, because three widths run as three tests and a
 * variable here would be one value shared by all of them.
 */
export interface WhatSheIsComparing {
  readonly parts: APairOfPictures[];
}

/**
 * One press on the page a woman can reach, as her browser reports it.
 *
 * What it is called is read the way her own software reads it: the name written beside it, or the
 * words inside it when no name is written. A press with a picture in it and no name is announced
 * to her as "link", so the words are the only thing left to tell the two apart.
 */
export interface APressSheCanMake {
  /** Where it takes her, as the page wrote it. */
  readonly address: string;
  readonly called: string;
  /** Whether it keeps her in the tab she is reading in, which keeps the way back on her screen. */
  readonly opensWhereSheIs: boolean;
  /** Whether the page it opens is denied a handle back on the page she came from. */
  readonly handsNothingBack: boolean;
}

/**
 * Every press the page offers her, divided by where it sits. The band at the top and the band at
 * the foot belong to every page of the site and the part in the middle belongs to the page, and two
 * of the three carry one press each to the same place, so each one is read on its own.
 *
 * A fixture rather than a variable in the module, because three widths run as three tests and a
 * variable here would be one value shared by all of them.
 */
export interface WhatEveryPressDoes {
  /** The ways into the product, which the band at the top of every page carries. */
  readonly atTheTop: APressSheCanMake[];
  readonly inThePage: APressSheCanMake[];
  readonly atTheFoot: APressSheCanMake[];
  /** The language the page declared, which says what a path of this site has to start with. */
  reading: string;
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
 * What a crawler read off the site before it read any page of it: the answer to each of the two
 * files it asks for, and the pages the second one names.
 */
export interface WhatACrawlerRead {
  robots: WhatAFileAnswered;
  sitemap: WhatAFileAnswered;
  /** Every page the list names, as the markup of the list gave it. */
  pages: APageTheListNames[];
}

export interface WhatAFileAnswered {
  status: number | null;
  text: string;
}

/** One page of the list: its own address, and the same page offered in each language. */
export interface APageTheListNames {
  readonly address: string;
  readonly elsewhere: readonly { readonly forReadersOf: string; readonly address: string }[];
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
  crawled: WhatACrawlerRead;
  complaints: WhatTheBrowserRefused;
  found: WhatHerSoftwareFound;
  looking: WhatSheIsLookingAt;
  comparing: WhatSheIsComparing;
  pressing: WhatEveryPressDoes;
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
    await handTo({
      atTheDesign: null,
      atThePage: null,
      theBandsInTheDesign: null,
      theBandsOnThePage: null,
    });
  },
  comparing: async ({}, handTo) => {
    await handTo({ parts: [] });
  },
  found: async ({}, handTo) => {
    await handTo({ refused: [], floors: null, presses: [] });
  },
  pressing: async ({}, handTo) => {
    await handTo({ atTheTop: [], inThePage: [], atTheFoot: [], reading: '' });
  },
  cameBack: async ({}, handTo) => {
    await handTo({ status: null, headers: {}, landedOn: null });
  },
  crawled: async ({}, handTo) => {
    await handTo({
      robots: { status: null, text: '' },
      sitemap: { status: null, text: '' },
      pages: [],
    });
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
