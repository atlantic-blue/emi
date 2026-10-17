import { type ColourName, type IconName } from '@emi/tokens';

import { words } from '../../language';
import { hygieneAddress } from '../hygiene/products';

/**
 * The highlights: a round tile at the top of a page that opens a short page of its own. The Sex
 * page carries two and the Period page two more (issue 275). A new one is an entry in this list.
 *
 * Three of them open a few paragraphs. Hygiene products opens a page of its own, with a page for
 * each product (issue 304).
 *
 * The text is draft text, short, plain and factual, and none of it is medical advice.
 */

/** The highlights that open a few paragraphs. */
export type ReadingSlug = 'intercourse' | 'learn-about-sex' | 'all-about-discharge';

export type HighlightSlug = ReadingSlug | 'hygiene-products';

export interface Highlight {
  readonly slug: HighlightSlug;
  readonly title: string;
  readonly icon: IconName;
  /** The fill of the round tile. */
  readonly tile: ColourName;
  /** The ink of the drawing and of the ring around the tile. */
  readonly ink: ColourName;
}

export interface Reading extends Highlight {
  /** The paragraphs of the page it opens, in order. */
  readonly paragraphs: readonly string[];
}

export const readings: Readonly<Record<ReadingSlug, Reading>> = {
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
};

export const highlights: Readonly<Record<HighlightSlug, Highlight>> = {
  ...readings,
  'hygiene-products': {
    slug: 'hygiene-products',
    title: words('highlight.hygieneProducts.title'),
    icon: 'book',
    tile: 'washWarm',
    ink: 'ovulationInk',
  },
};

/** The highlights of the Sex page, in the order the board draws them. */
export const sexHighlights: readonly HighlightSlug[] = ['intercourse', 'learn-about-sex'];

/** The highlights of the Period page, in the order the board draws them. */
export const periodHighlights: readonly HighlightSlug[] = [
  'all-about-discharge',
  'hygiene-products',
];

/** The reading an address names, or nothing where it names none, because she can type one. */
export function highlightFor(slug: string): Reading | undefined {
  return Object.prototype.hasOwnProperty.call(readings, slug)
    ? readings[slug as ReadingSlug]
    : undefined;
}

/** The address of the page a highlight opens. */
export function highlightAddress(slug: HighlightSlug): string {
  return slug === 'hygiene-products' ? hygieneAddress : `/highlight/${slug}`;
}
