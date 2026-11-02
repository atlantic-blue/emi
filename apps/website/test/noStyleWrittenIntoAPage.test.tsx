import { renderToStaticMarkup } from 'react-dom/server';

import NotFound from '../app/[lang]/not-found';
import HomePage from '../app/[lang]/page';
import { type Language, languages } from '../app/words';

/**
 * The policy of SITE-6 names a secret for a style, and a secret cannot be put on a style written
 * on an element. So her browser refuses one, and whatever that style was doing to the page stops
 * happening. The page still arrives, which is what makes this worth a test of its own: nothing
 * fails, the page simply draws a little wrong, and only a reader finds out.
 *
 * A block of style is refused for the same reason unless it carries the secret, and no page here
 * writes one, so both shapes are read.
 */

function stylesWrittenInto(markup: string): string[] {
  return [
    ...[...markup.matchAll(/style="[^"]*"/g)].map(([found]) => found),
    ...[...markup.matchAll(/<style[\s>]/g)].map(([found]) => found),
  ];
}

const homePageIn = async (language: Language): Promise<string> =>
  renderToStaticMarkup(await HomePage({ params: Promise.resolve({ lang: language }) }));

describe('no page of the site writes a style the policy would refuse', () => {
  it.each(languages)('the page a woman meets Emi on, in %s', async (language) => {
    expect(stylesWrittenInto(await homePageIn(language))).toEqual([]);
  });

  it('the page behind an address the site does not have', () => {
    expect(stylesWrittenInto(renderToStaticMarkup(<NotFound />))).toEqual([]);
  });

  it('reads a style where one is written, so a page that grows one fails this', () => {
    expect(stylesWrittenInto('<div style="color:transparent"></div>')).toEqual([
      'style="color:transparent"',
    ]);
    expect(stylesWrittenInto('<style>a{}</style>')).toEqual(['<style>']);
  });
});
