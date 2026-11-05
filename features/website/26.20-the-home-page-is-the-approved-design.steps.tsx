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

/**
 * The four sentences of the board that version 1 overtook, word for word as the board draws them.
 *
 * Two of them promise that her data is always encrypted, and an export is a readable file she
 * holds, so the page says where the encryption happens and what it covers. The other two are the
 * forecast card: the application names no confidence, and the board's two days in October 2026
 * were in the past for every reader after that month.
 *
 * Nobody has redrawn the board, so the page says what the product does and this list is why the
 * reading below does not fail on it.
 */
const theSentencesTheBoardSaidFirst: readonly string[] = [
  'Emi starts with your cycle: a forecast from your own data, and how sure it is. Then accurate education, and a community where you can ask what people are told not to. Your data is always encrypted.',
  'Between the 8th and the 14th of October',
  'High confidence, from your last 6 cycles',
  'Your data is always encrypted.',
];

/** What the page says in each of those places, which is read in every language. */
const theWordsThePageSaysInstead: readonly SiteWordKey[] = [
  'heroLine',
  'cycleNextConfidence',
  'privacyHeadline',
];

/**
 * How sure the forecast is, in the application's own words with the board's count of cycles
 * written in. The application never says a confidence, so neither does this card.
 */
const theConfidenceTheApplicationSays: Readonly<Record<Language, string>> = {
  en: 'Based on your last 6 cycles',
  ru: 'По вашим последним 6 циклам',
  es: 'Según tus últimos 6 ciclos',
};

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

