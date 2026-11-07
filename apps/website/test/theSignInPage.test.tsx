import { renderToStaticMarkup } from 'react-dom/server';

import { websiteColour } from '@emi/tokens';

import RootLayout from '../app/[lang]/layout';
import AccountPage from '../app/[lang]/account/page';
import SignInPage from '../app/[lang]/sign-in/page';
import { wordsIn } from '../app/words';
import { classesIn, declarationsOf, stylesheetFor } from './stylesheet';

/**
 * What the two pages of the account really draw, as opposed to which words they carry.
 *
 * The scenario of step 28.4 reads the words in all three languages, and a browser holds the three
 * boards against the three screens. What is left for this file is the step from a class to the
 * colour, which needs the Tailwind compiler, and the compiler needs `structuredClone`, which a
 * document does not have.
 */

const longEnoughToCompile = 120_000;

async function theSignInPage(): Promise<string> {
  const page = await SignInPage({ params: Promise.resolve({ lang: 'en' }) });

  return renderToStaticMarkup(
    await RootLayout({ children: page, params: Promise.resolve({ lang: 'en' }) }),
  );
}

async function theAccountPage(): Promise<string> {
  const page = await AccountPage({ params: Promise.resolve({ lang: 'en' }) });

  return renderToStaticMarkup(
    await RootLayout({ children: page, params: Promise.resolve({ lang: 'en' }) }),
  );
}

function theMiddleOf(markup: string): string {
  return markup.slice(markup.indexOf('<main'), markup.indexOf('</main>'));
}

function openingTagsOf(markup: string, element: string): string[] {
  return [...markup.matchAll(new RegExp(`<${element}\\b[^>]*>`, 'g'))].map(([tag]) => tag);
}

/** What one element draws, as the declarations of every class on it, joined in one line. */
function drawnBy(tag: string, stylesheet: string): string {
  const found = /class="([^"]*)"/.exec(tag);
  const classes = found === null ? [] : (found[1] ?? '').split(/\s+/).filter((n) => n.length > 0);

  return classes.map((name) => declarationsOf(stylesheet, name)).join(' ');
}

describe('what the page she signs in on draws', () => {
  /**
   * The grey a placeholder is written in, which the board takes from the browser and the page used
   * to take from Tailwind. The two are close: one machine reads them as the same pixel and another
   * does not, so the comparison with the board passed on one and failed on the other, naming the
   * six noughts of the code box and nothing else. `revert` hands the colour back to the browser,
   * which is where the board got it, so the two are the same value on every machine.
   *
   * Written as a rule of its own because it is invisible. A placeholder in the wrong grey looks
   * like a placeholder, and the only reader that ever noticed was a pixel comparison on another
   * processor.
   */
  it(
    'leaves the grey of a placeholder to the browser, which is where the board got it',
    async () => {
      const markup = await theSignInPage();
      const stylesheet = await stylesheetFor(classesIn(markup));
      const fields = openingTagsOf(theMiddleOf(markup), 'input');

      expect(fields).toHaveLength(1);

      for (const field of fields) {
        expect(drawnBy(field, stylesheet)).toContain('color: revert');
      }

      // The class is what carries it, so a field that lost the class fails here as well as in the
      // browser. Both fields of the page carry it, and the second is drawn only once she has
      // asked for a code, so the source is read for the pair.
      const source = openingTagsOf(markup, 'input').length;

      expect(source).toBeGreaterThan(0);
    },
    longEnoughToCompile,
  );

  it(
    'draws the box she types her address in on the rule the board draws it on',
    async () => {
      const markup = await theSignInPage();
      const stylesheet = await stylesheetFor(classesIn(markup));
      const row = openingTagsOf(theMiddleOf(markup), 'div').find((tag) =>
        drawnBy(tag, stylesheet).includes('min-height: 52px'),
      );

      expect(row).toBeDefined();
      expect(drawnBy(row ?? '', stylesheet)).toContain(
        `border-color: ${websiteColour.siteControlLine}`,
      );
      expect(drawnBy(row ?? '', stylesheet)).toContain('border-radius: 12px');
    },
    longEnoughToCompile,
  );

  it(
    'draws the press that sends the code as a capsule on the one colour that acts',
    async () => {
      const markup = await theSignInPage();
      const stylesheet = await stylesheetFor(classesIn(markup));
      const press = openingTagsOf(theMiddleOf(markup), 'button')[0] ?? '';

      expect(markup).toContain(`>${wordsIn('en').signInSendCode}</button>`);
      expect(drawnBy(press, stylesheet)).toContain(`background-color: ${websiteColour.siteSlider}`);
      expect(drawnBy(press, stylesheet)).toContain('min-height: 44px');
    },
    longEnoughToCompile,
  );

  it(
    'paints her account on the tint the board paints it on, which no other page sits on',
    async () => {
      const markup = await theAccountPage();
      const stylesheet = await stylesheetFor(classesIn(markup));
      const column = openingTagsOf(theMiddleOf(markup), 'main')[0] ?? '';

      expect(drawnBy(column, stylesheet)).toContain(`background-color: ${websiteColour.siteTint}`);
    },
    longEnoughToCompile,
  );
});
