import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';
import { renderToStaticMarkup } from 'react-dom/server';

import { websiteColour, websiteFontsRoot } from '@emi/tokens';

import RootLayout from '../../apps/website/app/[lang]/layout';
import PrivacyPage, { generateMetadata } from '../../apps/website/app/[lang]/privacy/page';
import { type Language, type SiteWordKey, languages, wordsIn } from '../../apps/website/app/words';
import { classesIn, declarationsOf, stylesheetFor } from '../../apps/website/test/stylesheet';
import { asPlaywrightReadsIt } from '../../apps/website/test/theConfiguration';
import { SITEMAP_FILE, thePagesOfTheSite } from '../../apps/website/tools/theFilesACrawlerReads';

const feature = loadFeature(join(__dirname, '26.30-the-page-that-explains-the-encryption.feature'));

const repositoryRoot = resolve(__dirname, '..', '..');

const websiteWorkspace = join(repositoryRoot, 'apps', 'website');

const designDirectory = join(repositoryRoot, 'docs', 'design', 'website', 'protection');

// Compiling the stylesheet of a whole page takes longer than the tier's own limit allows.
jest.setTimeout(180_000);

/** The path the page sits at under a language, as the list of pages and the head both write it. */
const THE_PRIVACY_PAGE = 'privacy/';

/** The one host of the site, written out rather than read from what builds the addresses. */
const THE_SITE = 'https://myemi.app';

/** Where the code she is invited to check sits, written out for the same reason. */
const THE_CODE = 'https://github.com/atlantic-blue/emi';

/** The heading face of this board, which no other page of the site draws in. */
const THE_HEADING_FACE = 'font-family: &quot;Newsreader&quot;, Georgia, serif';

/**
 * The three sentences of the board that version 1 overtook, word for word as the board draws them.
 *
 * There is no free note to log yet. And nothing restores a lost phone yet, so the first limit told
 * her to keep a code that no screen of the application shows her and that would not bring her days
 * back if it did. The page says what she can do today, which is the export, by its own name.
 *
 * Nobody has redrawn the board, so this list is why the reading below does not fail on them.
 */
const theSentencesTheBoardSaidFirst: readonly string[] = [
  'Period, symptoms, mood, sex or a note.',
  'A lost phone and a lost code',
  'The days are gone. An Emi that could recover them could read them.',
];

/** What the page says in each of those places, which is read in every language. */
const theWordsThePageSaysInstead: readonly SiteWordKey[] = [
  'protectionLogLine',
  'protectionLostTitle',
  'protectionLostLine',
  // The paragraph the board has no room for at all: the account, the payments and the reports.
  'protectionAlsoBefore',
  'protectionAlsoPolicy',
];

/** The application's own name for the export, which is the one thing she can do about a lost phone. */
const theExportIsCalled: Readonly<Record<Language, string>> = {
  en: 'Download data',
  ru: 'Скачать данные',
  es: 'Descargar datos',
};

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

function theDesign(): string {
  return read(join(designDirectory, 'render', 'Protection.html'));
}

/** The part of the design this page owns, which is everything between the two bands of the site. */
function theMiddleOfTheDesign(): string {
  const markup = theDesign();

  return markup.slice(markup.indexOf('<main>'), markup.indexOf('</main>'));
}

/** Every opening tag of a kind of element, in the order a reader meets them. */
function openingTagsOf(markup: string, element: string): string[] {
  return [...markup.matchAll(new RegExp(`<${element}\\b[^>]*>`, 'g'))].map(([tag]) => tag);
}

function classesOf(tag: string): string[] {
  const found = /class="([^"]*)"/.exec(tag);

  return found === null ? [] : (found[1] ?? '').split(/\s+/).filter((name) => name.length > 0);
}

/** What one element draws, as the declarations of every class on it, joined in one line. */
function drawnBy(tag: string, stylesheet: string): string {
  return classesOf(tag)
    .map((name) => declarationsOf(stylesheet, name))
    .join(' ');
}

/**
 * Every piece of text a reader meets, as pieces rather than as one string. A sentence the markup
 * happens to hold inside a longer one is not a sentence she reads.
 */
function visibleTextOf(markup: string): string[] {
  const opens = markup.indexOf('<body>');
  const body = opens === -1 ? markup : markup.slice(opens, markup.indexOf('</body>'));
  const withoutCode = body.replace(/<(script|style)[\s\S]*?<\/\1>/g, '');

  const found = [...withoutCode.matchAll(/>([^<>]+)</g)]
    .map(([, text]) => (text ?? '').replace(/\s+/g, ' ').trim())
    .filter((text) => text.length > 0);

  return [...new Set(found)];
}

/** The ground a band is painted on, from the band's own style in the design. */
function groundsOfTheDesign(): string[] {
  return openingTagsOf(theDesign(), 'section').map((tag) => {
    const found = /background:\s*([^;"]+)/.exec(tag);

    return (found?.[1] ?? '').trim();
  });
}

/** The element of a page that holds one piece of text, so where it takes her can be read. */
function theAnchorAround(markup: string, text: string): string {
  const at = markup.indexOf(`>${text}<`);

  expect({ text, found: at >= 0 }).toEqual({ text, found: true });

  return markup.slice(markup.lastIndexOf('<a', at), at + 1);
}

function addressOf(anchor: string): string {
  return /href="([^"]*)"/.exec(anchor)?.[1] ?? '';
}