/** What the design labels each band with, and the ground it paints that band on. */
function bandsOfTheDesign(): { band: string; ground: string }[] {
  return openingTagsOf(theDesign(), 'section').map((tag) => ({
    band: /aria-labelledby="([^"]+)"/.exec(tag)?.[1] ?? '',
    ground: (/background:\s*([^;"]+)/.exec(tag)?.[1] ?? '').trim(),
  }));
}

/**
 * The one band of the design the page does not draw. Nobody has written a review of Emi yet, so
 * the band of reviews is held back whole rather than drawn with six cards of holes in it, which is
 * `apps/website/lib/theReviews.ts` being empty.
 *
 * The band of the two offers is not held back any more. It is two cards, and each card is a press
 * and the sentence that explains the press: one to the free calculator and one to support. The
 * support page shipped in step 27.2, so that card is drawn and the band is drawn with it. The
 * calculator is still to be built, so its card is not drawn, and the page therefore labels the
 * band by the card that is left.
 */
const THE_BANDS_HELD_BACK = ['reviews-title'];

/**
 * What the board calls the band of the two offers, and what the page calls it. The board labels
 * it by the card for the calculator, which the page does not draw, so the page labels it by the
 * card for support instead.
 */
const THE_BAND_OF_THE_TWO_OFFERS = { onTheBoard: 'try-title', onThePage: 'ask-title' };

/** One band of the design, as its own markup, so what stands inside it can be read on its own. */
function theBandOfTheDesign(band: string): string {
  const markup = theDesign();
  const opens = markup.indexOf(`<section aria-labelledby="${band}"`);
  const closes = markup.indexOf('</section>', opens);

  if (opens < 0 || closes < 0) {
    throw new Error(`The design draws no band called ${band}.`);
  }

  return markup.slice(opens, closes);
}

/** The design with those bands cut out of it, which is what the rest of the board still says. */
function theDesignWithout(bands: readonly string[]): string {
  return bands.reduce((markup, band) => markup.replace(theBandOfTheDesign(band), ''), theDesign());
}

/** The grounds the design paints, in its order, without the bands the page holds back. */
function groundsOfTheDesign(): string[] {
  return bandsOfTheDesign()
    .filter(({ band }) => !THE_BANDS_HELD_BACK.includes(band))
    .map(({ ground }) => ground);
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
  return [
    ...theDesignWithout(THE_BANDS_HELD_BACK).matchAll(
      /border(-(?:top|bottom|left|right))?:\s*1px/g,
    ),
  ].map(([, side]) => side?.slice(1) ?? 'every side');
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
      "she reads eight of the nine bands of the approved board, in the board's order and on its grounds",
      () => {
        const bands = openingTagsOf(drawn.en ?? '', 'section');
        const onTheBoard = bandsOfTheDesign();
        const wanted = groundsOfTheDesign();

        // Nine on the board. The one left out is the band of reviews, which nobody has written one
        // for. The band of the two offers is drawn with one of its two cards, so it is here, under
        // the name the page gives it.
        expect(onTheBoard).toHaveLength(9);
        expect(onTheBoard.map((each) => each.band)).toContain(
          THE_BAND_OF_THE_TWO_OFFERS.onTheBoard,
        );
        expect(drawn.en ?? '').toContain(
          `aria-labelledby="${THE_BAND_OF_THE_TWO_OFFERS.onThePage}"`,
        );
        expect(drawn.en ?? '').not.toContain(
          `aria-labelledby="${THE_BAND_OF_THE_TWO_OFFERS.onTheBoard}"`,
        );

        for (const band of THE_BANDS_HELD_BACK) {
          expect({ band, onTheBoard: onTheBoard.map((each) => each.band).includes(band) }).toEqual({
            band,
            onTheBoard: true,
          });
          expect({
            band,
            onThePage: (drawn.en ?? '').includes(`aria-labelledby="${band}"`),
          }).toEqual({ band, onThePage: false });
        }

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
      // a hole where the page now draws her own sentences. It is picked out by the name it opens
      // with so that a second one cannot arrive under the same exception.
      const filled = said.filter((text) => text.startsWith('[IULIIA'));

      // And four sentences of the board say more than version 1 does, so the page says what it
      // does instead. Each one is written out here rather than matched by a pattern, so a fifth is
      // a deliberate edit of this list and of the list of what the page says in its place.
      const overtaken = theSentencesTheBoardSaidFirst.filter((text) => said.includes(text));

      // And two bands are held back whole, so their own sentences are not on the page. A sentence
      // counts as held back only when the rest of the board does not say it as well: the press
      // that holds both carousels still reads the same in both bands, and that one is still
      // required here.
      const elsewhere = visibleTextOf(theDesignWithout(THE_BANDS_HELD_BACK));
      const heldBack = THE_BANDS_HELD_BACK.flatMap((band) =>
        visibleTextOf(theBandOfTheDesign(band)).filter((text) => !elsewhere.includes(text)),
      );

      // The board also draws every press the two bands the whole site shares no longer draw, so
      // the sentences those presses took with them are a third exception to this reading, and
      // the four the product overtook are a fourth.
      const excused = [...filled, ...heldBack, ...theWordsHeldBackIn('en'), ...overtaken];

      expect(filled).toHaveLength(1);
      expect(heldBack.length).toBeGreaterThan(0);
      expect(overtaken).toEqual(theSentencesTheBoardSaidFirst);
      expect(said.length).toBeGreaterThan(80);

      // Every other sentence of the board is on the page, and not one of the held back ones is.
      expect(
        said.filter((text) => !excused.includes(text) && !(drawn.en ?? '').includes(text)),
      ).toEqual([]);
      expect(heldBack.filter((text) => (drawn.en ?? '').includes(text))).toEqual([]);

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

      // And what the page says where the board has been overtaken, in all three languages. The
      // check above reads the board, so it would pass on a page that had quietly gone back to the
      // board's own wording in one language.
      for (const language of languages) {
        const shown = shownIn(language);
        const words = wordsIn(language);
        const absent = theWordsThePageSaysInstead.filter((key) => !shown.has(words[key]));

        expect(absent).toEqual([]);
        expect(words.heroLine.endsWith(words.privacyHeadline)).toBe(true);
        expect(words.cycleNextConfidence).toBe(theConfidenceTheApplicationSays[language]);

        // The window is counted from the day the page is drawn, so the sentence itself is read in
        // apps/website/test, with the clock stood in for. What is read here is that the card is
        // not drawing a hole of the catalogue at a reader.
        expect(
          [...shown].filter((text) => /\{(from|to|month|fromMonth|toMonth)\}/.test(text)),
        ).toEqual([]);
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
      // Read off the board without the band it holds back, because the three presses of that band
      // each draw a rule all the way round and none of the three is on the page.
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
