import { type ColourName, type IconName } from '@emi/tokens';

import { words } from '../../language';

/**
 * The highlights: a round tile at the top of a page that opens a short page of its own. The Sex
 * page carries two and the Period page two more (issue 275). A new one is an entry in this list.
 *
 * The text is draft text, short, plain and factual, and none of it is medical advice.
 */

export type HighlightSlug =
  'intercourse' | 'learn-about-sex' | 'all-about-discharge' | 'hygiene-products';

export interface Highlight {
  readonly slug: HighlightSlug;
  readonly title: string;
  readonly icon: IconName;
  /** The fill of the round tile. */
  readonly tile: ColourName;
  /** The ink of the drawing and of the ring around the tile. */
  readonly ink: ColourName;
  /** The paragraphs of the page it opens, in order. */
  readonly paragraphs: readonly string[];
}

export const highlights: Readonly<Record<HighlightSlug, Highlight>> = {
  intercourse: {
    slug: 'intercourse',
    title: words('highlight.intercourse.title'),
    icon: 'heart',
    tile: 'accentSoft',
    ink: 'accent',
    paragraphs: [
      words('highlight.intercourse.1'),
      words('highlight.intercourse.2'),
      words('highlight.intercourse.3'),
      words('highlight.intercourse.4'),
    ],
  },
  'learn-about-sex': {
    slug: 'learn-about-sex',
    title: words('highlight.learnAboutSex.title'),
    icon: 'book',
    tile: 'washWarm',
    ink: 'ovulationInk',
    paragraphs: [
      words('highlight.learnAboutSex.1'),
      words('highlight.learnAboutSex.2'),
      words('highlight.learnAboutSex.3'),
      words('highlight.learnAboutSex.4'),
    ],
  },
  'all-about-discharge': {
    slug: 'all-about-discharge',
    title: words('highlight.allAboutDischarge.title'),
    icon: 'drop',
    tile: 'accentSoft',
    ink: 'accent',
    paragraphs: [
      words('highlight.allAboutDischarge.1'),
      words('highlight.allAboutDischarge.2'),
      words('highlight.allAboutDischarge.3'),
      words('highlight.allAboutDischarge.4'),
    ],
  },
  'hygiene-products': {
    slug: 'hygiene-products',
    title: words('highlight.hygieneProducts.title'),
    icon: 'book',
    tile: 'washWarm',
    ink: 'ovulationInk',
    paragraphs: [
      words('highlight.hygieneProducts.1'),
      words('highlight.hygieneProducts.2'),
      words('highlight.hygieneProducts.3'),
      words('highlight.hygieneProducts.4'),
    ],
  },
};

/** The highlights of the Sex page, in the order the board draws them. */
export const sexHighlights: readonly HighlightSlug[] = ['intercourse', 'learn-about-sex'];

/** The highlights of the Period page, in the order the board draws them. */
export const periodHighlights: readonly HighlightSlug[] = [
  'all-about-discharge',
  'hygiene-products',
];

/** The highlight an address names, or nothing where it names none, because she can type one. */
export function highlightFor(slug: string): Highlight | undefined {
  return Object.prototype.hasOwnProperty.call(highlights, slug)
    ? highlights[slug as HighlightSlug]
    : undefined;
}

/** The address of the page a highlight opens. */
export function highlightAddress(slug: HighlightSlug): string {
  return `/highlight/${slug}`;
}
