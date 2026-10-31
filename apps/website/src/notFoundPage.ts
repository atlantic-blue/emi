import { createElement as element, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/** What she reads at the top of the page, and what the browser tab says. */
export const notFoundHeadline = 'This page does not exist';

/** Where the one link on the page goes. */
export const homeAddress = '/';

export function notFoundPage(): ReactElement {
  return element(
    'html',
    { lang: 'en' },
    element(
      'head',
      null,
      element('meta', { charSet: 'utf-8' }),
      element('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1' }),
      element('title', null, `${notFoundHeadline} | Emi`),
    ),
    element(
      'body',
      null,
      element(
        'main',
        null,
        element('h1', null, notFoundHeadline),
        element('p', null, 'The address you opened is not part of this site.'),
        element('a', { href: homeAddress }, 'Go to the Emi home page'),
      ),
    ),
  );
}

// React draws elements, and a document type declaration is not one, so it is written in front of
// the markup rather than rendered with it.
export function renderNotFoundPage(): string {
  return `<!doctype html>\n${renderToStaticMarkup(notFoundPage())}\n`;
}
