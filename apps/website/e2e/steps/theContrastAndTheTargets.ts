import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import {
  theContrastALargeWordNeeds,
  theContrastAWordNeeds,
  theRulesSheIsHeldTo,
  theWidthAThumbPressesAt,
  whatAPointerNeeds,
  whatAThumbNeeds,
  whereALargeWordStarts,
} from '../theReadingRules';
import { test } from './fixtures';

/**
 * Everything on a page a woman can press. Read by what her own software treats as a press rather
 * than by what the markup calls it, so a link drawn as a button and a button drawn as a link are
 * both measured.
 */
const everyPress =
  'a[href], button, input, select, textarea, summary, [role="button"], [role="link"]';

/** How the four rules divide: what she reads, and what she presses. */
const aboutWhatSheReads = ['color-contrast'];

const aboutWhatAPressIsCalled = ['button-name', 'link-name'];

const aboutHowBigAPressIs = ['target-size'];

/**
 * The settings the reader was holding the page to, as it holds them itself. Named here because the
 * run reaches into them: a rule can be named and still be measuring something other than the
 * number this site promises, and then a passing page proves nothing.
 */
interface WhatAxeHeld {
  readonly checks: Record<string, { readonly options?: Record<string, unknown> }>;
}

interface ARatio {
  readonly normal: { readonly expected: number };
  readonly large: { readonly expected: number };
}

const { Then, When } = createBdd(test);

When(
  'her software reads the page for what she cannot read and cannot press',
  async ({ page, found }) => {
    // The cards of the two carousels move on by themselves, and an element that moves while it is
    // being measured is measured in two places. The reader is told she asked for less motion, which
    // is what the page itself reads to hold them still.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => document.fonts.ready);

    const read = await new AxeBuilder({ page }).withRules([...theRulesSheIsHeldTo]).analyze();

    for (const refusal of read.violations) {
      for (const element of refusal.nodes) {
        const why = (element.failureSummary ?? '').split('\n').slice(1).join(' ').trim();

        found.refused.push(`${refusal.id}: ${element.target.join(' ')}: ${why}`);
      }
    }

    found.floors = await page.evaluate(() => {
      const held = (window as unknown as { axe: { _audit: WhatAxeHeld } }).axe._audit;
      const contrast = held.checks['color-contrast']?.options ?? {};
      const ratio = contrast.contrastRatio as ARatio;

      return {
        aWord: ratio.normal.expected,
        aLargeWord: ratio.large.expected,
        whereLargeStarts: contrast.largeTextPt as number,
        aPress: held.checks['target-size']?.options?.minSize as number,
        spaceAroundAPress: held.checks['target-offset']?.options?.minOffset as number,
      };
    });

    found.presses.push(
      ...(await page.evaluate((selector) => {
        return [...document.querySelectorAll(selector)]
          .map((element) => {
            const box = element.getBoundingClientRect();
            const drawn = getComputedStyle(element);

            return {
              called:
                element.getAttribute('aria-label') ??
                (element.textContent ?? '').trim().slice(0, 40),
              width: Math.round(box.width * 10) / 10,
              height: Math.round(box.height * 10) / 10,
              hidden:
                drawn.visibility === 'hidden' ||
                drawn.display === 'none' ||
                box.width === 0 ||
                box.height === 0,
            };
          })
          .filter((press) => !press.hidden)
          .map(({ called, width, height }) => ({ called, width, height }));
      }, everyPress)),
    );
  },
);

Then('every word she reads carries the contrast her eyes need', ({ found }) => {
  expect(refusalsAbout(found.refused, aboutWhatSheReads)).toEqual([]);

  // The rule was measuring the numbers this site promises. A rule that ran against a weaker floor
  // would pass a page she cannot read, and the pass would look the same.
  expect(found.floors).toEqual({
    aWord: theContrastAWordNeeds,
    aLargeWord: theContrastALargeWordNeeds,
    whereLargeStarts: whereALargeWordStarts,
    aPress: whatAPointerNeeds,
    spaceAroundAPress: whatAPointerNeeds,
  });
});

Then('every button and every link says what it is', ({ found }) => {
  expect(refusalsAbout(found.refused, aboutWhatAPressIsCalled)).toEqual([]);

  // A page that offered her nothing to press would pass the rule above by having nothing to fail
  // it, so the count is read as well.
  expect(found.presses.length).toBeGreaterThan(10);
});

Then('every press is big enough for the thumb that has to hit it', ({ found, page }) => {
  expect(refusalsAbout(found.refused, aboutHowBigAPressIs)).toEqual([]);

  const window = page.viewportSize();

  if (window === null) {
    throw new Error('The browser reported no window size.');
  }

  // Above the width of a phone a pointer does the pressing, and a pointer is held to the floor of
  // axe, which the rule above just read. A thumb needs more, and it is only a thumb up to here.
  if (window.width > theWidthAThumbPressesAt) {
    return;
  }

  const tooSmall = found.presses
    .filter((press) => press.width < whatAThumbNeeds || press.height < whatAThumbNeeds)
    .map((press) => `${press.called} is ${press.width} by ${press.height}`);

  expect(tooSmall).toEqual([]);
});

/** Every refusal one of a set of rules made, as the sentences a person reads off a failed run. */
function refusalsAbout(refused: readonly string[], rules: readonly string[]): string[] {
  return refused.filter((refusal) => rules.some((rule) => refusal.startsWith(`${rule}:`)));
}
