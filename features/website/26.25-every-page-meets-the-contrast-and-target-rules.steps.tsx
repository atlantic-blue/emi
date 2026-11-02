import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { websitePhoneWidth } from '@emi/tokens';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { renderToStaticMarkup } from 'react-dom/server';

import { english as applicationEnglish } from '../../apps/mobile/src/language/english';
import { russian as applicationRussian } from '../../apps/mobile/src/language/russian';
import { spanish as applicationSpanish } from '../../apps/mobile/src/language/spanish';
import { type Language, languages, wordsIn } from '../../apps/website/app/words';
import { SiteFooter } from '../../apps/website/components/siteFooter';
import { SiteHeader } from '../../apps/website/components/siteHeader';
import {
  everyPageSheReaches,
  theContrastALargeWordNeeds,
  theContrastAWordNeeds,
  theRulesSheIsHeldTo,
  theWidthAThumbPressesAt,
  whatAPointerNeeds,
  whatAThumbNeeds,
  whereALargeWordStarts,
} from '../../apps/website/e2e/theReadingRules';
import {
  amountsOfMoneyIn,
  problemsWithTheAddress,
  problemsWithWhatItCosts,
  theAmountOf,
  theOneAmount,
  theOneHost,
  theOnePrice,
} from '../../apps/website/lib/theOnePrice';
import { declarationsOf, stylesheetFor } from '../../apps/website/test/stylesheet';

const feature = loadFeature(
  join(__dirname, '26.25-every-page-meets-the-contrast-and-target-rules.feature'),
);

const repositoryRoot = resolve(__dirname, '..', '..');

const websiteWorkspace = join(repositoryRoot, 'apps', 'website');

const theWords = join(websiteWorkspace, 'app', 'words');

/** The application's own catalogues, which carry the line the site copies its price from. */
const theApplication: Readonly<Record<Language, Readonly<Record<string, unknown>>>> = {
  en: applicationEnglish,
  ru: applicationRussian,
  es: applicationSpanish,
};

/** One thing on the page a woman can press, as the server drew it for her. */
interface APress {
  readonly tag: string;
  /** What her software would read out: the name beside it, or the words inside it. */
  readonly called: string;
  /** The classes of the press itself, which is what sets the size of the box she hits. */
  readonly classes: readonly string[];
  /**
   * The classes of the press and of everything it sits inside. A press is drawn only where every
   * one of them is drawn, and the header hides its six ways into the product on the band that
   * holds them rather than on each link, so the press alone cannot answer whether she sees it.
   */
  readonly chain: readonly (readonly string[])[];
}

/** The elements that close themselves, so nothing after one of them sits inside it. */
const closeThemselves = new Set(['img', 'br', 'input', 'hr', 'meta', 'link', 'source', 'area']);

/** The variants of the theme that are in force at the width of a phone, both being a ceiling. */
const atThePhone = ['phone:', 'tablet:'];

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

function everyFileOfTheWords(): { file: string; text: string }[] {
  return ['english.ts', 'index.ts', 'language.ts', 'russian.ts', 'spanish.ts', 'words.ts'].map(
    (file) => ({ file, text: read(join(theWords, file)) }),
  );
}

/** Every press in a piece of markup, in the order a reader meets it. */
function everyPressIn(markup: string): APress[] {
  const presses: APress[] = [];
  const inside: { tag: string; classes: string[] }[] = [];

  for (const token of markup.matchAll(/<\/?([a-zA-Z][\w-]*)((?:"[^"]*"|[^>])*)>/g)) {
    const [whole, tag = '', attributes = ''] = token;

    if (whole.startsWith('</')) {
      while (inside.length > 0 && inside.pop()?.tag !== tag) {
        continue;
      }

      continue;
    }

    const classes = (/class="([^"]*)"/.exec(attributes)?.[1] ?? '')
      .split(/\s+/)
      .filter((name) => name.length > 0);

    if (tag === 'a' || tag === 'button') {
      const after = (token.index ?? 0) + whole.length;
      const closing = markup.indexOf(`</${tag}>`, after);
      const words = closing < 0 ? '' : markup.slice(after, closing).replace(/<[^>]*>/g, '');
      const named = /aria-label="([^"]*)"/.exec(attributes)?.[1];

      presses.push({
        tag,
        called: (named ?? words).trim(),
        classes,
        chain: [classes, ...inside.map((held) => held.classes)],
      });
    }

    if (!whole.endsWith('/>') && !closeThemselves.has(tag)) {
      inside.push({ tag, classes });
    }
  }

  return presses;
}

