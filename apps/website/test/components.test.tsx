import { MINIMUM_TAP_TARGET, colour, radius, space, typeScale, websiteColour } from '@emi/tokens';
import { renderToStaticMarkup } from 'react-dom/server';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type SiteWordKey, wordsIn } from '../app/words';
import { EmiIcon } from '../components/emiIcon';
import {
  SiteFooter,
  footerGroups,
  theAddressOfAPress,
  theGroupsOfTheBand,
  theTerms,
} from '../components/siteFooter';
import { ICON_FILE, SiteHeader, mainLinks, theWayIn, theWaysIn } from '../components/siteHeader';
import { NO_PAGE_YET, THE_EMI_BETA, THE_EMI_CODE } from '../lib/addresses';
import { Button, buttonVariants } from '../components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { declarationsOf, stylesheetFor, websiteWorkspace, whatTheMarkupDraws } from './stylesheet';
import { hostsAPageMayNotName } from './theHostsAPageMayName';

/** Compiling the stylesheet takes a moment, and each case here compiles its own markup. */
const longEnoughToCompile = 60_000;

function markup(element: Parameters<typeof renderToStaticMarkup>[0]): string {
  return renderToStaticMarkup(element);
}

describe('the control that acts', () => {
  it(
    'draws as a capsule in the one colour that acts, carrying the white measured on it',
    async () => {
      const drawn = markup(<Button>Download on the App Store</Button>);
      const drawing = await whatTheMarkupDraws(drawn);
      const painted = Object.values(drawing).join(' ');

      expect(drawn).toContain('Download on the App Store');
      expect(painted).toContain(`background-color: ${colour.accent}`);
      expect(painted).toContain(`color: ${colour.onAccent}`);
      expect(painted).toContain(`border-radius: ${radius.full}px`);
    },
    longEnoughToCompile,
  );

  it(
    'takes a touch at the size a thumb needs',
    async () => {
      const drawing = await whatTheMarkupDraws(markup(<Button>Join the beta</Button>));

      expect(Object.values(drawing).join(' ')).toContain(`min-height: ${space.marginLg}px`);
      expect(space.marginLg).toBeGreaterThanOrEqual(44);
    },
    longEnoughToCompile,
  );

  it(
    'lends its look to a link, because the way back from a page is a link and not a button',
    async () => {
      const drawn = markup(
        <a className={buttonVariants()} href="/">
          Go to the Emi home page
        </a>,
      );
      const painted = Object.values(await whatTheMarkupDraws(drawn)).join(' ');

      expect(drawn).toMatch(/^<a [^>]*href="\/"/);
      expect(painted).toContain(`background-color: ${colour.accent}`);
      expect(painted).toContain(`border-radius: ${radius.full}px`);
    },
    longEnoughToCompile,
  );

  it(
    'draws its quiet tone in the tint behind a chip, with the ink measured on that tint',
    async () => {
      const drawing = await whatTheMarkupDraws(markup(<Button tone="quiet">Not now</Button>));
      const painted = Object.values(drawing).join(' ');

      expect(painted).toContain(`background-color: ${colour.accentSoft}`);
      expect(painted).toContain(`color: ${colour.accentSoftInk}`);
    },
    longEnoughToCompile,
  );
});

describe('a section raised onto the page', () => {
  const card = (): string =>
    markup(
      <Card>
        <CardHeader>
          <CardTitle>This page does not exist</CardTitle>
          <CardDescription>The address you opened is not part of this site.</CardDescription>
        </CardHeader>
      </Card>,
    );

  it(
    'sits on the plain surface, with no border and the corner the design system names',
    async () => {
      const drawing = await whatTheMarkupDraws(card());
      const painted = Object.values(drawing).join(' ');

      expect(painted).toContain(`background-color: ${colour.card}`);
      expect(painted).toContain(`border-radius: ${radius.xxl}px`);
      expect(painted).not.toContain('border-width');
      expect(painted).not.toContain('border-style');
    },
    longEnoughToCompile,
  );

  it(
    'writes its headline in the display face at the size the scale names, and its line under it in the quieter tone',
    async () => {
      const drawing = await whatTheMarkupDraws(card());
      const painted = Object.values(drawing).join(' ');
      const headline = typeScale['headline-lg'];

      expect(painted).toContain(`font-size: ${headline.size}px`);
      expect(painted).toContain(`${headline.lineHeight}px`);
      expect(painted).toContain(`color: ${colour.text}`);
      expect(painted).toContain(`color: ${colour.secondaryText}`);
    },
    longEnoughToCompile,
  );
});

describe('the hairline between one part of a page and the next', () => {
  it(
    'is drawn in the line colour, at the stroke the design system names',
    async () => {
      const drawn = markup(<Separator />);
      const painted = Object.values(await whatTheMarkupDraws(drawn)).join(' ');

      expect(painted).toContain(`background-color: ${colour.line}`);
      expect(painted).toContain('height: 1px');
      expect(drawn).toContain('data-orientation="horizontal"');
    },
    longEnoughToCompile,
  );
});

