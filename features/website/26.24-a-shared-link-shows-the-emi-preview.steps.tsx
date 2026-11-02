import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

import { generateMetadata } from '../../apps/website/app/[lang]/layout';
import {
  languages,
  localeOf,
  pageTitleOf,
  wordsIn,
  type Language,
} from '../../apps/website/app/words';
import { SHARE_PREVIEW, SITE_ORIGIN } from '../../apps/website/lib/addresses';
import { pngSize } from '../../apps/website/tools/theIcons';
import { moduleDirectory } from '../../infrastructure/modules/nextjs-site/tests/runArtifact';
import { bodyOf, configurationOf, listedIn } from '../../tools/pipeline/policy';

const feature = loadFeature(join(__dirname, '26.24-a-shared-link-shows-the-emi-preview.feature'));

const repositoryRoot = resolve(__dirname, '..', '..');

const websiteWorkspace = join(repositoryRoot, 'apps', 'website');

/** What a chat application reads off a page: the words of the card, and the picture beside them. */
interface WhatTheChatReads {
  readonly title?: string;
  readonly description?: string;
  readonly url?: string;
  readonly locale?: string;
  readonly images?: readonly { readonly url: string; width?: number; height?: number }[];
}

interface WhatTheCardSays extends WhatTheChatReads {
  readonly card?: string;
}

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

async function sharedFrom(language: Language): Promise<{
  openGraph: WhatTheChatReads;
  twitter: WhatTheCardSays;
  title: unknown;
}> {
  const metadata = await generateMetadata({ params: Promise.resolve({ lang: language }) });

  return {
    openGraph: (metadata.openGraph ?? {}) as WhatTheChatReads,
    twitter: (metadata.twitter ?? {}) as WhatTheCardSays,
    title: metadata.title,
  };
}

defineFeature(feature, (test) => {
  test('a shared link shows the Emi preview', ({ given, then, and }) => {
    let shared: Record<Language, Awaited<ReturnType<typeof sharedFrom>>>;

    given('a woman pastes the address of an Emi page into a chat with her sister', async () => {
      const read = await Promise.all(languages.map(async (language) => sharedFrom(language)));

      shared = Object.fromEntries(
        languages.map((language, at) => [language, read[at]]),
      ) as typeof shared;

      expect(languages).toEqual(['en', 'ru', 'es']);
    });

    then(
      "her sister reads the name and the sentence that page opens with, in that page's language",
      () => {
        // The sentence of the page itself, so the chat and the first line of the page cannot
        // drift apart. Written out here as well, because a derivation read against itself proves
        // nothing about what she actually reads.
        expect(languages.map((language) => shared[language].title)).toEqual([
          'Emi: understand your body, safely',
          'Emi: понимайте своё тело бережно',
          'Emi: entiende tu cuerpo, con calma',
        ]);

        for (const language of languages) {
          expect(shared[language].title).toBe(pageTitleOf(wordsIn(language)));
          expect(shared[language].openGraph.title).toBe(shared[language].title);
          expect(shared[language].twitter.title).toBe(shared[language].title);
        }
      },
    );

    and('she reads what Emi is, in the words of that page', () => {
      for (const language of languages) {
        const said = wordsIn(language).pageDescription;

        expect({ language, said: shared[language].openGraph.description }).toEqual({
          language,
          said,
        });
        expect({ language, said: shared[language].twitter.description }).toEqual({
          language,
          said,
        });
      }
    });

    and('the chat is told which language and region the page is written for', () => {
      expect(languages.map((language) => shared[language].openGraph.locale)).toEqual([
        'en_GB',
        'ru_RU',
        'es_ES',
      ]);

      for (const language of languages) {
        expect(shared[language].openGraph.locale).toBe(localeOf(language));

        // The address of the page itself is whole for the same reason the picture's is: the chat
        // reads it where no page of this site is.
        expect(shared[language].openGraph.url).toBe(`${SITE_ORIGIN}/${language}/`);
      }
    });

    and('the chat is given the whole address of the picture, not a path it cannot follow', () => {
      for (const language of languages) {
        const [picture] = shared[language].openGraph.images ?? [];

        expect({ language, address: picture?.url }).toEqual({
          language,
          address: 'https://myemi.app/share-preview.png',
        });
        expect(shared[language].twitter.images).toEqual(['https://myemi.app/share-preview.png']);
      }

      expect(`${SITE_ORIGIN}${SHARE_PREVIEW}`).toBe('https://myemi.app/share-preview.png');
    });

    and('the picture is the board the operator drew, at the size a chat draws it', () => {
      const drawn = readFileSync(join(websiteWorkspace, 'public', 'share-preview.png'));

      expect(pngSize(drawn)).toEqual({ width: 1200, height: 630 });

      // The two numbers the chat is told have to be the two the file really is, because a chat
      // lays the card out from the tags before it has the picture.
      for (const language of languages) {
        const [picture] = shared[language].openGraph.images ?? [];

        expect({ width: picture?.width, height: picture?.height }).toEqual({
          width: 1200,
          height: 630,
        });
      }

      // The board that drew it, committed beside it, so the next picture is drawn from the same
      // page rather than from somebody's memory of it.
      const board = read(
        join(
          repositoryRoot,
          'docs',
          'design',
          'website',
          'share-preview',
          'boards',
          'SharePreview.dc.html',
        ),
      );

      expect(board).toContain('Understand your body, safely.');
      expect(board).toContain('EMI · EVERY MONTH INSIGHTS');
      expect(board).toContain('myemi.app');
    });

    and('the chat is told to draw it large, beside the words', () => {
      for (const language of languages) {
        expect({ language, card: shared[language].twitter.card }).toEqual({
          language,
          card: 'summary_large_image',
        });
      }
    });

    and('the edge answers for the picture, so it reaches her sister at all', () => {
      const site = configurationOf(moduleDirectory);

      expect(listedIn(bodyOf(site, 'locals'), 'asset_paths')).toContain(SHARE_PREVIEW);
    });

    and('a browser opens each page and reads the same answers off it', () => {
      const sentence = 'a shared link shows the Emi preview';
      const theFeature = read(join(websiteWorkspace, 'e2e', 'features', 'theSharePreview.feature'));
      const theSteps = read(join(websiteWorkspace, 'e2e', 'steps', 'theSharePreview.ts'));

      expect(theFeature).toContain(`Scenario Outline: ${sentence}`);

      for (const language of languages) {
        expect(theFeature).toContain(`| /${language}/ |`);
      }

      // The browser reads the tags off the document the server really drew, and asks the site for
      // the picture, so the deploy proves the live host and not only this checkout.
      for (const tag of ['og:title', 'og:description', 'og:locale', 'og:url', 'og:image']) {
        expect({ tag, read: theSteps.includes(`'${tag}'`) }).toEqual({ tag, read: true });
      }

      expect(theSteps).toContain("'og:image:width'");
      expect(theSteps).toContain("'og:image:height'");
      expect(theSteps).toContain("'twitter:card'");
      expect(theSteps).toContain('request.get(');
      expect(theSteps).toContain('status()).toBe(200)');
    });
  });
});
