import { colour } from '@emi/tokens';
import { renderToStaticMarkup } from 'react-dom/server';

import RootLayout from '../app/layout';
import NotFound from '../app/not-found';
import { MADE_BY } from '../components/siteFooter';
import { WORDMARK_FILE } from '../components/siteHeader';
import { SERVED_FACE_VARIABLE } from '../lib/face';
import { whatTheMarkupDraws } from './stylesheet';

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

  it('arrives inside the header, a card and the footer, so it looks like the rest of the site', () => {
    expect(page()).toContain('<header');
    expect(page()).toContain('<footer');
    expect(page()).toContain(MADE_BY);
    expect(page()).toContain(WORDMARK_FILE);
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
    expect(document()).toMatch(/<body class="[^"]+">/);
    expect(document()).toContain('This page does not exist');
  });

  it('sets the face the site serves and the paper it draws on, on the body', async () => {
    const drawn = document();
    const painted = Object.values(await whatTheMarkupDraws(drawn)).join(' ');

    expect(painted).toContain(`background-color: ${colour.ground}`);
    expect(painted).toContain(`color: ${colour.text}`);
    expect(painted).toContain(`font-family: var(${SERVED_FACE_VARIABLE})`);
  }, 60_000);
});