describe('the band at the top of every page', () => {
  const header = (): string => markup(<SiteHeader language="en" />);

  it('draws the icon the community chose, and names it to her software', () => {
    const drawn = header();
    const picture = drawn.slice(drawn.indexOf('<svg'), drawn.indexOf('</svg>'));

    expect(picture).toContain('role="img"');
    expect(picture).toContain('aria-label="Emi"');
    expect(picture).toContain(colour.accent);
    expect(drawn).not.toContain('style=');
  });

  it('serves the same drawing under a name as well, for a link somebody shares', () => {
    const served = readFileSync(join(websiteWorkspace, 'public', ICON_FILE), 'utf8');

    expect(ICON_FILE).toBe('/emi-icon.svg');
    expect(renderToStaticMarkup(<EmiIcon />)).toContain(
      (/ d="([^"]+)"/.exec(served) ?? ['', ''])[1] ?? '',
    );
  });

  it('puts the way home under the language she is reading, not at the root of the site', () => {
    expect(header()).toContain('href="/en/"');
    expect(markup(<SiteHeader language="ru" />)).toContain('href="/ru/"');
  });

  it('offers the language and the menu, each one a thumb can land on', () => {
    const drawn = header();
    const words = wordsIn('en');

    for (const label of [
      words.headerHomeLabel,
      words.headerMainLabel,
      words.headerLanguageLabel,
      words.headerMenuLabel,
    ]) {
      expect(drawn).toContain(`aria-label="${label}"`);
    }

    // One square she presses, the menu, and the way home which is as tall as a thumb needs
    // without being as wide. The way to her account is the second square, and it comes back with
    // the page it waits for.
    expect(drawn.match(/(?<![a-z-])h-\[44px\] w-\[44px\]/g)?.length).toBe(1);
    expect(drawn).toContain('min-h-[44px]');
    expect(MINIMUM_TAP_TARGET).toBe(44);
  });

  it('draws the three ways in whose page exists, and holds the other three until theirs do', () => {
    const drawn = header();
    const words = wordsIn('en');

    expect(mainLinks).toHaveLength(6);
    expect(theWaysIn().map((link) => link.path)).toEqual(['', 'privacy/', 'support/']);

    for (const link of mainLinks) {
      expect({
        word: link.word,
        drawn: drawn.includes(`>${words[link.word]}</a>`),
        address: drawn.includes(`href="/en/${link.path}"`),
      }).toEqual({
        word: link.word,
        drawn: link.waitsForItsPage !== true,
        address: link.waitsForItsPage !== true,
      });
    }
  });

  it('holds the way to her account until the page she signs in on exists', () => {
    expect(theWayIn.waitsForItsPage).toBe(true);
    expect(theWayIn.path).toBe('sign-in/');
    expect(header()).not.toContain(`aria-label="${wordsIn('en').headerSignInLabel}"`);
    expect(header()).not.toContain('href="/en/sign-in/"');
  });

  it(
    'sits on the warm paper of the board, under a hairline of the board',
    async () => {
      const painted = Object.values(await whatTheMarkupDraws(header())).join(' ');

      expect(painted).toContain(websiteColour.siteGround);
      expect(painted).toContain(websiteColour.siteHeaderLine);
      expect(painted).toContain(`color: ${websiteColour.siteText}`);
      expect(painted).toContain(`padding-inline: ${space.spaceXl}px`);
    },
    longEnoughToCompile,
  );
});

