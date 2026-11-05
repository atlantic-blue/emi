/**
 * @jest-environment jsdom
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server.node';

import { websiteFontsRoot } from '@emi/tokens';

import RootLayout from '../../apps/website/app/[lang]/layout';
import { mainLinks } from '../../apps/website/components/siteHeader';
import SupportPage, { generateMetadata } from '../../apps/website/app/[lang]/support/page';
import { type Language, languages, wordsIn } from '../../apps/website/app/words';
import {
  THE_EMI_BETA,
  THE_EMI_COMMUNITY,
  THE_SUPPORT_INBOX,
  theSupportAddress,
} from '../../apps/website/lib/addresses';
import { asPlaywrightReadsIt } from '../../apps/website/test/theConfiguration';
import { theKeysTheFrameHoldsBack } from '../../apps/website/test/theWordsAPressTookWithIt';
import { SITEMAP_FILE, thePagesOfTheSite } from '../../apps/website/tools/theFilesACrawlerReads';

const feature = loadFeature(join(__dirname, '27.2-the-support-page.feature'));

const repositoryRoot = resolve(__dirname, '..', '..');

const websiteWorkspace = join(repositoryRoot, 'apps', 'website');

const designDirectory = join(repositoryRoot, 'docs', 'design', 'website', 'support');

// Drawing three languages of the page, and then running three of them in a document, takes
// longer than the tier's own limit allows.
jest.setTimeout(180_000);

/** The path the page sits at under a language, as the list of pages and the head both write it. */
const THE_SUPPORT_PAGE = 'support/';

/** The one host of the site, written out rather than read from what builds the addresses. */
const THE_SITE = 'https://myemi.app';

/** The heading face of this board, which only the privacy boards and this one draw in. */
const THE_HEADING_FACE = 'font-family: &quot;Newsreader&quot;, Georgia, serif';

/** How many elements of this board are set in that face: the title, and the one heading. */
const theBoardSetsTwoInTheSerif = 2;

/**
 * What the board answers the first question with. Sync and restore are designed and are not
 * built, so a page that answered this would be promising a restore nobody can run.
 */
const THE_RESTORE_NOBODY_BUILT =
  'Only with your recovery code. We do not hold a key, so we cannot restore anything without it.';

/** What the board ends the answer about cancelling with, which needs the account page. */
const THE_HALF_THAT_NEEDS_AN_ACCOUNT = 'If you paid on this site, cancel on';

/** What the application calls the screen the answer about deleting sends her to, in each language. */
const theScreenSheOpens: Readonly<Record<Language, string>> = {
  en: 'Privacy',
  ru: 'Приватность',
  es: 'Privacidad',
};

/** What the application calls the control she then presses. */
const theControlShePresses: Readonly<Record<Language, string>> = {
  en: 'Delete data',
  ru: 'Удалить данные',
  es: 'Borrar datos',
};

/** What the application calls the one way a record leaves the phone today. */
const theControlThatSavesAFile: Readonly<Record<Language, string>> = {
  en: 'Download data',
  ru: 'Скачать данные',
  es: 'Descargar datos',
};

/** How many complete cycles the cycle package counts before it forecasts. */
const CYCLES_BEFORE_A_FORECAST = 2;

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

function theDesign(): string {
  return read(join(designDirectory, 'render', 'Support.html'));
}

/** The part of the design this page owns, which is everything between the two bands of the site. */
function theMiddleOfTheDesign(): string {
  const markup = theDesign();

  return markup.slice(markup.indexOf('<main>'), markup.indexOf('</main>'));
}

