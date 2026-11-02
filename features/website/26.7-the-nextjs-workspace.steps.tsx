import { join } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';
import { renderToStaticMarkup } from 'react-dom/server';

import RootLayout from '../../apps/website/app/[lang]/layout';
import NotFound from '../../apps/website/app/[lang]/not-found';

const feature = loadFeature(join(__dirname, '26.7-the-nextjs-workspace.feature'));

/**
 * Next.js puts the page it chose inside the root layout and answers with one document, so the
 * scenario composes them the same way. Reading the page on its own would read half of what she is
 * sent: the words, and not the document they arrive in.
 */
async function whatTheSiteSends(): Promise<string> {
  return renderToStaticMarkup(
    await RootLayout({ children: <NotFound />, params: Promise.resolve({ lang: 'en' }) }),
  );
}

defineFeature(feature, (test) => {
  test('the website renders a not found page with Next.js', ({ given, when, then, and }) => {
    let address = '';
    let page = '';

    given('a woman opens an address myemi.app does not have', () => {
      address = '/privaacy';

      expect(address).not.toBe('/');
    });

    when('the site answers her', async () => {
      page = await whatTheSiteSends();
    });

    then('she reads that the page does not exist', () => {
      expect(page).toContain('This page does not exist');
    });

    and('she is offered the way back to the Emi home page', () => {
      expect(page).toMatch(/<a[^>]*href="\/"[^>]*>[^<]*Emi[^<]*<\/a>/);
    });

    and("the page she reads is Emi's own, in a language the browser was told", () => {
      expect(page).toContain('Emi');
      expect(page).toMatch(/^<html lang="en">/);
      expect(page).toContain('</html>');
    });
  });
});