/** What one set of classes sets display to, or nothing where none of them sets it. */
function displayOf(classes: readonly string[], stylesheet: string): string | null {
  const set = classes
    .map((name) => /(?<![-\w])display: ([a-z-]+)/.exec(declarationsOf(stylesheet, name))?.[1])
    .filter((value) => value !== undefined);

  return set.length === 0 ? null : (set[set.length - 1] ?? null);
}

/** Whether the phone draws a press at all, which is whether it draws every element it sits in. */
function thePhoneDrawsIt(press: APress, stylesheet: string): boolean {
  return press.chain.every((classes) => {
    const narrow = classes.filter((name) => atThePhone.some((variant) => name.startsWith(variant)));
    const everywhere = classes.filter((name) => !name.includes(':'));

    return (displayOf(narrow, stylesheet) ?? displayOf(everywhere, stylesheet)) !== 'none';
  });
}

/** Every address the browser scenario reads, out of the table of examples under it. */
function theAddressesIn(sentences: string): string[] {
  const rows = sentences.slice(sentences.indexOf('Examples:')).split('\n').slice(2);

  return rows
    .map((row) => row.trim().replace(/^\|/, '').replace(/\|$/, '').trim())
    .filter((cell) => cell.length > 0);
}

/**
 * The largest floor the rules of a press set on one axis, in pixels. A line height is not one of
 * them: it sets the height of a line of text rather than of the box her thumb lands on, so a press
 * that leans on it is read here as having no floor at all.
 */
function theFloorOn(axis: 'width' | 'height', declarations: string): number {
  const written = new RegExp(String.raw`(?<![-\w])(?:min-)?${axis}: (\d+(?:\.\d+)?)px`, 'g');
  const found = [...declarations.matchAll(written)].map(([, value]) => Number(value));

  return found.length === 0 ? 0 : Math.max(...found);
}

