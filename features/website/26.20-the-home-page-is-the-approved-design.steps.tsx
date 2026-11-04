import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';
import { renderToStaticMarkup } from 'react-dom/server';

import RootLayout from '../../apps/website/app/[lang]/layout';
import HomePage from '../../apps/website/app/[lang]/page';
import {
  type Language,
  type SiteWordKey,
  brandEyebrowOf,
  languages,
  wordsIn,
} from '../../apps/website/app/words';
import { markerTransformOf, phaseKeyOf } from '../../apps/website/components/cycleRing';
import { asPlaywrightReadsIt } from '../../apps/website/test/theConfiguration';
import { classesIn, declarationsOf, stylesheetFor } from '../../apps/website/test/stylesheet';
import {
  theKeysTheFrameHoldsBack,
  theKeysTheHomePageHoldsBack,
  theWordsHeldBackIn,
} from '../../apps/website/test/theWordsAPressTookWithIt';

const feature = loadFeature(join(__dirname, '26.20-the-home-page-is-the-approved-design.feature'));

const repositoryRoot = resolve(__dirname, '..', '..');

const websiteWorkspace = join(repositoryRoot, 'apps', 'website');

const designDirectory = join(repositoryRoot, 'docs', 'design', 'website', 'home-v2');

// Compiling the stylesheet of the whole page takes longer than the tier's own limit allows.
jest.setTimeout(180_000);

/**
 * The widths the board was drawn at: a desktop, a tablet, and the phone most of her reading is on.
 * The tablet joined them with the board that added the row of reviews, which changes shape there.
 */
const widths = [1280, 834, 390];

/** One pixel in a thousand, which is the budget the browser suite holds the page to. */
const theBudget = 0.001;

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

function theDesign(): string {
  return read(join(designDirectory, 'render', 'MainV2.html'));
}

/**
 * What a reader actually sees, as the text between the tags, in the order it comes.
 *
 * The design is a whole document and a page of the site arrives as the markup inside one, with no
 * body tag of its own, so the body is taken where there is one and the whole thing where there is
 * not. Reading a page from a body tag it never had would answer with nothing at all, which reads
 * exactly like a page that says nothing.
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

/** The ground the design paints a band on, from the band's own style. */
/**
 * The band of the board the page does not draw, by the heading it names itself to her software by.
 *
 * It is two cards, and each card is a press and the sentence that explains the press: one to the
 * free calculator and one to support. Neither page is built, so a press to either would answer 404,
 * and the band has nothing left to say without them. It comes back whole on the day those two pages
 * ship.
 */
const theBandThatWaitsForItsPages = 'try-title';

/** One band of the board: the heading it names itself by, and the ground it is painted on. */
interface ABandOfTheBoard {
  readonly labelledBy: string;
  readonly ground: string;
}

