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
import {
  A_CARD_PROCESSOR_NOBODY_HAS_CHOSEN,
  A_LEGAL_BASIS_NOBODY_HAS_WRITTEN,
  A_RETENTION_NOBODY_HAS_SET,
  theHolesOfThePolicy,
} from '../../apps/website/lib/thePlaceholders';
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
 * heading for each of its eight sections.
 */
const theBoardSetsTenInTheSerif = 10;

/**
 * How many of the page are: the heading, the line under it, and one heading for each of its
 * fifteen sections. It is seven more than the board, because version 1 answers seven questions the
 * board never asked. A section that lost its serif is a section this reads rather than a
 * difference a picture has to find.
 */
const thePageSetsSeventeenInTheSerif = 17;

/** The drawing of a line through an icon, as the board writes it on the first two cards. */
const THE_LINE_THROUGH_AN_ICON = 'M3 3l18 18';

/**
 * What the board answers "What we collect" with. It was true of a product with no account, no
 * payment and nothing sent anywhere, and version 1 is none of those, so the page stopped saying it.
 */
const THE_ANSWER_THAT_WENT_STALE =
  'Nothing. There is no account, no analytics, no advertising and no tracking. We cannot read your records.';

/**
 * The date the policy was last changed, as each language writes it. The page draws a date now
 * rather than the hole the board draws. The day and the year are the same two numbers everywhere
 * and the month is a word, so the month is the part that is translated.
 */
const theDayItChanged: Readonly<Record<Language, string>> = {
  en: 'LAST UPDATED 4 NOVEMBER 2026',
  ru: 'ПОСЛЕДНЕЕ ОБНОВЛЕНИЕ 4 НОЯБРЯ 2026',
  es: 'ÚLTIMA ACTUALIZACIÓN 4 DE NOVIEMBRE DE 2026',
};

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

/**
 * One section of the page, as the markup between its own opening tag and the next one. A reader
 * meets a section as a heading and the answer under it, so a step that asks what one section says
 * reads the answer of that section and not of the one below it.
 */