defineFeature(feature, (test) => {
  test('every page meets the contrast and target rules', ({ given, then, and }) => {
    let theBrowserReads = '';
    let theBrowserMeasures = '';
    let header = '';
    let footer = '';

    given(
      'the pages myemi.app serves, in the three languages and on the address nobody has',
      () => {
        theBrowserReads = read(
          join(websiteWorkspace, 'e2e', 'features', 'theContrastAndTheTargets.feature'),
        );
        theBrowserMeasures = read(
          join(websiteWorkspace, 'e2e', 'steps', 'theContrastAndTheTargets.ts'),
        );
        header = renderToStaticMarkup(<SiteHeader language="en" />);
        footer = renderToStaticMarkup(<SiteFooter language="en" />);

        // The three languages and the address nobody has, read as four pages rather than as one,
        // because a rule that holds in English and fails in Russian holds for a third of her.
        expect([...everyPageSheReaches]).toEqual(['/en/', '/ru/', '/es/', '/en/nothing/']);

        expect(theAddressesIn(theBrowserReads)).toEqual([...everyPageSheReaches]);

        expect(theBrowserReads).toContain(
          'Scenario Outline: every page meets the contrast and target rules',
        );
      },
    );

    then(
      'she can read every word, because a browser holds each one to the contrast her eyes need',
      () => {
        expect([...theRulesSheIsHeldTo]).toContain('color-contrast');
        expect(theContrastAWordNeeds).toBe(4.5);
        expect(theContrastALargeWordNeeds).toBe(3);

        // Large is 18 points, which is the 24 pixels the rule is written in terms of, at the 96
        // pixels an inch a browser draws a point at.
        expect((whereALargeWordStarts * 96) / 72).toBe(24);

        // The reader is asked what floors it was really holding while it read. A rule can be named
        // and still measure a weaker number than the site promises, and a page that passed that
        // would read exactly like a page she can read.
        expect(theBrowserMeasures).toContain('found.floors');
        expect(theBrowserMeasures).toContain('aWord: theContrastAWordNeeds');
        expect(theBrowserMeasures).toContain('aLargeWord: theContrastALargeWordNeeds');
        expect(theBrowserMeasures).toContain('withRules([...theRulesSheIsHeldTo])');
      },
    );

    and(
      'she can tell what every button and every link does, because each one says what it is',
      () => {
        expect([...theRulesSheIsHeldTo]).toContain('button-name');
        expect([...theRulesSheIsHeldTo]).toContain('link-name');

        const presses = [...everyPressIn(header), ...everyPressIn(footer)];
        const silent = presses.filter((press) => press.called.length === 0);

        expect(presses.length).toBeGreaterThan(15);
        expect(silent).toEqual([]);
      },
    );

    and(
      'every press in the two bands every page carries is big enough for her thumb on a phone',
      async () => {
        expect(whatAThumbNeeds).toBe(44);
        expect(theWidthAThumbPressesAt).toBe(websitePhoneWidth);

        const presses = [...everyPressIn(header), ...everyPressIn(footer)];
        const stylesheet = await stylesheetFor(presses.flatMap((press) => press.chain.flat()));
        const tooSmall: string[] = [];

        for (const press of presses) {
          // A press the phone does not draw is not a press she can miss.
          if (!thePhoneDrawsIt(press, stylesheet)) {
            continue;
          }

          const drawn = press.classes.map((name) => declarationsOf(stylesheet, name)).join(' ');
          const across = theFloorOn('width', drawn);
          const down = theFloorOn('height', drawn);

          if (across < whatAThumbNeeds || down < whatAThumbNeeds) {
            tooSmall.push(`${press.called} is held to ${across} by ${down}`);
          }
        }

        expect(presses.length).toBeGreaterThan(15);
        expect(tooSmall).toEqual([]);

        // Above the width of a phone a pointer does the pressing, and a pointer is held to the
        // floor of the guidelines, which the browser reads with the rule rather than by measuring.
        expect([...theRulesSheIsHeldTo]).toContain('target-size');
        expect(whatAPointerNeeds).toBe(24);
        expect(theBrowserMeasures).toContain('whatAThumbNeeds');
        expect(theBrowserMeasures).toContain('press.width} by ${press.height}');
      },
    );

    and(
      'the pages ask her for one price, 29.99 pounds a month, in each of the three languages',
      () => {
        expect(languages.map((language) => theOnePrice[language])).toEqual([
          'One month free, then 29.99 pounds a month.',
          'Первый месяц бесплатно, затем 29,99 фунта в месяц.',
          'Un mes gratis, después 29,99 libras al mes.',
        ]);

        for (const language of languages) {
          expect(wordsIn(language).price).toBe(theOnePrice[language]);
          expect(theOnePrice[language]).toBe(
            theApplication[language]['onboarding.tour.price.line'],
          );
        }

        const amounts = everyFileOfTheWords().flatMap(({ text }) => amountsOfMoneyIn(text));

        expect(amounts).toHaveLength(languages.length);
        expect(amounts.map((amount) => theAmountOf(amount))).toEqual(
          amounts.map(() => theOneAmount),
        );
        expect(everyFileOfTheWords().flatMap(problemsWithWhatItCosts)).toEqual([]);
        expect(everyFileOfTheWords().flatMap(problemsWithTheAddress)).toEqual([]);
        expect(theOneHost).toBe('myemi.app');
      },
    );

    and('words that named another amount, another period or another address are refused', () => {
      const english = read(join(theWords, 'english.ts'));
      const language = read(join(theWords, 'language.ts'));
      const cheaper = english.replace('29.99 pounds a month', '£24.99 a month');
      const yearly = english.replace('29.99 pounds a month', '29.99 pounds a year');
      const elsewhere = language.replace('myemi.app', 'emi-tracker.com');

      expect(problemsWithWhatItCosts({ file: 'english.ts', text: cheaper })).toEqual([
        'english.ts asks for £24.99, and the one price is 29.99 a month',
        `english.ts names money outside the one price, which reads "${theOnePrice.en}"`,
      ]);
      expect(problemsWithWhatItCosts({ file: 'english.ts', text: yearly })).toEqual([
        `english.ts names money outside the one price, which reads "${theOnePrice.en}"`,
      ]);
      expect(problemsWithTheAddress({ file: 'language.ts', text: elsewhere })).toEqual([
        'language.ts names emi-tracker.com, and the one address is myemi.app',
      ]);
    });
  });
});
