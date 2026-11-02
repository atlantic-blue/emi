/**
 * The palette and the faces of myemi.app, from the board the operator approved on 2026-09-28:
 * `docs/design/website/home-v2/boards/`. The site is a different surface from the phone and the
 * board paints it in different values, so they are a second set rather than an edit of the first.
 * The phone's own palette is in `colour.ts` and nothing here changes it.
 *
 * Every name starts with `site`, because the theme of the website puts both sets into one flat
 * namespace and Tailwind would otherwise answer `bg-ground` with whichever of the two was written
 * last.
 */

/** The five values the header and the footer of the board are drawn in. */
export type WebsiteColourName =
  'siteGround' | 'siteFooterGround' | 'siteLine' | 'siteText' | 'siteQuietText';

/** What a colour of the site is allowed to do, in the words `colour.ts` uses. */
export type WebsiteColourRole = 'ground' | 'text' | 'line';

/**
 * A value and the rules that travel with it, in the shape `colour.ts` uses: a value on its own
 * would let a band put any colour on any ground, which is the drift contract TOKEN-2 exists to
 * catch.
 */
export interface WebsiteColourToken {
  readonly value: string;
  readonly roles: readonly WebsiteColourRole[];
  /** The grounds this colour is measured against and approved to carry text on. */
  readonly textOn: readonly WebsiteColourName[];
}

const ALL: readonly WebsiteColourName[] = [
  'siteGround',
  'siteFooterGround',
  'siteLine',
  'siteText',
  'siteQuietText',
];

/**
 * The palette, every value the board's own. Each `textOn` entry is measured at or above the floor
 * by `apps/website/test/theme.test.ts`, which is where the site's own pairs are read.
 */
export const websiteColours: Readonly<Record<WebsiteColourName, WebsiteColourToken>> = {
  /** The warm paper the pages of the site sit on. */
  siteGround: {
    value: '#FFF8F5',
    roles: ['ground'],
    textOn: [],
  },
  /** The quieter paper under the band at the foot of a page. */
  siteFooterGround: {
    value: '#F5ECE8',
    roles: ['ground'],
    textOn: [],
  },
  /** The hairline under the band at the top, and the two rules inside the band at the foot. */
  siteLine: {
    value: '#DCC1B9',
    roles: ['line'],
    textOn: [],
  },
  /** Every word of the site a reader is meant to read first. */
  siteText: {
    value: '#1F1B19',
    roles: ['text'],
    textOn: ['siteGround', 'siteFooterGround'],
  },
  /** A label, a link in the foot of a page, and the quieter half of a line. */
  siteQuietText: {
    value: '#56423D',
    roles: ['text'],
    textOn: ['siteGround', 'siteFooterGround'],
  },
};

/** The palette as data. A type cannot be read at run time. */
export const websiteColourNames: readonly WebsiteColourName[] = ALL;

function valuesOf(): Record<WebsiteColourName, string> {
  const flat = {} as Record<WebsiteColourName, string>;
  for (const name of ALL) {
    flat[name] = websiteColours[name].value;
  }
  return flat;
}

/** The value of every colour of the site, for a theme that wants the string and nothing else. */
export const websiteColour: Readonly<Record<WebsiteColourName, string>> = valuesOf();

/** The three roles the board gives a face, under the names the theme of the site reads. */
export type WebsiteFaceName = 'display' | 'text' | 'data';

/**
 * The three families the board sets its words in. A heading is a serif, running text is a humanist
 * sans, and a small label over a section is monospaced so the letters hold their place.
 */
export const websiteFace: Readonly<Record<WebsiteFaceName, string>> = {
  display: 'Newsreader',
  text: 'Plus Jakarta Sans',
  data: 'JetBrains Mono',
};

/** One file of one family, at the weight the board asks that file for. */
export interface WebsiteFontCut {
  readonly name: string;
  readonly weight: 400 | 500 | 600;
}

/**
 * The five files the site serves, under the role each one carries. They are the files the board
 * itself names in `docs/design/website/home-v2/render/MainV2.html`, so a page of the site measures
 * the same as the design it was drawn from.
 */
export const websiteFontCuts: Readonly<Record<WebsiteFaceName, readonly WebsiteFontCut[]>> = {
  display: [
    { name: 'Newsreader16pt-Regular', weight: 400 },
    { name: 'Newsreader16pt-Medium', weight: 500 },
  ],
  text: [
    { name: 'PlusJakartaSans-Regular', weight: 400 },
    { name: 'PlusJakartaSans-SemiBold', weight: 600 },
  ],
  data: [{ name: 'JetBrainsMono-Medium', weight: 500 }],
};

/** The roles as data, in the order a page reads them. */
export const websiteFaceNames: readonly WebsiteFaceName[] = ['display', 'text', 'data'];

/**
 * Where the site keeps those files, from the root of the repository. The site serves its own faces,
 * which is contract SITE-4: a face fetched from another company tells that company a woman opened
 * a page about periods.
 */
export const websiteFontsRoot = 'apps/website/assets/fonts';

/** The name of one file on disk, under `websiteFontsRoot`. */
export function websiteFontFile(cut: WebsiteFontCut): string {
  return `${cut.name}.ttf`;
}

/**
 * The one width the board changes the shape of a band at, in pixels. At this width and narrower the
 * six ways into the product fold into one button, because six links across a phone are six links
 * she cannot read. It is a design value rather than a breakpoint of a framework, so it lives here
 * and the theme of the site names it `phone`.
 */
export const websitePhoneWidth = 640;
