import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/** What she reads at the top of the page, and what the browser tab says. */
export const notFoundHeadline = 'This page does not exist';

/** Where the one link on the page goes. */
export const homeAddress = '/';

export function NotFoundPage(): ReactElement {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`${notFoundHeadline} | Emi`}</title>
      </head>
      <body>
        <main>
          <h1>{notFoundHeadline}</h1>
          <p>The address you opened is not part of this site.</p>
          <a href={homeAddress}>Go to the Emi home page</a>
        </main>
      </body>
    </html>
  );
}

// React draws elements, and a document type declaration is not one, so it is written in front of
// the markup rather than rendered with it.
export function renderNotFoundPage(): string {
  return `<!doctype html>\n${renderToStaticMarkup(<NotFoundPage />)}\n`;
}