function bandsOfTheDesign(): ABandOfTheBoard[] {
  return openingTagsOf(theDesign(), 'section').map((tag) => ({
    labelledBy: (/aria-labelledby="([^"]+)"/.exec(tag)?.[1] ?? '').trim(),
    ground: (/background:\s*([^;"]+)/.exec(tag)?.[1] ?? '').trim(),
  }));
}

function groundsOfTheDesign(): string[] {
  return bandsOfTheDesign()
    .filter((band) => band.labelledBy !== theBandThatWaitsForItsPages)
    .map((band) => band.ground);
}

/** The property each element sets a rule with, which is how a rule on four sides is told from one. */
const aRuleWidth = /border(?:-(top|right|bottom|left))?-width:\s*([^;]+)/g;

interface Rule {
  readonly sides: string[];
  readonly colours: string[];
}

/** Every element of a page that draws a rule, and which sides of it the rule is on. */
function rulesIn(markup: string, stylesheet: string): Rule[] {
  const found: Rule[] = [];

  for (const tag of openingTagsOf(markup, '[a-zA-Z]+')) {
    const drawn = drawnBy(tag, stylesheet);
    const sides = [...drawn.matchAll(aRuleWidth)].map(([, side]) => side ?? 'every side');

    if (sides.length === 0) {
      continue;
    }

    found.push({
      sides,
      colours: [...drawn.matchAll(/border(?:-(top|right|bottom|left))?-color:/g)].map(
        ([, side]) => side ?? 'every side',
      ),
    });
  }

  return found;
}

/**
 * Every rule the design draws, and on which side each one sits.
 *
 * A board writes a rule on one side of a band as `border-top` or `border-bottom`, and the edge of
 * a control it draws all the way round as plain `border`. Both are read, because a rule the board
 * puts on one side becoming four is the drift this exists to catch, and so is the reverse.
 */
function rulesOfTheDesign(): string[] {
  return [...theDesign().matchAll(/border(-(?:top|bottom|left|right))?:\s*1px/g)].map(
    ([, side]) => side?.slice(1) ?? 'every side',
  );
}

/**
 * The words of a link the design leaves underlined. A link in the board carries
 * `text-decoration: none` unless it is one of these, and these are the legal line at the foot of
 * the page, where a reader looks for the terms she is agreeing to.
 *
 * Two more anchors carry no decoration either, and both hold a drawing rather than words, so
 * nothing of them is underlined and neither is read here.
 */
function underlinedInTheDesign(): string[] {
  const markup = theDesign();
  const words: string[] = [];

  for (const found of markup.matchAll(/<a\b[^>]*>/g)) {
    const tag = found[0];

    if (tag.includes('text-decoration: none')) {
      continue;
    }

    const opens = (found.index ?? 0) + tag.length;
    const text = markup.slice(opens, markup.indexOf('</a>', opens)).trim();

    if (text.length > 0 && !text.startsWith('<')) {
      words.push(text);
    }
  }

  return [...new Set(words)];
}

/** The element of a page that holds one piece of text, so what it draws can be read. */
function theAnchorAround(markup: string, text: string): string {
  const at = markup.indexOf(`>${text}<`);

  expect(at).toBeGreaterThanOrEqual(0);

  return markup.slice(markup.lastIndexOf('<a', at), at + 1);
}

/**
 * The whole document she is sent. Next.js puts the page inside the root layout and answers with
 * one of them, and every sentence of the board below the bands belongs to the layout, so a read of
 * the page on its own would miss them.
 */
async function pageIn(language: Language): Promise<string> {
  const page = await HomePage({ params: Promise.resolve({ lang: language }) });

  return renderToStaticMarkup(
    await RootLayout({ children: page, params: Promise.resolve({ lang: language }) }),
  );
}

defineFeature(feature, (test) => {
  test('the home page matches the approved design pixel for pixel', ({ given, then, and }) => {
    const drawn: Partial<Record<Language, string>> = {};
    let stylesheet = '';

    given('a woman opens the home page of myemi.app', async () => {
      for (const language of languages) {
        drawn[language] = await pageIn(language);
      }

      stylesheet = await stylesheetFor(classesIn(drawn.en ?? ''));
    });

    then(
      "she reads the eight bands of the approved board whose presses have pages, in the board's order and on its grounds",
      () => {
        const bands = openingTagsOf(drawn.en ?? '', 'section');
        const wanted = groundsOfTheDesign();

        // Nine on the board, and the one left out is the band of the two offers.
        expect(bandsOfTheDesign()).toHaveLength(9);
        expect(bandsOfTheDesign().map((band) => band.labelledBy)).toContain(
          theBandThatWaitsForItsPages,
        );
        expect(drawn.en ?? '').not.toContain(`aria-labelledby="${theBandThatWaitsForItsPages}"`);

        expect(wanted).toHaveLength(8);
        expect(bands).toHaveLength(wanted.length);

        const painted = bands.map((tag) => {
          const found = /background-color:\s*([^;]+)/.exec(drawnBy(tag, stylesheet));

          return (found?.[1] ?? '').trim();
        });

        expect(painted).toEqual(wanted);
      },
    );

    and('every sentence of the board is on the page, in English, in Russian and in Spanish', () => {
      const said = visibleTextOf(theDesign());

      // The board was approved while one of the two founders had not written her note, so it draws
      // a hole where the page now draws her own sentences. It is the one sentence of the board the
      // page does not draw, and it is picked out by the name it opens with so that a second one
      // cannot arrive under the same exception.
      const filled = said.filter((text) => text.startsWith('[IULIIA'));

      // The board draws every press the page holds back, so the sentences those presses took with
      // them are the other exception to this reading.
      const heldBack = theWordsHeldBackIn('en');

      expect(filled).toHaveLength(1);
      expect(said.length).toBeGreaterThan(80);
      expect(
        said.filter(
          (text) =>
            !filled.includes(text) && !heldBack.includes(text) && !(drawn.en ?? '').includes(text),
        ),
      ).toEqual([]);

      // The board is in English, so the other two pages are held to the keys the English page
      // draws rather than to the board's own sentences. A key drawn in one language and not in
      // another is a page that says less than its neighbour, which is the error SITE-3 names.
      //
      // A key counts as drawn when the page shows its whole sentence as a piece of text, not when
      // the markup happens to hold the letters somewhere. Two roles of the same band read "Co-
      // founder of Emi" and "Co-founder of Emi, host of the Emi Community", so a search through
      // the markup finds the shorter one inside the longer one and then asks the other two
      // languages for a sentence their page never had a reason to draw.
      const english = wordsIn('en');
      const shownIn = (language: Language): Set<string> =>
        new Set(visibleTextOf(drawn[language] ?? ''));
      const shownInEnglish = shownIn('en');
      const keysDrawn = Object.keys(english).filter((key) =>
        shownInEnglish.has(english[key as keyof typeof english]),
      );

      expect(keysDrawn.length).toBeGreaterThan(50);
      expect(
        keysDrawn.filter((key) =>
          [...theKeysTheFrameHoldsBack, ...theKeysTheHomePageHoldsBack].includes(
            key as SiteWordKey,
          ),
        ),
      ).toEqual([]);

      for (const language of ['ru', 'es'] as const) {
        const shown = shownIn(language);
        const absent = keysDrawn.filter(
          (key) => !shown.has(wordsIn(language)[key as keyof typeof english]),
        );

        expect(absent).toEqual([]);
      }
    });

    and(
      'the brand line stands over the hero in capitals, and is still the one line nobody translates',
      () => {
        for (const language of languages) {
          expect(drawn[language]).toContain(brandEyebrowOf(wordsIn(language)));
          expect(wordsIn(language).brandLine).toBe(wordsIn('en').brandLine);
        }

        expect(brandEyebrowOf(wordsIn('en'))).toBe('EMI · EVERY MONTH INSIGHTS');
      },
    );

    and(
      'the ring starts at day 8 in the follicular phase, and answers every other day the way the board does',
      () => {
        const design = theDesign();
        const atDayEight = /rotate\([^)]*\)/.exec(design)?.[0] ?? '';

        expect(atDayEight).toBe('rotate(-2.9 160 160)');
        expect(drawn.en).toContain(atDayEight);
        expect(drawn.en).toContain(wordsIn('en').ringFollicular);
        expect(drawn.en).toContain('Day 8');

        // The board's own four phases, at the day each one begins and the day it ends.
        expect([1, 5].map(phaseKeyOf)).toEqual(['ringPeriod', 'ringPeriod']);
        expect([6, 16].map(phaseKeyOf)).toEqual(['ringFollicular', 'ringFollicular']);
        expect([17, 21].map(phaseKeyOf)).toEqual(['ringOvulation', 'ringOvulation']);
        expect([22, 31].map(phaseKeyOf)).toEqual(['ringLuteal', 'ringLuteal']);

        // The board's own arithmetic, written again here, because a formula read off the same line
        // the page reads it off agrees with the page whatever the page says.
        for (let day = 1; day <= 31; day += 1) {
          const degrees = (((day - 0.5) / 31) * 360 - 90).toFixed(1);

          expect(markerTransformOf(day)).toBe(`rotate(${degrees} 160 160)`);
        }
      },
    );

    and('every rule sits on the sides the board puts it on, and on no others', () => {
      const wanted = rulesOfTheDesign();
      const found = rulesIn(drawn.en ?? '', stylesheet);

      expect(wanted.length).toBeGreaterThan(0);
      expect(found).toHaveLength(wanted.length);

      for (const rule of found) {
        expect(rule.sides).toHaveLength(1);
        expect(rule.colours).toEqual(rule.sides);
      }

      expect(found.map((rule) => rule.sides[0]).sort()).toEqual([...wanted].sort());
    });

    and(
      'the four links of the legal line are underlined, because the board underlines them',
      () => {
        // The board underlines five. The terms are the fifth, and that page is still to be built,
        // so the press is not drawn and the four left are what the page underlines.
        const underlined = underlinedInTheDesign();

        expect(underlined).toEqual(['Privacy policy', 'Terms', 'English', 'Русский', 'Español']);

        for (const text of underlined.filter((text) => text !== wordsIn('en').footerTerms)) {
          const anchor = theAnchorAround(drawn.en ?? '', text);

          expect(drawnBy(anchor, stylesheet)).toContain('text-decoration-line: underline');
        }
      },
    );

    and('the page writes no style of its own, so her browser refuses nothing', () => {
      for (const language of languages) {
        expect(drawn[language]).not.toMatch(/style="/);
        expect(drawn[language]).not.toMatch(/<style[\s>]/);
      }
    });

    and(
      'a browser holds the page against the design at every width, and keeps the picture of any difference',
      () => {
        const suite = asPlaywrightReadsIt();
        const sentence = 'the home page matches the approved design pixel for pixel';
        const theFeature = read(
          join(websiteWorkspace, 'e2e', 'features', 'homeMatchesTheDesign.feature'),
        );
        // The sentences of the scenario and the reading behind them. The reading sits in a file
        // of its own, because two pages of the site are each held to a board of their own and one
        // set of numbers is read by both.
        const theSteps = [
          read(join(websiteWorkspace, 'e2e', 'steps', 'homeMatchesTheDesign.ts')),
          read(join(websiteWorkspace, 'e2e', 'steps', 'theDesignComparison.ts')),
        ].join('\n');

        expect(theFeature).toContain(`Scenario: ${sentence}`);
        expect([...suite.widths].sort()).toEqual([...widths].sort());

        expect(theSteps).toContain('MainV2.html');
        expect(theSteps).toContain("'/en/'");
        expect(theSteps).toContain(`${theBudget}`);
        expect(theSteps).toContain('pixelmatch');
        expect(theSteps).toContain('writeFileSync');
      },
    );
  });
});