/** The same part of the page, so a band of the site is not read as a part of the page. */
function theMiddleOf(markup: string): string {
  return markup.slice(markup.indexOf('<main'), markup.indexOf('</main>'));
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
 * one of them, and the band at the top she arrived through belongs to the layout, so a read of
 * the page on its own would miss it.
 */
async function pageIn(language: Language): Promise<string> {
  const page = await SupportPage({ params: Promise.resolve({ lang: language }) });

  return renderToStaticMarkup(
    await RootLayout({ children: page, params: Promise.resolve({ lang: language }) }),
  );
}

/** What one mounted page gives back: a way to type, and a way to read what she is left with. */
interface ThePageInADocument {
  readonly type: (what: string) => Promise<void>;
  readonly questionsOnScreen: () => string[];
  readonly said: () => string;
  readonly markup: () => string;
}

/**
 * The page running in a document, the way it runs in her browser, so the box can be typed into
 * and the questions she is left with read back.
 *
 * The page itself is drawn on a server and cannot be mounted, so what is mounted is the part the
 * page hands her browser. A reading of the markup alone would stop at the box.
 *
 * Each mount replaces the one before it, and every read is scoped to the one holder, so a page
 * left standing by an earlier step is never read as this one.
 */
async function theLiveSupportPage(language: Language): Promise<ThePageInADocument> {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.replaceChildren();

  const holder = document.createElement('div');

  document.body.append(holder);

  const root = createRoot(holder);
  const page = await SupportPage({ params: Promise.resolve({ lang: language }) });

  await act(async () => {
    root.render(page);
  });

  const box = (): HTMLInputElement => {
    const field = holder.querySelector('input');

    if (field === null) {
      throw new Error('The page draws no box to search in.');
    }

    return field;
  };

  return {
    type: async (what: string) => {
      const field = box();
      const write = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;

      // React listens for the event its own onChange is built from, and reads the value off the
      // element rather than off the event, so the value is written the way a browser writes it.
      write?.call(field, what);
      await act(async () => {
        field.dispatchEvent(new Event('input', { bubbles: true }));
      });
    },
    questionsOnScreen: () =>
      [...holder.querySelectorAll('summary')].map((asked) => asked.textContent ?? ''),
    said: () => holder.textContent ?? '',
    markup: () => holder.innerHTML,
  };
}

defineFeature(feature, (test) => {
  test('the support page answers what Emi can answer today', ({ given, then, and }) => {
    const drawn: Partial<Record<Language, string>> = {};

    const inEnglish = (): string => drawn.en ?? '';

    /** The four questions, in the order the page asks them. */
    const theFour = (language: Language): string[] => {
      const words = wordsIn(language);

      return [
        words.supportLostPhoneQuestion,
        words.supportLearningQuestion,
        words.supportDeleteQuestion,
        words.supportCancelQuestion,
      ];
    };

    given(
      'a woman opens the support page at its own address, which no press leads to yet',
      async () => {
        for (const language of languages) {
          drawn[language] = await pageIn(language);
        }

        // The band at the top holds its way here back, because step 26.26 draws no press whose
        // page was not built and this page was not built when that list was written. Step 27.3
        // takes the mark off. Until it does, the word is still in all three catalogues and the
        // band draws it nowhere.
        expect(theKeysTheFrameHoldsBack).toContain('headerSupport');
        expect(mainLinks.find((way) => way.word === 'headerSupport')?.path).toBe(THE_SUPPORT_PAGE);

        for (const language of languages) {
          const document = drawn[language] ?? '';
          const band = document.slice(0, document.indexOf('<main'));

          expect(band).not.toContain(wordsIn(language).headerSupport);
          expect(band).not.toContain(`/${language}/${THE_SUPPORT_PAGE}`);
        }
      },
    );

    then('she reads the title, the box she searches in, three cards and four questions', () => {
      const middle = theMiddleOf(inEnglish());
      const words = wordsIn('en');

      expect(saidBy(middle, 'h1')).toEqual([words.supportTitle]);
      expect(saidBy(middle, 'h2')).toEqual([words.supportQuestionsHeadline]);
      expect(openingTagsOf(middle, 'input')).toHaveLength(1);
      expect(middle).toContain(`placeholder="${words.supportSearch}"`);

      // The three cards, each on the tint and at the corner the board gives it. What those two
      // classes really draw is read in apps/website/test/theSupportPage.test.tsx, where the
      // stylesheet can be compiled; here the question is how many cards she meets.
      const theCards = openingTagsOf(middle, 'a').filter((tag) => {
        const classes = classesOf(tag);

        return classes.includes('rounded-[24px]') && classes.includes('bg-siteTint');
      });

      expect(theCards).toHaveLength(3);

      expect(saidBy(middle, 'span')).toEqual([
        words.supportEmailUs,
        words.supportEmailUsLine,
        words.supportCommunity,
        words.supportCommunityLine,
        words.supportBeta,
        words.supportBetaLine,
      ]);

      expect(saidBy(middle, 'summary')).toEqual(theFour('en'));
      expect(openingTagsOf(middle, 'details')).toHaveLength(4);

      // The board asks the same four, in the same order, so the page did not quietly lose one.
      expect(saidBy(theMiddleOfTheDesign(), 'summary')).toEqual(theFour('en'));
    });

    and(
      'the card for a subscription is not drawn, and its words wait in all three languages',
      () => {
        // The board draws four cards and the page draws three, which is the difference this is
        // about: the fourth takes her to the account page and the site does not serve one.
        expect(visibleTextOf(theMiddleOfTheDesign())).toContain('Subscription');

        for (const language of languages) {
          const words = wordsIn(language);
          const shown = visibleTextOf(theMiddleOf(drawn[language] ?? ''));

          expect(shown).not.toContain(words.supportSubscription);
          expect(shown).not.toContain(words.supportSubscriptionLine);

          // The words are still written, so the card comes back with one edit.
          expect(words.supportSubscription.trim().length).toBeGreaterThan(0);
          expect(words.supportSubscriptionLine.trim().length).toBeGreaterThan(0);
        }

        // The mark that holds it back, which is the one line somebody takes off that day.
        const page = read(join(websiteWorkspace, 'app', '[lang]', 'support', 'page.tsx'));

        expect(page).toContain('waitsForItsPage: true');
        expect(page).toContain('.filter((card) => card.waitsForItsPage !== true)');
      },
    );

    and(
      'the answer about a lost phone says what today costs her, not the restore nobody built',
      () => {
        expect(visibleTextOf(theMiddleOfTheDesign())).toContain(THE_RESTORE_NOBODY_BUILT);

        for (const language of languages) {
          const words = wordsIn(language);
          const shown = visibleTextOf(theMiddleOf(drawn[language] ?? ''));

          expect(shown).toContain(words.supportLostPhoneAnswer);
          expect(shown).not.toContain(THE_RESTORE_NOBODY_BUILT);

          // It names the one control that makes a copy today, by the name the application gives
          // it, so a woman reading this can go and find it.
          expect(words.supportLostPhoneAnswer).toContain(theControlThatSavesAFile[language]);
        }
      },
    );

    and(
      'the answer about the forecast is what the application does, in all three languages',
      () => {
        for (const language of languages) {
          const words = wordsIn(language);

          expect(visibleTextOf(theMiddleOf(drawn[language] ?? ''))).toContain(
            words.supportLearningAnswer,
          );
          expect(words.supportLearningAnswer).toContain(`${CYCLES_BEFORE_A_FORECAST}`);
        }

        // The number is the application's own, read from the package the screens count with, so
        // the page and the phone cannot say two different things.
        const counting = read(join(repositoryRoot, 'packages', 'cycle', 'src', 'forecast.ts'));

        expect(counting).toContain(
          `export const CYCLES_BEFORE_A_FORECAST = ${CYCLES_BEFORE_A_FORECAST};`,
        );
      },
    );

    and(
      'the answer about deleting names the control in the application and what the keychain keeps',
      () => {
        for (const language of languages) {
          const words = wordsIn(language);

          expect(visibleTextOf(theMiddleOf(drawn[language] ?? ''))).toContain(
            words.supportDeleteAnswer,
          );
          expect(words.supportDeleteAnswer).toContain(theScreenSheOpens[language]);
          expect(words.supportDeleteAnswer).toContain(theControlShePresses[language]);
        }

        // The screen and the control are the application's own words, so the page sends her to a
        // row that is really there.
        const screens = read(
          join(repositoryRoot, 'apps', 'mobile', 'src', 'language', 'english.ts'),
        );

        expect(screens).toContain(`'settings.settings.title': '${theScreenSheOpens.en}'`);
        expect(screens).toContain(`'settings.settings.delete': '${theControlShePresses.en}'`);

        // Why the answer no longer says that deleting the application removes everything: the key
        // is kept outside the database on purpose, because the platform deletes the database with
        // the application and the keychain outlives it.
        const theKey = read(
          join(repositoryRoot, 'apps', 'mobile', 'src', 'services', 'vault', 'vaultKey.ts'),
        );

        expect(theKey).toContain('the platform deletes an application');
        expect(wordsIn('en').supportDeleteAnswer).toContain('keychain');
      },
    );

    and('the answer about cancelling keeps only the sentence about Apple', () => {
      expect(theMiddleOfTheDesign()).toContain(THE_HALF_THAT_NEEDS_AN_ACCOUNT);

      for (const language of languages) {
        const words = wordsIn(language);

        expect(visibleTextOf(theMiddleOf(drawn[language] ?? ''))).toContain(
          words.supportCancelAnswer,
        );
        expect(words.supportCancelAnswer.split('. ')).toHaveLength(1);
      }

      // The board sends her on to the account page twice, in the card and in this answer, and the
      // page sends her there neither time.
      expect(timesIn(theMiddleOfTheDesign(), 'Profile.dc.html')).toBe(2);
      expect(timesIn(theMiddleOf(inEnglish()), 'account/')).toBe(0);
    });

    and('each card takes her somewhere, and she writes to the address the board writes', () => {
      for (const language of languages) {
        const words = wordsIn(language);
        const middle = theMiddleOf(drawn[language] ?? '');

        expect(addressOf(theAnchorAround(middle, words.supportEmailUs))).toBe(THE_SUPPORT_INBOX);
        expect(addressOf(theAnchorAround(middle, words.supportCommunity))).toBe(THE_EMI_COMMUNITY);
        expect(addressOf(theAnchorAround(middle, words.supportBeta))).toBe(THE_EMI_BETA);

        // No press of this page leads to the page she is already on.
        expect(timesIn(middle, 'href="#"')).toBe(0);
      }

      // The board writes the same inbox, and the page writes it once, where the card is.
      expect(theMiddleOfTheDesign()).toContain(`mailto:${theSupportAddress()}`);
      expect(timesIn(theMiddleOf(inEnglish()), `href="${THE_SUPPORT_INBOX}"`)).toBe(1);
    });

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
      expect(keysDrawn.length).toBeGreaterThan(30);

      for (const language of ['ru', 'es'] as const) {
        const shown = shownIn(language);
        const absent = keysDrawn.filter(
          (key) => !shown.has(wordsIn(language)[key as keyof typeof english]),
        );

        expect(absent).toEqual([]);
      }

      // This page on its own, so a page that lost its questions while the two bands kept their
      // words would still fail.
      const supportKeys = Object.keys(english).filter(
        (key) =>
          key.startsWith('support') && shownInEnglish.has(english[key as keyof typeof english]),
      );

      expect(supportKeys.length).toBeGreaterThan(14);
    });

    and(
      'the two headings are set in the face the board sets them in, which the site serves itself',
      () => {
        expect(theMiddleOfTheDesign().split(THE_HEADING_FACE)).toHaveLength(
          theBoardSetsTwoInTheSerif + 1,
        );

        const inTheFace = openingTagsOf(theMiddleOf(inEnglish()), '[a-z0-9]+').filter((tag) =>
          classesOf(tag).includes('font-serif'),
        );

        expect(inTheFace).toHaveLength(theBoardSetsTwoInTheSerif);

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
      'typing a word a question carries leaves her that question and no other, in all three languages',
      async () => {
        for (const language of languages) {
          const words = wordsIn(language);
          const reading = await theLiveSupportPage(language);

          // Every question before she types anything, which is also what a browser that runs
          // nothing at all leaves her with.
          expect(reading.questionsOnScreen()).toEqual(theFour(language));

          // A word out of the middle of one question, so the match is not the opening of it.
          const asked = words.supportDeleteQuestion;
          const typed = asked.slice(asked.length - 6).trim();

          await reading.type(typed);

          expect(reading.questionsOnScreen()).toEqual([asked]);
        }
      },
    );

    and(
      'typing a word no question carries leaves her the line the board draws, with the address in it',
      async () => {
        for (const language of languages) {
          const words = wordsIn(language);
          const reading = await theLiveSupportPage(language);

          await reading.type('zzzqqq');

          expect(reading.questionsOnScreen()).toEqual([]);

          expect(reading.said()).toContain(words.supportNothingFound);
          expect(reading.said()).toContain(words.supportNothingFoundAfter);
          expect(reading.markup()).toContain(`href="${THE_SUPPORT_INBOX}"`);
        }

        // The board draws the same line, which is where the words came from.
        expect(visibleTextOf(theMiddleOfTheDesign())).toContain(wordsIn('en').supportNothingFound);
      },
    );

    and('clearing the box gives her every question back', async () => {
      const reading = await theLiveSupportPage('en');

      await reading.type('zzzqqq');

      expect(reading.questionsOnScreen()).toEqual([]);

      await reading.type('');

      expect(reading.questionsOnScreen()).toEqual(theFour('en'));
      expect(reading.said()).not.toContain(wordsIn('en').supportNothingFound);
    });

    and(
      'the page names its own address, so a search engine keeps it apart from the home page',
      async () => {
        for (const language of languages) {
          const head = await generateMetadata({ params: Promise.resolve({ lang: language }) });

          expect(head.alternates?.canonical).toBe(`${THE_SITE}/${language}/${THE_SUPPORT_PAGE}`);
          expect(head.alternates?.languages).toEqual({
            en: `${THE_SITE}/en/${THE_SUPPORT_PAGE}`,
            ru: `${THE_SITE}/ru/${THE_SUPPORT_PAGE}`,
            es: `${THE_SITE}/es/${THE_SUPPORT_PAGE}`,
            'x-default': `${THE_SITE}/en/${THE_SUPPORT_PAGE}`,
          });
        }
      },
    );

    and('the list a crawler reads names the page in each of the three languages', () => {
      expect(thePagesOfTheSite.map((page) => page.path)).toContain(THE_SUPPORT_PAGE);

      const list = read(join(websiteWorkspace, 'public', SITEMAP_FILE));

      for (const language of languages) {
        const address = `${THE_SITE}/${language}/${THE_SUPPORT_PAGE}`;

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
      'a browser holds the title of the page against the board, and keeps the picture of any difference',
      () => {
        const sentence = 'the title of the support page is the approved design';
        const sentences = join(
          websiteWorkspace,
          'e2e',
          'features',
          'theSupportPageMatchesTheDesign.feature',
        );
        const steps = join(websiteWorkspace, 'e2e', 'steps', 'theSupportPageMatchesTheDesign.ts');

        expect(read(sentences)).toContain(`Scenario: ${sentence}`);
        expect(read(steps)).toContain("'support', 'render', 'Support.html'");
        expect(read(steps)).toContain("'/en/support/'");

        // The one part the board still describes. The middle of the page is four corrections away
        // from the middle of the board, and the two bands the whole site shares hold back presses
        // the board draws, so a comparison of any of those would report the same difference every
        // run.
        expect(read(steps)).toContain("called: 'the-title-of-the-support-page'");
        expect(read(steps)).not.toContain("called: 'the-band-at-the-foot'");

        // A picture of the board at each width the browser reads the page at, so a width the
        // suite gains is a width the design was never drawn at.
        for (const width of asPlaywrightReadsIt().widths) {
          const picture = join(designDirectory, 'reference', `Support-${width}.png`);

          expect({ width, drawn: existsSync(picture) }).toEqual({ width, drawn: true });
        }
      },
    );
  });
});