function theSectionCalled(markup: string, heading: string): string {
  const sections = theMiddleOf(markup).split('<section');
  const held = sections.find((section) => section.includes(`>${heading}<`));

  expect({ heading, found: held !== undefined }).toEqual({ heading, found: true });

  return held ?? '';
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

/** How many times one piece of text appears in some markup, counted without overlap. */
function timesIn(markup: string, text: string): number {
  return markup.split(text).length - 1;
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
  test('the privacy policy says what version 1 of Emi holds', ({ given, then, and }) => {
    const drawn: Partial<Record<Language, string>> = {};
    let stylesheet = '';

    const inEnglish = (): string => drawn.en ?? '';

    /** The headings of the fifteen sections, in the order the page draws them. */
    const theFifteen = (language: Language): string[] => {
      const words = wordsIn(language);

      return [
        words.policyWhoTitle,
        words.policyStoresTitle,
        words.policyCollectTitle,
        words.policyAccountTitle,
        words.policyPaymentsTitle,
        words.policyUsageTitle,
        words.policyProcessorsTitle,
        words.policyRetentionTitle,
        words.policyRightsTitle,
        words.policyLegalBasisTitle,
        words.policySharingTitle,
        words.policyRemindersTitle,
        words.policyDeletingTitle,
        words.policyChildrenTitle,
        words.policyContactTitle,
      ];
    };

    given('a woman follows "Privacy policy" from the band at the foot of myemi.app', async () => {
      for (const language of languages) {
        drawn[language] = await pageIn(language);
      }

      stylesheet = await stylesheetFor(classesIn(inEnglish()));

      // The press she arrived through, which has pointed at this address since the band was built.
      expect(
        addressOf(
          theAnchorAround(theBandAtTheFoot(inEnglish()), wordsIn('en').footerPrivacyPolicy),
        ),
      ).toBe(`/en/${THE_POLICY_PAGE}`);
    });

    then(
      'she reads the three cards and then the fifteen sections, in the order the questions arrive',
      () => {
        const middle = theMiddleOf(inEnglish());
        const words = wordsIn('en');

        // The date and then the three cards, which is every span of this page, in the order she
        // meets them.
        expect(saidBy(middle, 'span')).toEqual([
          words.policyUpdated,
          words.policyAccountOptional,
          words.policyUsageOptional,
          words.policyEncrypted,
        ]);

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

        expect(saidBy(middle, 'h2')).toEqual(theFifteen('en'));
        expect(openingTagsOf(middle, 'section')).toHaveLength(15);
        expect(saidBy(middle, 'h1')).toEqual([words.policyTitle]);

        // The eight the board drew are all still here, in the same order, with the seven new ones
        // among them. The board is the record of what she used to be promised.
        const theBoardsEight = saidBy(theMiddleOfTheDesign(), 'h2');

        expect(theBoardsEight).toHaveLength(8);
        expect(theFifteen('en').filter((title) => theBoardsEight.includes(title))).toEqual(
          theBoardsEight,
        );
      },
    );

    and(
      'the two cards that named something Emi does not do now name something she chooses, with no line drawn through either',
      () => {
        for (const language of languages) {
          const words = wordsIn(language);
          const middle = theMiddleOf(drawn[language] ?? '');

          // What the board said, which version 1 made untrue.
          expect(visibleTextOf(theMiddleOfTheDesign())).toContain('No account needed');
          expect(visibleTextOf(theMiddleOfTheDesign())).toContain('No tracking');

          expect(visibleTextOf(middle)).toContain(words.policyAccountOptional);
          expect(visibleTextOf(middle)).toContain(words.policyUsageOptional);
          expect(visibleTextOf(middle)).not.toContain('No account needed');
          expect(visibleTextOf(middle)).not.toContain('No tracking');

          // The board draws the line twice, on the two cards that said no. The page draws it
          // nowhere, because an account and the anonymous usage both exist now.
          expect(timesIn(theMiddleOfTheDesign(), THE_LINE_THROUGH_AN_ICON)).toBe(2);
          expect(timesIn(middle, THE_LINE_THROUGH_AN_ICON)).toBe(0);
        }
      },
    );

    and('the date at the top reads 4 November 2026, in all three languages', () => {
      for (const language of languages) {
        const said = wordsIn(language).policyUpdated;

        // The board still draws its own hole, and the page no longer does.
        expect(theDesign()).toContain('LAST UPDATED [DATE]');
        expect(said).toBe(theDayItChanged[language]);
        expect(said).toContain('4');
        expect(said).toContain('2026');
        expect(said).not.toContain('[');

        // It is the first thing she reads on the page, above the title.
        expect(visibleTextOf(theMiddleOf(drawn[language] ?? ''))[0]).toBe(said);
      }
    });

    and(
      'the account, the payments, the usage, the processors, the retention, the rights and the ground in law are each answered, in all three languages',
      () => {
        for (const language of languages) {
          const words = wordsIn(language);
          const markup = drawn[language] ?? '';

          // Each of the seven new headings, with the answer that belongs to it read inside its own
          // section rather than anywhere on the page.
          expect(saidBy(theMiddleOf(markup), 'h2')).toEqual(theFifteen(language));

          expect(theSectionCalled(markup, words.policyAccountTitle)).toContain(
            words.policyAccountLine,
          );

          const payments = theSectionCalled(markup, words.policyPaymentsTitle);

          expect(payments).toContain(words.policyPaymentsAppleLine);
          expect(payments).toContain(words.policyPaymentsTelegramLine);
          expect(payments).toContain(words.policyPaymentsWebBefore);
          expect(payments).toContain(words.policyPaymentsWebAfter);

          expect(theSectionCalled(markup, words.policyUsageTitle)).toContain(words.policyUsageLine);

          // The six companies, each named with the one thing it does, as a list rather than a
          // paragraph, so she can find her own processor without reading a sentence.
          const processors = theSectionCalled(markup, words.policyProcessorsTitle);

          expect(saidBy(processors, 'li')).toEqual([
            `Apple ${words.policyProcessorsApple}`,
            `Amazon Web Services ${words.policyProcessorsAmazon}`,
            `Telegram ${words.policyProcessorsTelegram}`,
            `${A_CARD_PROCESSOR_NOBODY_HAS_CHOSEN} ${words.policyProcessorsCard}`,
            `Sentry ${words.policyProcessorsSentry}`,
            `TelemetryDeck ${words.policyProcessorsTelemetry}`,
          ]);

          expect(theSectionCalled(markup, words.policyRetentionTitle)).toContain(
            A_RETENTION_NOBODY_HAS_SET,
          );
          expect(theSectionCalled(markup, words.policyRightsTitle)).toContain(
            words.policyRightsBefore,
          );
          expect(theSectionCalled(markup, words.policyLegalBasisTitle)).toContain(
            A_LEGAL_BASIS_NOBODY_HAS_WRITTEN,
          );

          // Deleting now says the one thing the phone cannot do for her.
          const deleting = theSectionCalled(markup, words.policyDeletingTitle);

          expect(deleting).toContain(words.policyDeletingLine);
          expect(deleting).toContain(words.policyDeletingAccountBefore);

          // What we collect no longer answers with the board's one word, which stopped being true
          // the moment an account existed.
          expect(theSectionCalled(markup, words.policyCollectTitle)).toContain(
            words.policyCollectLine,
          );
          expect(visibleTextOf(theMiddleOfTheDesign())).toContain(THE_ANSWER_THAT_WENT_STALE);
          expect(visibleTextOf(theMiddleOf(markup))).not.toContain(THE_ANSWER_THAT_WENT_STALE);
        }
      },
    );

    and(
      'the three answers nobody has written read as holes in brackets, in all three languages',
      () => {
        expect(theHolesOfThePolicy).toEqual([
          A_CARD_PROCESSOR_NOBODY_HAS_CHOSEN,
          A_RETENTION_NOBODY_HAS_SET,
          A_LEGAL_BASIS_NOBODY_HAS_WRITTEN,
        ]);

        for (const hole of theHolesOfThePolicy) {
          expect(/^\[[A-Z ]+\]$/.test(hole)).toBe(true);
        }

        for (const language of languages) {
          const middle = theMiddleOf(drawn[language] ?? '');

          // Who takes a payment on the web is asked twice: once where she pays, and once in the
          // list of everybody who handles something.
          expect(timesIn(middle, A_CARD_PROCESSOR_NOBODY_HAS_CHOSEN)).toBe(2);
          expect(timesIn(middle, A_RETENTION_NOBODY_HAS_SET)).toBe(1);
          expect(timesIn(middle, A_LEGAL_BASIS_NOBODY_HAS_WRITTEN)).toBe(1);

          // Every piece of text on the page that carries a bracket is one of the three, in every
          // language, so none of them was translated and none of them was quietly filled in one
          // language and not another.
          const bracketed = visibleTextOf(middle).filter((said) => said.includes('['));

          expect(bracketed).toHaveLength(4);
          expect(
            bracketed.filter((said) => theHolesOfThePolicy.some((hole) => said.includes(hole))),
          ).toEqual(bracketed);
        }
      },
    );

    and(
      'she can write to Emi from her rights, from deleting, and from the contact, in all three languages',
      () => {
        for (const language of languages) {
          const words = wordsIn(language);
          const markup = drawn[language] ?? '';

          for (const heading of [
            words.policyRightsTitle,
            words.policyDeletingTitle,
            words.policyContactTitle,
          ]) {
            const section = theSectionCalled(markup, heading);

            expect(addressOf(theAnchorAround(section, thePrivacyAddress()))).toBe(
              THE_PRIVACY_INBOX,
            );
          }

          // Three presses and no more, so a fourth address nobody wrote down is a failure here.
          expect(timesIn(theMiddleOf(markup), `href="${THE_PRIVACY_INBOX}"`)).toBe(3);
        }
      },
    );

    and('every word the page draws arrives in English, in Russian and in Spanish', () => {
      const english = wordsIn('en');
      const shownIn = (language: Language): Set<string> =>
        new Set(visibleTextOf(drawn[language] ?? ''));
      const shownInEnglish = shownIn('en');
      const keysDrawn = Object.keys(english).filter((key) =>
        shownInEnglish.has(english[key as keyof typeof english]),
      );

      // A key drawn in one language and not in another is a page that says less than its
      // neighbour, which is the error SITE-3 names.
      expect(keysDrawn.length).toBeGreaterThan(40);

      for (const language of ['ru', 'es'] as const) {
        const shown = shownIn(language);
        const absent = keysDrawn.filter(
          (key) => !shown.has(wordsIn(language)[key as keyof typeof english]),
        );

        expect(absent).toEqual([]);
      }

      // The policy itself, counted on its own, so a page that lost half its sections while the
      // bands kept their words would still fail.
      const policyKeys = Object.keys(english).filter(
        (key) =>
          key.startsWith('policy') && shownInEnglish.has(english[key as keyof typeof english]),
      );

      expect(policyKeys.length).toBeGreaterThan(30);
    });

    and(
      'the headings are set in the face the board sets them in, which the site serves itself',
      () => {
        expect(theMiddleOfTheDesign().split(THE_HEADING_FACE)).toHaveLength(
          theBoardSetsTenInTheSerif + 1,
        );

        const inTheFace = openingTagsOf(theMiddleOf(inEnglish()), '[a-z0-9]+').filter((tag) =>
          drawnBy(tag, stylesheet).includes('Newsreader'),
        );

        expect(inTheFace).toHaveLength(thePageSetsSeventeenInTheSerif);

        // The board's own two files, byte for byte. Another release of one family measures
        // differently, and a heading that measures differently moves everything under it.
        for (const file of ['Newsreader16pt-Regular.ttf', 'Newsreader16pt-Medium.ttf']) {
          const beside = readFileSync(join(designDirectory, 'render', 'fonts', file));
          const served = readFileSync(join(repositoryRoot, websiteFontsRoot, file));

          expect({ file, same: served.equals(beside) }).toEqual({ file, same: true });
        }
      },
    );

    and('the press inside what Emi stores opens the page about the encryption', () => {
      for (const language of languages) {
        const words = wordsIn(language);
        const stores = theSectionCalled(drawn[language] ?? '', words.policyStoresTitle);

        expect(addressOf(theAnchorAround(stores, words.policyHowTheEncryptionWorks))).toBe(
          `/${language}/${THE_PROTECTION_PAGE}`,
        );
      }
    });

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
      'a browser holds the bands and the title of the page against the board, and keeps the picture of any difference',
      () => {
        const sentence = 'the bands and the title of the privacy policy are the approved design';
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

        // The three parts the board still describes. The words in between are version 1 and the
        // board is not, so a comparison of the middle would report the same difference every run.
        for (const part of [
          'the-band-at-the-top',
          'the-title-of-the-policy',
          'the-band-at-the-foot',
        ]) {
          expect(read(steps)).toContain(`called: '${part}'`);
        }

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
