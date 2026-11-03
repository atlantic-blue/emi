import { websiteColour } from '@emi/tokens';
import { renderToStaticMarkup } from 'react-dom/server';

import RootLayout from '../app/[lang]/layout';
import NotFound from '../app/[lang]/not-found';
import { SERVED_FACE_VARIABLES } from '../lib/face';
import { hostsIn } from '../lib/theOnePrice';
import { whatTheMarkupDraws } from './stylesheet';
import { hostsAPageMayNotName } from './theHostsAPageMayName';

function markupOf(element: Parameters<typeof renderToStaticMarkup>[0]): string {
  return renderToStaticMarkup(element);
}

/** The whole document she is sent, because the page is half of it and the frame is the other half. */
const documentIn = async (lang: string): Promise<string> =>
  markupOf(await RootLayout({ children: <NotFound />, params: Promise.resolve({ lang }) }));

describe('the page behind an address the site does not have', () => {
  const page = (): string => markupOf(<NotFound />);

  it('says the page does not exist', () => {
    expect(page()).toContain('This page does not exist');
  });

  it('offers the way back to the home page', () => {
    expect(page()).toMatch(/href="\/"/);
  });

  it('arrives inside the header, a card and the footer, so it looks like the rest of the site', async () => {
    const document = await documentIn('en');

    expect(document).toContain('<header');
    expect(document).toContain('<footer');
    expect(document).toContain('Atlantic Blue Solutions Limited.');
    expect(document).toContain('aria-label="Emi"');
  });

  it('names Emi, so she can tell whose page she is reading', () => {
    expect(page()).toContain('Emi');
  });

  it('names no host but the community chat, page and frame alike', async () => {
    // The page itself offers nothing outside the site. The frame around it carries the band at the
    // foot, and that band names the chat the Emi Community reads on, which she opens by pressing
    // and not by arriving here.
    expect(hostsIn(page())).toEqual([]);
    expect(hostsAPageMayNotName(await documentIn('en'))).toEqual([]);
  });
});

describe('the document every page arrives in', () => {
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

    expect(painted).toContain(`background-color: ${websiteColour.siteGround}`);
    expect(painted).toContain(`color: ${websiteColour.siteText}`);
    expect(painted).toContain(`font-family: var(${SERVED_FACE_VARIABLES.text})`);
  }, 60_000);
});
