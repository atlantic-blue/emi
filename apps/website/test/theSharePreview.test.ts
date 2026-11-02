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
      title,
      description: words.pageDescription,
      url: `${SITE_ORIGIN}/${language}/`,
      locale: localeOf(language),
      images: [{ url: `${SITE_ORIGIN}${SHARE_PREVIEW}`, width: 1200, height: 630 }],
    });
    expect(metadata.twitter).toEqual({
      card: 'summary_large_image',
      title,
      description: words.pageDescription,
      images: [`${SITE_ORIGIN}${SHARE_PREVIEW}`],
    });
  });

  it('draws the same picture for every language, because the picture has no words of one', async () => {
    const pointed = await Promise.all(
      languages.map(async (language) => {
        const metadata = await generateMetadata({ params: Promise.resolve({ lang: language }) });

        return JSON.stringify(metadata.openGraph?.images);
      }),
    );

    expect(new Set(pointed).size).toBe(1);
  });
});
