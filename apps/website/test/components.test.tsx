import { MINIMUM_TAP_TARGET, colour, radius, space, typeScale, websiteColour } from '@emi/tokens';
import { renderToStaticMarkup } from 'react-dom/server';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { wordsIn } from '../app/words';
import { EmiIcon } from '../components/emiIcon';
import { SiteFooter, footerGroups } from '../components/siteFooter';
import { ICON_FILE, SiteHeader } from '../components/siteHeader';
import { NO_PAGE_YET } from '../lib/addresses';
import { Button, buttonVariants } from '../components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { declarationsOf, stylesheetFor, websiteWorkspace, whatTheMarkupDraws } from './stylesheet';

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

  it('offers the way in, the language and the menu, each one a thumb can land on', () => {
    const drawn = header();
    const words = wordsIn('en');

    for (const label of [
      words.headerHomeLabel,
      words.headerMainLabel,
      words.headerLanguageLabel,
      words.headerMenuLabel,
      words.headerSignInLabel,
    ]) {
      expect(drawn).toContain(`aria-label="${label}"`);
    }

    // Two squares she presses, the menu and the way to her account, and the way home which is as
    // tall as a thumb needs without being as wide.
    expect(drawn.match(/(?<![a-z-])h-\[44px\] w-\[44px\]/g)?.length).toBe(2);
    expect(drawn).toContain('min-h-[44px]');
    expect(MINIMUM_TAP_TARGET).toBe(44);
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

  it('says what Emi is not, and asks no other company for anything', () => {
    const drawn = footer();

    expect(drawn).toContain(wordsIn('en').footerDisclaimer);
    expect(drawn).not.toMatch(/https?:\/\//);
    expect(drawn).not.toContain('style=');
  });

  it('carries the four groups the board carries, three links in each', () => {
    const drawn = footer();
    const words = wordsIn('en');

    expect(footerGroups).toHaveLength(4);

    for (const group of footerGroups) {
      expect(drawn).toContain(`aria-label="${words[group.title]}"`);
      expect(group.links).toHaveLength(3);

      for (const link of group.links) {
        expect(drawn).toContain(words[link.word]);
      }
    }
  });

  it('names who she would be paying, and lets her read the page in her own language', () => {
    const drawn = footer();

    expect(drawn).toContain(wordsIn('en').footerCopyright);
    expect(drawn).toContain('href="/ru/"');
    expect(drawn).toContain('href="/es/"');
    expect(drawn).toContain('Русский');
  });

  it('points a link with no page anywhere yet at the page she is already on', () => {
    const drawn = footer();
    const everyAddress = [...drawn.matchAll(/href="([^"]*)"/g)].map(([, found]) => found);

    expect(everyAddress).toContain(NO_PAGE_YET);
    expect(everyAddress.filter((address) => address === NO_PAGE_YET)).toHaveLength(
      footerGroups.flatMap((group) => group.links).filter((link) => link.path === undefined).length,
    );
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