/**
 * The whole document she is sent. Next.js puts the page inside the root layout and answers with
 * one of them, and the band at the top she arrived through belongs to the layout, so a read of the
 * page on its own would miss it.
 */
async function pageIn(language: Language): Promise<string> {
  const page = await PrivacyPage({ params: Promise.resolve({ lang: language }) });

  return renderToStaticMarkup(
    await RootLayout({ children: page, params: Promise.resolve({ lang: language }) }),
  );
}

defineFeature(feature, (test) => {
  test('the privacy page matches the approved design pixel for pixel', ({ given, then, and }) => {
    const drawn: Partial<Record<Language, string>> = {};
    let stylesheet = '';

    const inEnglish = (): string => drawn.en ?? '';

    given('a woman follows Privacy from the band at the top of myemi.app', async () => {
      for (const language of languages) {
        drawn[language] = await pageIn(language);
      }

      stylesheet = await stylesheetFor(classesIn(inEnglish()));

      // The press she arrived through. It has pointed at this address since the band was built,
      // and until now the address answered 404.
      expect(addressOf(theAnchorAround(inEnglish(), wordsIn('en').headerPrivacy))).toBe(
        `/en/${THE_PRIVACY_PAGE}`,
      );
    });

    then('she reads the four parts of the board, in its order and on its grounds', () => {
      const wanted = groundsOfTheDesign();
      const bands = openingTagsOf(inEnglish(), 'section');

      expect(wanted).toEqual(['', websiteColour.siteTint, websiteColour.siteNight, '']);
      expect(bands).toHaveLength(wanted.length);

      const painted = bands.map((band) => {
        const found = /background-color:\s*([^;]+)/.exec(drawnBy(band, stylesheet));

        return (found?.[1] ?? '').trim();
      });

      // A band the page paints white where the board paints nothing is the same band: the
      // document under both of them is white already.
      expect(painted.map((ground) => (ground === websiteColour.siteCard ? '' : ground))).toEqual(
        wanted,
      );
    });

    and('every sentence of the board is on the page, in English, in Russian and in Spanish', () => {
      const said = visibleTextOf(theDesign());
      const inTheMiddle = visibleTextOf(theMiddleOfTheDesign());
      const overtaken = theSentencesTheBoardSaidFirst.filter((text) => said.includes(text));

      expect(inTheMiddle.length).toBeGreaterThan(25);
      expect(overtaken).toEqual(theSentencesTheBoardSaidFirst);
      expect(
        said.filter(
          (text) => !overtaken.includes(text) && !visibleTextOf(inEnglish()).includes(text),
        ),
      ).toEqual([]);

      // The board is in English, so the other two pages are held to the keys the English page
      // draws rather than to the board's own sentences. A key drawn in one language and not in
      // another is a page that says less than its neighbour, which is the error SITE-3 names.
      const english = wordsIn('en');
      const shownIn = (language: Language): Set<string> =>
        new Set(visibleTextOf(drawn[language] ?? ''));
      const shownInEnglish = shownIn('en');
      const keysDrawn = Object.keys(english).filter((key) =>
        shownInEnglish.has(english[key as keyof typeof english]),
      );

      expect(keysDrawn.length).toBeGreaterThan(40);

      for (const language of ['ru', 'es'] as const) {
        const shown = shownIn(language);
        const absent = keysDrawn.filter(
          (key) => !shown.has(wordsIn(language)[key as keyof typeof english]),
        );

        expect(absent).toEqual([]);
      }

      // And what the page says where the board has been overtaken, in all three languages. The
      // check above reads the board, so a page that had gone back to the board's wording in one
      // language would still pass it.
      for (const language of languages) {
        const shown = shownIn(language);
        const words = wordsIn(language);

        expect(theWordsThePageSaysInstead.filter((key) => !shown.has(words[key]))).toEqual([]);

        // The one thing she can do about a lost phone today, named the way the application names
        // it, so a woman who reads it here finds that row in her own settings.
        expect(words.protectionLostLine).toContain(theExportIsCalled[language]);
      }
    });

    and(
      'the headings are set in the face the board sets them in, which the site serves itself',
      () => {
        const middle = theMiddleOfTheDesign();

        expect(middle.split(THE_HEADING_FACE)).toHaveLength(5);

        for (const heading of ['h1', 'h2']) {
          const tags = openingTagsOf(inEnglish(), heading);

          expect(tags.length).toBeGreaterThan(0);

          for (const tag of tags) {
            expect(drawnBy(tag, stylesheet)).toContain('Newsreader');
          }
        }

        // The board's own two files, byte for byte. Another release of one family measures
        // differently, and a heading that measures differently moves everything under it.
        for (const file of ['Newsreader16pt-Regular.ttf', 'Newsreader16pt-Medium.ttf']) {
          const beside = readFileSync(join(designDirectory, 'render', 'fonts', file));
          const served = readFileSync(join(repositoryRoot, websiteFontsRoot, file));

          expect({ file, same: served.equals(beside) }).toEqual({ file, same: true });
        }
      },
    );

    and(
      'the two cards for what is not built yet say so, and the one that is built says that',
      () => {
        const badges = [
          ...theMiddleOfTheDesign().matchAll(/border-radius: 9999px; padding: [^"]*">([^<]+)</g),
        ].map(([, said]) => (said ?? '').trim());

        expect(badges).toEqual(['In the app today', 'Designed, not built yet']);

        for (const language of languages) {
          const shown = visibleTextOf(drawn[language] ?? '');
          const words = wordsIn(language);

          expect(
            [words.protectionBuilt, words.protectionNotBuilt].filter(
              (said) => !shown.includes(said),
            ),
          ).toEqual([]);
        }

        // The sync is designed and not running, so the step that describes it is the step that
        // carries the second badge. A reader who takes it as built has been told the server holds
        // something it does not.
        const page = inEnglish();

        expect(page.indexOf(wordsIn('en').protectionNotBuilt)).toBeGreaterThan(
          page.indexOf(wordsIn('en').protectionLeavesTitle),
        );

        // The recovery code carries it too. The code is written and no screen of the application
        // reaches it, so the card that says she holds one says that it is not built yet, and it
        // says it on the dark band where that card stands.
        for (const language of languages) {
          const markup = drawn[language] ?? '';
          const words = wordsIn(language);
          const band = markup.slice(markup.indexOf('id="keys-title"'));

          expect(markup.split(words.protectionNotBuilt)).toHaveLength(3);
          expect(band).toContain(words.protectionNotBuilt);
          expect(band.indexOf(words.protectionYouLine)).toBeLessThan(
            band.indexOf(words.protectionNotBuilt),
          );
        }
      },
    );

    and(
      'the press to the code opens the public repository, and the one beside it opens the full document',
      () => {
        for (const language of languages) {
          const markup = drawn[language] ?? '';
          const words = wordsIn(language);

          expect(addressOf(theAnchorAround(markup, words.protectionReadTheCode))).toBe(THE_CODE);
          expect(addressOf(theAnchorAround(markup, words.protectionReadTheDocument))).toBe(
            `/${language}/privacy-policy/`,
          );
        }
      },
    );

    and(
      'the page names its own address, so a search engine keeps it apart from the home page',
      async () => {
        for (const language of languages) {
          const head = await generateMetadata({ params: Promise.resolve({ lang: language }) });

          expect(head.alternates?.canonical).toBe(`${THE_SITE}/${language}/${THE_PRIVACY_PAGE}`);
          expect(head.alternates?.languages).toEqual({
            en: `${THE_SITE}/en/${THE_PRIVACY_PAGE}`,
            ru: `${THE_SITE}/ru/${THE_PRIVACY_PAGE}`,
            es: `${THE_SITE}/es/${THE_PRIVACY_PAGE}`,
            'x-default': `${THE_SITE}/en/${THE_PRIVACY_PAGE}`,
          });
        }
      },
    );

    and('the list a crawler reads names the page in each of the three languages', () => {
      expect(thePagesOfTheSite.map((page) => page.path)).toContain(THE_PRIVACY_PAGE);

      const list = read(join(websiteWorkspace, 'public', SITEMAP_FILE));

      for (const language of languages) {
        const address = `${THE_SITE}/${language}/${THE_PRIVACY_PAGE}`;

        expect({ address, named: list.includes(`<loc>${address}</loc>`) }).toEqual({
          address,
          named: true,
        });
      }
    });

    and('the page writes no style of its own, so her browser refuses nothing', () => {
      for (const language of languages) {
        const markup = drawn[language] ?? '';

        expect([
          ...[...markup.matchAll(/style="[^"]*"/g)].map(([found]) => found),
          ...[...markup.matchAll(/<style[\s>]/g)].map(([found]) => found),
        ]).toEqual([]);
      }
    });

    and(
      'a browser holds the page against the board at all three widths, and keeps the picture of any difference',
      () => {
        const sentence = 'the privacy page matches the approved design pixel for pixel';
        const sentences = join(
          websiteWorkspace,
          'e2e',
          'features',
          'theProtectionPageMatchesTheDesign.feature',
        );
        const steps = join(
          websiteWorkspace,
          'e2e',
          'steps',
          'theProtectionPageMatchesTheDesign.ts',
        );

        expect(read(sentences)).toContain(`Scenario: ${sentence}`);
        expect(read(steps)).toContain("'protection', 'render', 'Protection.html'");
        expect(read(steps)).toContain("'/en/privacy/'");

        // A picture of the board at each width the browser reads the page at, so a width the
        // suite gains is a width the design was never drawn at.
        for (const width of asPlaywrightReadsIt().widths) {
          const picture = join(designDirectory, 'reference', `Protection-${width}.png`);

          expect({ width, drawn: existsSync(picture) }).toEqual({ width, drawn: true });
        }
      },
    );
  });
});
