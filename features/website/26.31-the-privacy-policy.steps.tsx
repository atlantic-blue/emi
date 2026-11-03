import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';
import { renderToStaticMarkup } from 'react-dom/server';

import { websiteColour, websiteFontsRoot } from '@emi/tokens';

import RootLayout from '../../apps/website/app/[lang]/layout';
import PrivacyPolicyPage, {
  generateMetadata,
} from '../../apps/website/app/[lang]/privacy-policy/page';
import { type Language, languages, wordsIn } from '../../apps/website/app/words';
import { THE_PRIVACY_INBOX, thePrivacyAddress } from '../../apps/website/lib/addresses';
import { classesIn, declarationsOf, stylesheetFor } from '../../apps/website/test/stylesheet';
import { asPlaywrightReadsIt } from '../../apps/website/test/theConfiguration';
import { SITEMAP_FILE, thePagesOfTheSite } from '../../apps/website/tools/theFilesACrawlerReads';

const feature = loadFeature(join(__dirname, '26.31-the-privacy-policy.feature'));

const repositoryRoot = resolve(__dirname, '..', '..');

const websiteWorkspace = join(repositoryRoot, 'apps', 'website');

const designDirectory = join(repositoryRoot, 'docs', 'design', 'website', 'privacy-policy');

// Compiling the stylesheet of a whole page takes longer than the tier's own limit allows.
jest.setTimeout(180_000);

/** The path the page sits at under a language, as the list of pages and the head both write it. */
const THE_POLICY_PAGE = 'privacy-policy/';

/** The page the policy sends her to for the encryption itself, which step 30 built. */
const THE_PROTECTION_PAGE = 'privacy/';

/** The one host of the site, written out rather than read from what builds the addresses. */
const THE_SITE = 'https://myemi.app';

/** The heading face of this board, which only the two privacy boards draw in. */
const THE_HEADING_FACE = 'font-family: &quot;Newsreader&quot;, Georgia, serif';

/**
 * How many elements of the board are set in that face: the heading, the line under it, and one
 * heading for each of the eight sections. The page is held to the same count, so a section that
 * lost its serif is a section this reads rather than a difference a picture has to find.
 */
const howManyAreSetInTheSerif = 10;

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

function theDesign(): string {
  return read(join(designDirectory, 'render', 'Privacy.html'));
}

/** The part of the design this page owns, which is everything between the two bands of the site. */
function theMiddleOfTheDesign(): string {
  const markup = theDesign();

  return markup.slice(markup.indexOf('<main>'), markup.indexOf('</main>'));
}

/** The same part of the page, so a band of the site is not read as a part of the policy. */
function theMiddleOf(markup: string): string {
  return markup.slice(markup.indexOf('<main'), markup.indexOf('</main>'));
}

/**
 * The band at the foot of the page, which is where she pressed to get here. The press and the
 * heading of this page say the same two words, so a reader of the whole document would find the
 * heading first and then the nearest press above it, which is in the band at the top.
 */
function theBandAtTheFoot(markup: string): string {
  return markup.slice(markup.indexOf('</main>'));
}

/** Every opening tag of a kind of element, in the order a reader meets them. */
function openingTagsOf(markup: string, element: string): string[] {
  return [...markup.matchAll(new RegExp(`<${element}\\b[^>]*>`, 'g'))].map(([tag]) => tag);
}

