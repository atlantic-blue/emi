import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { generateMetadata } from '../app/[lang]/layout';
import { languages, localeOf, pageTitleOf, wordsIn } from '../app/words';
import { SHARE_PREVIEW, SITE_ORIGIN } from '../lib/addresses';
import { pngSize } from '../tools/theIcons';

/**
 * Contract SITE-3. The title of a page and the card a chat draws from it, in each of the three
 * languages, and the one picture all three of them point at.
 */

const thePicture = join(__dirname, '..', 'public', 'share-preview.png');

/**
 * The one picture a card points at. The metadata type allows one or several, and allows each of
 * them to be written as an address or as an address with its size and its description, so this
 * reads whichever way the layout wrote it.
 */
function theOnePicture(images: unknown): { url?: string; alt?: string } {
  const [first] = Array.isArray(images) ? images : [images];

  return (first ?? {}) as { url?: string; alt?: string };
}

describe('the title a tab and a chat both read', () => {
  it('opens with the name and then the sentence the page opens with', () => {
    expect(languages.map((language) => pageTitleOf(wordsIn(language)))).toEqual([
      'Emi: understand your body, safely',
      'Emi: понимайте своё тело бережно',
      'Emi: entiende tu cuerpo, con calma',
    ]);
  });

  it.each(languages)('reads the headline of its own language, in %s', (language) => {
    const words = wordsIn(language);
    const title = pageTitleOf(words);

    // The headline without its full stop, so the tab and the first line of the page cannot say
    // two different things. Lower case at the front, because it follows a colon.
    expect(title.startsWith('Emi: ')).toBe(true);
    expect(title.slice('Emi: '.length).toLocaleLowerCase()).toBe(
      words.heroHeadline.replace(/\.$/, '').toLocaleLowerCase(),
    );
    expect(title.endsWith('.')).toBe(false);
  });

  it('says a different sentence in each language, because the page does', () => {
    expect(new Set(languages.map((language) => pageTitleOf(wordsIn(language)))).size).toBe(
      languages.length,
    );
  });

  it.each(languages)('names a language and a region for %s', (language) => {
    expect(localeOf(language)).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
    expect(localeOf(language).startsWith(`${language}_`)).toBe(true);
  });
});

describe('the picture a chat draws beside the words', () => {
  it('is the size the card tells a chat it is', () => {
    expect(pngSize(readFileSync(thePicture))).toEqual({ width: 1200, height: 630 });
  });

  it('is pointed at by a whole address, because a chat reads the tag on its own server', () => {
    expect(SITE_ORIGIN).toBe('https://myemi.app');
    expect(`${SITE_ORIGIN}${SHARE_PREVIEW}`).toBe('https://myemi.app/share-preview.png');
  });
});

describe('what the layout tells a chat', () => {
  it.each(languages)('carries the whole card in %s', async (language) => {
    const metadata = await generateMetadata({ params: Promise.resolve({ lang: language }) });
    const words = wordsIn(language);
    const title = pageTitleOf(words);

    expect(metadata.title).toBe(title);
    expect(metadata.description).toBe(words.pageDescription);
    expect(metadata.openGraph).toEqual({
      type: 'website',
      siteName: 'Emi',
      title,
      description: words.pageDescription,
      url: `${SITE_ORIGIN}/${language}/`,
      locale: localeOf(language),
      images: [
        {
          url: `${SITE_ORIGIN}${SHARE_PREVIEW}`,
          width: 1200,
          height: 630,
          alt: words.sharePictureAlt,
        },
      ],
    });
    expect(metadata.twitter).toEqual({
      card: 'summary_large_image',
      title,
      description: words.pageDescription,
      images: [{ url: `${SITE_ORIGIN}${SHARE_PREVIEW}`, alt: words.sharePictureAlt }],
    });
  });

  it('points every language at the one picture, and describes it in each', async () => {
    const shown = await Promise.all(
      languages.map(async (language) => {
        const metadata = await generateMetadata({ params: Promise.resolve({ lang: language }) });
        return theOnePicture(metadata.openGraph?.images);
      }),
    );

    // One file for all three, because the picture holds no words of a language. The sentence
    // beside it is three, because the woman reading the card does.
    expect(new Set(shown.map((picture) => picture?.url)).size).toBe(1);
    expect(new Set(shown.map((picture) => picture?.alt)).size).toBe(languages.length);
  });

  it('tells a woman who cannot see the picture what it shows, in her own language', () => {
    expect(languages.map((language) => wordsIn(language).sharePictureAlt)).toEqual([
      'The Emi icon, the headline Understand your body, safely, and the cycle ring at day 8 of about 31, follicular phase.',
      'Иконка Emi, заголовок «Понимайте своё тело бережно» и кольцо цикла на дне 8 из примерно 31, фолликулярная фаза.',
      'El icono de Emi, el titular Entiende tu cuerpo, con calma, y el anillo del ciclo en el día 8 de unos 31, fase folicular.',
    ]);
  });
});
