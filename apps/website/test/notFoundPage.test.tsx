import { colour } from '@emi/tokens';
import { renderToStaticMarkup } from 'react-dom/server';

import RootLayout from '../app/[lang]/layout';
import NotFound from '../app/[lang]/not-found';
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
    expect(page()).toContain('Emi is made by Atlantic Blue Solutions Limited.');
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
  const documentIn = async (lang: string): Promise<string> =>
    markupOf(await RootLayout({ children: <NotFound />, params: Promise.resolve({ lang }) }));

  it('declares the language, so a screen reader says the words the right way', async () => {
    expect(await documentIn('ru')).toMatch(/^<html lang="ru">/);
    expect(await documentIn('es')).toMatch(/^<html lang="es">/);
  });

  it('declares the fallback where the address names a language the site does not serve', async () => {
    expect(await documentIn('de')).toMatch(/^<html lang="en">/);
  });

  it('puts the page inside the body', async () => {
    const document = await documentIn('en');

    expect(document).toMatch(/<body class="[^"]+">/);
    expect(document).toContain('This page does not exist');
  });

  it('sets the face the site serves and the paper it draws on, on the body', async () => {
    const drawn = await documentIn('en');
    const painted = Object.values(await whatTheMarkupDraws(drawn)).join(' ');

    expect(painted).toContain(`background-color: ${colour.ground}`);
    expect(painted).toContain(`color: ${colour.text}`);
    expect(painted).toContain(`font-family: var(${SERVED_FACE_VARIABLE})`);
  }, 60_000);
});
