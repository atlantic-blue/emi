import { websitePhoneWidth } from '@emi/tokens';

/**
 * What a page of myemi.app is held to when a browser reads it for the woman rather than for a
 * test: can she read the words, can she tell what each press does, and can she hit it.
 *
 * The values sit here because two runners read them. A browser reads them to hold a real page,
 * and the behaviour tier reads them in node to say which rules a page is held to at all. The
 * module imports nothing of the browser suite, so the node runner can read it.
 */

/**
 * The four rules of axe this site is held to. Contrast and the two name rules are on by default.
 * Target size is off by default in axe, so the run names all four rather than taking the default
 * set, and naming a rule turns it on.
 */
export const theRulesSheIsHeldTo = [
  'color-contrast',
  'button-name',
  'link-name',
  'target-size',
] as const;

/** What a word has to carry against the ground behind it. */
export const theContrastAWordNeeds = 4.5;

/** What a large word has to carry, which is less because the shape is easier to read. */
export const theContrastALargeWordNeeds = 3;

/** Where large starts, in points, which is 24 pixels at the size a browser draws a point. */
export const whereALargeWordStarts = 18;

/**
 * How big a press has to be where a thumb does the pressing, on both axes. A thumb covers about
 * this much of the glass, so a press under it is a press she misses and then hits something else.
 */
export const whatAThumbNeeds = 44;

/**
 * The width up to which a thumb does the pressing, which is the phone the design system draws
 * for. Above it a pointer does the pressing, and a pointer is held to the floor of axe instead.
 */
export const theWidthAThumbPressesAt = websitePhoneWidth;

/**
 * What axe holds every press to at every width, on its own rules: this much on each axis, or this
 * much clear space around a press that is smaller. It is the floor of the accessibility
 * guidelines, and it is weaker than a thumb needs, which is why the floor above exists.
 */
export const whatAPointerNeeds = 24;

/**
 * The four addresses the rules are read on. The three languages, because a rule that holds in
 * English and fails in Russian is a rule that holds for a third of her, and the address nobody
 * has, because that page is where a reader who mistyped the address lands and it is drawn by
 * another file.
 */
export const everyPageSheReaches = ['/en/', '/ru/', '/es/', '/en/nothing/'] as const;
