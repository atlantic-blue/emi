import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

import { generateMetadata } from '../../apps/website/app/[lang]/layout';
import { type Language, languages, wordsIn } from '../../apps/website/app/words';

const feature = loadFeature(
  join(__dirname, '26.28-a-shared-link-names-the-site-and-describes-its-picture.feature'),
);

const repositoryRoot = resolve(__dirname, '..', '..');

const websiteWorkspace = join(repositoryRoot, 'apps', 'website');

/** The picture the card points at, which every language shares and this description describes. */
const thePicture = 'https://myemi.app/share-preview.png';

/**
 * What her sister is told the picture shows, in each language, written out rather than read from
 * the catalogue. A sentence read against the catalogue it came from agrees with whatever the
 * catalogue says, and these three are what a woman who cannot see the picture is actually told.
 */
const theDescriptions: Readonly<Record<Language, string>> = {
  en: 'The Emi icon, the headline Understand your body, safely, and the cycle ring at day 8 of about 31, follicular phase.',
  ru: 'Иконка Emi, заголовок «Понимайте своё тело бережно» и кольцо цикла на дне 8 из примерно 31, фолликулярная фаза.',
  es: 'El icono de Emi, el titular Entiende tu cuerpo, con calma, y el anillo del ciclo en el día 8 de unos 31, fase folicular.',
};

/**
 * The three things the picture draws, as each language names them. A description that is present
 * and says something else is a description of another picture, so each one is held to the parts
 * the board really draws.
 */
const theParts: Readonly<Record<Language, readonly string[]>> = {
  en: ['Emi icon', 'headline', 'day 8', 'follicular'],
  ru: ['Иконка Emi', 'заголовок', 'дне 8', 'фолликулярная'],
  es: ['icono de Emi', 'titular', 'día 8', 'folicular'],
};

/** The board the picture is drawn from, which is what the description has to be true of. */
const theBoard = join(
  repositoryRoot,
  'docs',
  'design',
  'website',
  'share-preview',
  'boards',
  'SharePreview.dc.html',
);

/** The sentences a browser reads off a running site, which carry these four answers as well. */
const whatTheBrowserReads = join(websiteWorkspace, 'e2e', 'features', 'theSharePreview.feature');

const howTheBrowserReadsThem = join(websiteWorkspace, 'e2e', 'steps', 'theSharePreview.ts');

/** One picture in a card: where it is, and what a woman who cannot see it is told about it. */
interface APictureInACard {
  readonly url?: string;
  readonly alt?: string;
}

/** What a chat is handed about one page, for the two readers that read a card differently. */
interface WhatTheChatIsHanded {
  readonly kind: unknown;
  readonly site: unknown;
  readonly describedAs: string | undefined;
  readonly pointedAt: string | undefined;
  readonly describedToTheOtherReaderAs: string | undefined;
  readonly theOtherReaderIsPointedAt: string | undefined;
}

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

function pictureOf(images: unknown): APictureInACard {
  const [first] = Array.isArray(images) ? (images as APictureInACard[]) : [];

  return first ?? {};
}

async function handedOver(language: Language): Promise<WhatTheChatIsHanded> {
  const metadata = await generateMetadata({ params: Promise.resolve({ lang: language }) });
  const card = metadata.openGraph ?? {};
  const theOtherReader = metadata.twitter ?? {};
  const inTheCard = pictureOf((card as { images?: unknown }).images);
  const forTheOtherReader = pictureOf((theOtherReader as { images?: unknown }).images);

  return {
    kind: (card as { type?: unknown }).type,
    site: (card as { siteName?: unknown }).siteName,
    describedAs: inTheCard.alt,
    pointedAt: inTheCard.url,
    describedToTheOtherReaderAs: forTheOtherReader.alt,
    theOtherReaderIsPointedAt: forTheOtherReader.url,
  };
}

defineFeature(feature, (test) => {
  test('a shared link names the site and describes its picture', ({ given, then, and }) => {
    const sent = new Map<Language, WhatTheChatIsHanded>();

    given('a woman sends the address of each Emi page to her sister', async () => {
      for (const language of languages) {
        sent.set(language, await handedOver(language));
      }

      // A read that reached no page reports the same as a card where every answer is right, so
      // what was read is part of the scenario.
      expect([...sent.keys()]).toEqual(['en', 'ru', 'es']);
    });

    then('the card says it is a page of a site, and that the site is Emi', () => {
      for (const language of languages) {
        expect({ language, kind: sent.get(language)?.kind }).toEqual({
          language,
          kind: 'website',
        });

        // The name of the product rather than the host, and it is not translated: the four
        // letters are the name in every language.
        expect({ language, site: sent.get(language)?.site }).toEqual({ language, site: 'Emi' });
      }
    });

    and('the card describes the picture her sister may not be able to see', () => {
      const board = read(theBoard);

      for (const language of languages) {
        const described = sent.get(language)?.describedAs ?? '';

        expect({ language, described: described.trim().length > 0 }).toEqual({
          language,
          described: true,
        });

        for (const part of theParts[language]) {
          expect({ language, part, named: described.includes(part) }).toEqual({
            language,
            part,
            named: true,
          });
        }
      }

      // The three parts the description names are the three the board draws, so a description
      // that is present cannot be a description of some other picture.
      expect(board).toContain('alt="Emi"');
      expect(board).toContain('Understand your body, safely.');
      expect(board).toContain('FOLLICULAR PHASE');
      expect(board).toContain('Day 8');
    });

    and('it describes it in the language of the page she was sent', () => {
      for (const language of languages) {
        expect({ language, described: sent.get(language)?.describedAs }).toEqual({
          language,
          described: theDescriptions[language],
        });

        // The same sentence the page itself holds, so the card and the page cannot drift apart.
        expect(sent.get(language)?.describedAs).toBe(wordsIn(language).sharePictureAlt);
      }

      // Three sentences rather than one, because a language nobody translated reads as somebody
      // else's link and is the way this quietly stops being true.
      expect(new Set(languages.map((language) => sent.get(language)?.describedAs)).size).toBe(
        languages.length,
      );
    });

    and('a chat that reads the other set of tags gets the same description', () => {
      for (const language of languages) {
        const handed = sent.get(language);

        expect({ language, described: handed?.describedToTheOtherReaderAs }).toEqual({
          language,
          described: theDescriptions[language],
        });

        // The description rides with the picture it describes, and both readers are sent to the
        // same file.
        expect({
          language,
          card: handed?.pointedAt,
          other: handed?.theOtherReaderIsPointedAt,
        }).toEqual({ language, card: thePicture, other: thePicture });
      }
    });

    and('a browser opens each page and reads the same four answers off it', () => {
      const sentence = 'a shared link names the site and describes its picture';
      const theFeature = read(whatTheBrowserReads);
      const theSteps = read(howTheBrowserReadsThem);

      expect(theFeature).toContain(`Scenario Outline: ${sentence}`);

      for (const language of languages) {
        expect(theFeature).toContain(theDescriptions[language]);
      }

      // The browser reads these off the document a server really drew, and the same file is read
      // against the live host after the merge, so the deploy proves it too.
      for (const tag of ['og:type', 'og:site_name', 'og:image:alt', 'twitter:image:alt']) {
        expect({ tag, read: theSteps.includes(`'${tag}'`) }).toEqual({ tag, read: true });
      }
    });
  });
});
