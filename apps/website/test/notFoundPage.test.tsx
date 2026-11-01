import { renderToStaticMarkup } from 'react-dom/server';

import RootLayout from '../app/layout';
import NotFound from '../app/not-found';

function markupOf(element: Parameters<typeof renderToStaticMarkup>[0]): string {
  return renderToStaticMarkup(element);
}

describe('the page behind an address the site does not have', () => {
  const page = (): string => markupOf(<NotFound />);

  it('says the page does not exist', () => {
    expect(page()).toContain('This page does not exist');
  });

  it('offers the way back to the home page', () => {
    expect(page()).toMatch(/href="\/"/);
  });

  it('names Emi, so she can tell whose page she is reading', () => {
    expect(page()).toContain('Emi');
  });

  it('asks no other host for anything', () => {
    expect(page()).not.toMatch(/https?:\/\//);
  });
});

describe('the document every page arrives in', () => {
  const document = (): string =>
    markupOf(
      <RootLayout>
        <NotFound />
      </RootLayout>,
    );

  it('declares the language, so a screen reader says the words the right way', () => {
    expect(document()).toMatch(/^<html lang="en">/);
  });

  it('puts the page inside the body', () => {
    expect(document()).toContain('<body>');
    expect(document()).toContain('This page does not exist');
  });
});
