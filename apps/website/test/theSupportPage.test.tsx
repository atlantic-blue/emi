import { renderToStaticMarkup } from 'react-dom/server';

import { websiteColour } from '@emi/tokens';

import RootLayout from '../app/[lang]/layout';
import SupportPage from '../app/[lang]/support/page';
import { classesIn, declarationsOf, stylesheetFor } from './stylesheet';
import { hostsAPageMayNotName } from './theHostsAPageMayName';

/**
 * What the support page really draws, as opposed to which words it carries.
 *
 * The scenario of step 27.2 reads the words, the addresses and the four places the page differs
 * from the board, and it runs in a document so it can type in the box. A document has no
 * `structuredClone`, which the Tailwind compiler needs, so the step from a class to the colour,
 * the corner and the face is taken here instead, beside the other readings of the stylesheet.
 *
 * A card the page painted white would still hold its three words, so the ground is read and not
 * only the text.
 */

const longEnoughToCompile = 120_000;

async function thePage(): Promise<string> {
  const page = await SupportPage({ params: Promise.resolve({ lang: 'en' }) });

  return renderToStaticMarkup(
    await RootLayout({ children: page, params: Promise.resolve({ lang: 'en' }) }),
  );
}

/** What one element draws, as the declarations of every class on it, joined in one line. */
function drawnBy(tag: string, stylesheet: string): string {
  const found = /class="([^"]*)"/.exec(tag);
  const classes = found === null ? [] : (found[1] ?? '').split(/\s+/).filter((n) => n.length > 0);

  return classes.map((name) => declarationsOf(stylesheet, name)).join(' ');
}

function openingTagsOf(markup: string, element: string): string[] {
  return [...markup.matchAll(new RegExp(`<${element}\\b[^>]*>`, 'g'))].map(([tag]) => tag);
}

function theMiddleOf(markup: string): string {
  return markup.slice(markup.indexOf('<main'), markup.indexOf('</main>'));
}

describe('what the support page draws', () => {
  it(
    'puts each card on the tint, at the corner the board gives it',
    async () => {
      const markup = await thePage();
      const stylesheet = await stylesheetFor(classesIn(markup));

      const onTheTint = openingTagsOf(theMiddleOf(markup), 'a').filter((tag) =>
        /background-color:\s*([^;]+)/
          .exec(drawnBy(tag, stylesheet))?.[1]
          ?.trim()
          .toUpperCase()
          .startsWith(websiteColour.siteTint),
      );

      expect(onTheTint).toHaveLength(3);

      for (const card of onTheTint) {
        expect(drawnBy(card, stylesheet)).toContain('border-radius: 24px');
      }
    },
    longEnoughToCompile,
  );

  it(
    'sets the title and the heading over the questions in the serif the board asks for',
    async () => {
      const markup = await thePage();
      const stylesheet = await stylesheetFor(classesIn(markup));

      const inTheSerif = openingTagsOf(theMiddleOf(markup), '[a-z0-9]+').filter((tag) =>
        drawnBy(tag, stylesheet).includes('Newsreader'),
      );

      expect(inTheSerif).toHaveLength(2);
      expect(inTheSerif[0]?.startsWith('<h1')).toBe(true);
      expect(inTheSerif[1]?.startsWith('<h2')).toBe(true);
    },
    longEnoughToCompile,
  );

  it(
    'draws the box she searches in at the height and the edge the board draws it at',
    async () => {
      const markup = await thePage();
      const stylesheet = await stylesheetFor(classesIn(markup));
      const around = theMiddleOf(markup);
      const box = openingTagsOf(around, 'div').find((tag) =>
        drawnBy(tag, stylesheet).includes('min-height: 52px'),
      );

      expect(box).toBeDefined();

      const drawn = drawnBy(box ?? '', stylesheet);

      expect(drawn).toContain('border-radius: 12px');
      expect(drawn).toContain(`border-color: ${websiteColour.siteControlLine}`);
      expect(drawn).toContain('border-width: 1px');
    },
    longEnoughToCompile,
  );

  it('names no host this site has no business naming, outside the three it does', async () => {
    expect(hostsAPageMayNotName(await thePage())).toEqual([]);
  });
});
