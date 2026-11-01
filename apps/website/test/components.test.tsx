import { colour, radius, space, typeScale } from '@emi/tokens';
import { renderToStaticMarkup } from 'react-dom/server';

import { SiteFooter } from '../components/siteFooter';
import { SiteHeader, WORDMARK_FILE } from '../components/siteHeader';
import { Button, buttonVariants } from '../components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { declarationsOf, stylesheetFor, whatTheMarkupDraws } from './stylesheet';

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
  it('carries the mark, which this site serves itself, and the way home', () => {
    const drawn = markup(<SiteHeader />);

    expect(drawn).toContain(`src="${WORDMARK_FILE}"`);
    expect(WORDMARK_FILE.startsWith('/')).toBe(true);
    expect(drawn).toContain('alt="Emi"');
    expect(drawn).toMatch(/<a [^>]*href="\/"/);
  });

  it(
    'sits on the warm paper the rest of the page sits on',
    async () => {
      const painted = Object.values(await whatTheMarkupDraws(markup(<SiteHeader />))).join(' ');

      expect(painted).toContain(`background-color: ${colour.ground}`);
      expect(painted).toContain(`padding-inline: ${space.margin}px`);
    },
    longEnoughToCompile,
  );
});

describe('the band at the foot of every page', () => {
  it('says who makes Emi, and asks no other company for anything', () => {
    const drawn = markup(<SiteFooter />);

    expect(drawn).toContain('Emi is made by Atlantic Blue Solutions Limited.');
    expect(drawn).not.toMatch(/https?:\/\//);
  });

  it(
    'writes that line in the quieter tone, at the smaller body size',
    async () => {
      const painted = Object.values(await whatTheMarkupDraws(markup(<SiteFooter />))).join(' ');

      expect(painted).toContain(`color: ${colour.secondaryText}`);
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