/** What one kind of element says, in the order a reader meets them. */
function saidBy(markup: string, element: string): string[] {
  return [...markup.matchAll(new RegExp(`<${element}\\b[^>]*>([^<]*)<`, 'g'))].map(([, said]) =>
    (said ?? '').replace(/\s+/g, ' ').trim(),
  );
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
 * one of them, and the band at the foot she arrived through belongs to the layout, so a read of
 * the page on its own would miss it.
 */
async function pageIn(language: Language): Promise<string> {
  const page = await PrivacyPolicyPage({ params: Promise.resolve({ lang: language }) });

  return renderToStaticMarkup(
    await RootLayout({ children: page, params: Promise.resolve({ lang: language }) }),
  );
}

defineFeature(feature, (test) => {
  test('the privacy policy matches the approved design pixel for pixel', ({ given, then, and }) => {
    const drawn: Partial<Record<Language, string>> = {};
    let stylesheet = '';

    const inEnglish = (): string => drawn.en ?? '';

    given('a woman follows "Privacy policy" from the band at the foot of myemi.app', async () => {
      for (const language of languages) {
        drawn[language] = await pageIn(language);
      }

      stylesheet = await stylesheetFor(classesIn(inEnglish()));

      // The press she arrived through. It has pointed at this address since the band was built,
      // and until now the address answered 404.
      expect(
        addressOf(
          theAnchorAround(theBandAtTheFoot(inEnglish()), wordsIn('en').footerPrivacyPolicy),
        ),
      ).toBe(`/en/${THE_POLICY_PAGE}`);
    });

    then("she reads the three cards and then the eight sections, in the board's order", () => {
      const middle = theMiddleOf(inEnglish());
      const words = wordsIn('en');

      // The date and then the three cards, which is every span of the board's own part of the
      // page, in the order she meets them.
      const theFour = [
        words.policyUpdated,
        words.policyNoAccount,
        words.policyNoTracking,
        words.policyEncrypted,
      ];

      expect(saidBy(theMiddleOfTheDesign(), 'span')).toEqual(theFour);
      expect(saidBy(middle, 'span')).toEqual(theFour);

      // Each card on the tint, at the corner the board gives it. A card the page painted white
      // would still hold its three words, which is why the ground is read and not only the text.
      const theTint = openingTagsOf(middle, 'div').filter((tag) =>
        /background-color:\s*([^;]+)/
          .exec(drawnBy(tag, stylesheet))?.[1]
          ?.trim()
          .toUpperCase()
          .startsWith(websiteColour.siteTint),
      );

      expect(theTint).toHaveLength(3);

      for (const card of theTint) {
        expect(drawnBy(card, stylesheet)).toContain('border-radius: 24px');
      }

      // The eight sections, in the board's order and with the board's headings.
      expect(saidBy(theMiddleOfTheDesign(), 'h2')).toEqual([
        words.policyWhoTitle,
        words.policyStoresTitle,
        words.policyCollectTitle,
        words.policySharingTitle,
        words.policyRemindersTitle,
        words.policyDeletingTitle,
        words.policyChildrenTitle,
        words.policyContactTitle,
      ]);

      expect(saidBy(middle, 'h2')).toEqual(saidBy(theMiddleOfTheDesign(), 'h2'));
      expect(openingTagsOf(middle, 'section')).toHaveLength(8);
      expect(saidBy(middle, 'h1')).toEqual([words.policyTitle]);
    });

    and('every sentence of the board is on the page, in English, in Russian and in Spanish', () => {
      const said = visibleTextOf(theDesign());
      const inTheMiddle = visibleTextOf(theMiddleOfTheDesign());

      expect(inTheMiddle).toHaveLength(25);
      expect(said.filter((text) => !visibleTextOf(inEnglish()).includes(text))).toEqual([]);

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
    });

    and(
      'the headings are set in the face the board sets them in, which the site serves itself',
      () => {
        expect(theMiddleOfTheDesign().split(THE_HEADING_FACE)).toHaveLength(
          howManyAreSetInTheSerif + 1,
        );

        const inTheFace = openingTagsOf(theMiddleOf(inEnglish()), '[a-z0-9]+').filter((tag) =>
          drawnBy(tag, stylesheet).includes('Newsreader'),
        );

        expect(inTheFace).toHaveLength(howManyAreSetInTheSerif);

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
      'the date at the top still reads as the word the board draws, because nobody set one',
      () => {
        expect(visibleTextOf(theMiddleOfTheDesign())[0]).toBe(wordsIn('en').policyUpdated);

        for (const language of languages) {
          const said = wordsIn(language).policyUpdated;

          // The hole the board keeps, in brackets, in every language. A real date here would be the
          // first sentence on the page that nobody wrote down.
          expect(said.endsWith('[DATE]')).toBe(true);
          expect(visibleTextOf(theMiddleOf(drawn[language] ?? ''))[0]).toBe(said);
        }
      },
    );

    and(
      'the press inside what Emi stores opens the page about the encryption, and the one beside the last heading writes to Emi',
      () => {
        for (const language of languages) {
          const middle = theMiddleOf(drawn[language] ?? '');
          const words = wordsIn(language);

          expect(addressOf(theAnchorAround(middle, words.policyHowTheEncryptionWorks))).toBe(
            `/${language}/${THE_PROTECTION_PAGE}`,
          );

          // The address reads the same in all three, because it is an address and not a word.
          expect(addressOf(theAnchorAround(middle, thePrivacyAddress()))).toBe(THE_PRIVACY_INBOX);
        }
      },
    );

    and(
      'the page names its own address, so a search engine keeps it apart from the home page',
      async () => {
        for (const language of languages) {
          const head = await generateMetadata({ params: Promise.resolve({ lang: language }) });

          expect(head.alternates?.canonical).toBe(`${THE_SITE}/${language}/${THE_POLICY_PAGE}`);
          expect(head.alternates?.languages).toEqual({
            en: `${THE_SITE}/en/${THE_POLICY_PAGE}`,
            ru: `${THE_SITE}/ru/${THE_POLICY_PAGE}`,
            es: `${THE_SITE}/es/${THE_POLICY_PAGE}`,
            'x-default': `${THE_SITE}/en/${THE_POLICY_PAGE}`,
          });
        }
      },
    );

    and('the list a crawler reads names the page in each of the three languages', () => {
      expect(thePagesOfTheSite.map((page) => page.path)).toContain(THE_POLICY_PAGE);

      const list = read(join(websiteWorkspace, 'public', SITEMAP_FILE));

      for (const language of languages) {
        const address = `${THE_SITE}/${language}/${THE_POLICY_PAGE}`;

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
        const sentence = 'the privacy policy matches the approved design pixel for pixel';
        const sentences = join(
          websiteWorkspace,
          'e2e',
          'features',
          'thePrivacyPolicyMatchesTheDesign.feature',
        );
        const steps = join(websiteWorkspace, 'e2e', 'steps', 'thePrivacyPolicyMatchesTheDesign.ts');

        expect(read(sentences)).toContain(`Scenario: ${sentence}`);
        expect(read(steps)).toContain("'privacy-policy', 'render', 'Privacy.html'");
        expect(read(steps)).toContain("'/en/privacy-policy/'");

        // A picture of the board at each width the browser reads the page at, so a width the
        // suite gains is a width the design was never drawn at.
        for (const width of asPlaywrightReadsIt().widths) {
          const picture = join(designDirectory, 'reference', `Privacy-${width}.png`);

          expect({ width, drawn: existsSync(picture) }).toEqual({ width, drawn: true });
        }
      },
    );
  });
});