describe('the band at the foot of every page', () => {
  const footer = (): string => markup(<SiteFooter language="en" />);

  /**
   * The presses of the band that wait for the page behind them, with the press to the store among
   * them: Apple issues its address with the pre-order. Written out rather than read off the flag
   * each one carries, because a list taken from the flag follows it, and the day somebody draws a
   * press whose page is not there nothing would fail.
   */
  const theWordsWaitingForTheirPage: readonly SiteWordKey[] = [
    'footerAppStore',
    'footerBuyOnTheWeb',
    'footerTransparency',
    'footerCalculator',
    'footerGuides',
    'footerPulse',
    'footerAccount',
  ];

  /** The presses the band draws, in its order, which is every press whose page a reader can open. */
  const theWordsTheBandDraws: readonly SiteWordKey[] = [
    'footerBeta',
    'footerHowEmiProtects',
    'footerOpenCode',
    'footerSupport',
    'footerCommunity',
  ];

  it('says what Emi is not, and names no company but the three a press carries', () => {
    const drawn = footer();

    expect(drawn).toContain(wordsIn('en').footerDisclaimer);
    expect(hostsAPageMayNotName(drawn)).toEqual([]);
    expect(drawn).not.toContain('style=');
  });

  it('holds the four groups of the board, three links in each, and draws the three left with a press', () => {
    const drawn = footer();
    const words = wordsIn('en');

    expect(footerGroups).toHaveLength(4);

    for (const group of footerGroups) {
      expect(group.links).toHaveLength(3);
    }

    // The group about learning has a press for the calculator, a press for the guides and a press
    // for Pulse, and none of the three pages exists, so the band draws neither it nor its heading.
    expect(theGroupsOfTheBand().map((group) => group.title)).toEqual([
      'footerEmiGroup',
      'footerPrivacyGroup',
      'footerHelpGroup',
    ]);
    expect(drawn).not.toContain(`aria-label="${words.footerLearnGroup}"`);

    for (const group of theGroupsOfTheBand()) {
      expect(drawn).toContain(`aria-label="${words[group.title]}"`);
    }
  });

  it('draws each press whose page exists, and holds the seven that wait for theirs', () => {
    const drawn = footer();
    const words = wordsIn('en');
    const everyLink = footerGroups.flatMap((group) => group.links);

    expect(
      everyLink.filter((link) => link.waitsForItsPage === true).map((link) => link.word),
    ).toEqual(theWordsWaitingForTheirPage);
    expect(theGroupsOfTheBand().flatMap((group) => group.links.map((link) => link.word))).toEqual(
      theWordsTheBandDraws,
    );

    for (const word of theWordsWaitingForTheirPage) {
      expect({ word, drawn: drawn.includes(`>${words[word]}</a>`) }).toEqual({
        word,
        drawn: false,
      });
    }

    for (const word of theWordsTheBandDraws) {
      expect({ word, drawn: drawn.includes(`>${words[word]}</a>`) }).toEqual({
        word,
        drawn: true,
      });
    }
  });

  it('sends her off the site for the beta and for the code, and nowhere else', () => {
    const drawn = footer();
    const leaving = [...drawn.matchAll(/<a ([^>]*)>([^<]*)<\/a>/g)].filter(([, attributes = '']) =>
      attributes.includes('rel="noopener"'),
    );

    expect(leaving.map(([, , words = '']) => words)).toEqual([
      wordsIn('en').footerBeta,
      wordsIn('en').footerOpenCode,
      wordsIn('en').footerCommunity,
    ]);
    expect(drawn).toContain(`href="${THE_EMI_BETA}"`);
    expect(drawn).toContain(`href="${THE_EMI_CODE}"`);
  });

  it('names who she would be paying, and lets her read the page in her own language', () => {
    const drawn = footer();

    expect(drawn).toContain(wordsIn('en').footerCopyright);
    expect(drawn).toContain('href="/ru/"');
    expect(drawn).toContain('href="/es/"');
    expect(drawn).toContain('Русский');
  });

  it('draws no press to the page she is already on', () => {
    const drawn = footer();
    const everyAddress = [...drawn.matchAll(/href="([^"]*)"/g)].map(([, found]) => found);

    expect(everyAddress).not.toContain(NO_PAGE_YET);
    expect(everyAddress.length).toBeGreaterThan(0);

    // The eight named above are eight entries of the band and not eight words nobody uses, so a
    // list that drifted out of the band cannot go on describing a band that is not there.
    for (const word of theWordsWaitingForTheirPage) {
      expect(footerGroups.flatMap((group) => group.links).map((link) => link.word)).toContain(word);
    }
  });

  it('refuses a press that has no address at all, by name', () => {
    // A press with neither an address off the site nor a path under the language used to resolve to
    // the home page, which does nothing she can see. It refuses now, so the mistake is a failure
    // rather than a dead press on a live page.
    expect(() => theAddressOfAPress('en', { word: 'footerAppStore' })).toThrow(/footerAppStore/);
    expect(() => theAddressOfAPress('en', { word: 'footerAppStore', outside: '' })).toThrow(
      /footerAppStore/,
    );
    expect(theAddressOfAPress('en', { word: 'footerSupport', path: 'support/' })).toBe(
      '/en/support/',
    );
    expect(theAddressOfAPress('ru', { word: 'footerBeta', outside: THE_EMI_BETA })).toBe(
      THE_EMI_BETA,
    );
  });

  it('holds the terms until the page she agrees to them on exists', () => {
    expect(theTerms.waitsForItsPage).toBe(true);
    expect(theTerms.path).toBe('terms/');
    expect(footer()).not.toContain('href="/en/terms/"');
    expect(footer()).not.toContain(`>${wordsIn('en').footerTerms}</a>`);
  });

  it(
    'writes its words in the quieter tone of the board, at the smaller body size',
    async () => {
      const painted = Object.values(await whatTheMarkupDraws(footer())).join(' ');

      expect(painted).toContain(`color: ${websiteColour.siteQuietText}`);
      expect(painted).toContain(`background-color: ${websiteColour.siteFooterGround}`);
      expect(painted).toContain(`font-size: ${typeScale['body-sm'].size}px`);
    },
    longEnoughToCompile,
  );
});

describe('a class the theme never gave a value', () => {
  it(
    'draws nothing at all, which is why every case above reads the declarations and not the class',
    async () => {
      const stylesheet = await stylesheetFor(['bg-accent', 'bg-brandBlue']);

      expect(declarationsOf(stylesheet, 'bg-accent')).toContain(colour.accent);
      expect(declarationsOf(stylesheet, 'bg-brandBlue')).toBe('');
    },
    longEnoughToCompile,
  );
});
