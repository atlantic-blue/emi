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

/** Every value the board paints myemi.app in. */
export type WebsiteColourName =
  | 'siteGround'
  | 'siteCard'
  | 'siteTint'
  | 'siteTintDeep'
  | 'siteNight'
  | 'siteBlack'
  | 'siteFooterGround'
  | 'siteLine'
  | 'siteHeaderLine'
  | 'siteTintLine'
  | 'siteControlLine'
  | 'siteShadow'
  | 'siteFaintShadow'
  | 'siteText'
  | 'siteQuietText'
  | 'siteAccent'
  | 'siteSlider'
  | 'siteNightAccent'
  | 'siteNightQuietText'
  | 'sitePeriodInk'
  | 'siteFollicularInk'
  | 'siteOvulationInk'
  | 'siteLutealInk';

/**
 * What a colour of the site is allowed to do, in the words `colour.ts` uses, and one more. A
 * browser draws a range control in a colour of its own choosing unless it is told which, and that
 * colour is neither a ground, nor a word, nor a rule.
 */
export type WebsiteColourRole = 'ground' | 'text' | 'line' | 'control';

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
  'siteCard',
  'siteTint',
  'siteTintDeep',
  'siteNight',
  'siteBlack',
  'siteFooterGround',
  'siteLine',
  'siteHeaderLine',
  'siteTintLine',
  'siteControlLine',
  'siteShadow',
  'siteFaintShadow',
  'siteText',
  'siteQuietText',
  'siteAccent',
  'siteSlider',
  'siteNightAccent',
  'siteNightQuietText',
  'sitePeriodInk',
  'siteFollicularInk',
  'siteOvulationInk',
  'siteLutealInk',
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
  /** A card lifted off the paper, and the ground Apple's own press is drawn on. */
  siteCard: {
    value: '#FFFFFF',
    roles: ['ground', 'text'],
    textOn: ['siteBlack'],
  },
  /** The tinted band, and the card inside a plain one. */
  siteTint: {
    value: '#FBF2EE',
    roles: ['ground'],
    textOn: [],
  },
  /** The deeper tint the price sits on, and the words of the dark band. */
  siteTintDeep: {
    value: '#F8EFEB',
    roles: ['ground', 'text'],
    textOn: ['siteNight'],
  },
  /** The two dark bands: where she is asked to join, and where she is asked to install. */
  siteNight: {
    value: '#342F2D',
    roles: ['ground'],
    textOn: [],
  },
  /** Apple's own press, which is Apple's colour and not Emi's. */
  siteBlack: {
    value: '#000000',
    roles: ['ground', 'text'],
    textOn: ['siteCard'],
  },
  /** The quieter paper under the band at the foot of a page. */
  siteFooterGround: {
    value: '#F5ECE8',
    roles: ['ground'],
    textOn: [],
  },
  /** The two rules inside the band at the foot of a page. */
  siteLine: {
    value: '#DCC1B9',
    roles: ['line'],
    textOn: [],
  },
  /**
   * The rule under the band at the top, which the board paints at six tenths of the rule in the
   * band at the foot. It is a value of its own rather than the one above at six tenths, because
   * the band it sits under is itself part transparent and the two are read together.
   */
  siteHeaderLine: {
    value: 'rgba(220, 193, 185, 0.6)',
    roles: ['line'],
    textOn: [],
  },
  /** The rule between two rows of a card, which is quieter than a rule between two bands. */
  siteTintLine: {
    value: '#EFE6E3',
    roles: ['line'],
    textOn: [],
  },
  /**
   * The edge of a control a reader can press: the three buttons that move a carousel. It is darker
   * than every other rule of the site, because a rule between two bands only has to be seen and
   * the edge of a button has to say where the button ends.
   */
  siteControlLine: {
    value: '#89726C',
    roles: ['line'],
    textOn: [],
  },
  /**
   * What the screenshot of the application casts on the page behind it. It is the colour the words
   * are set in, carried at a quarter, and it is written out rather than asked for as a quarter of
   * that colour because a browser mixes those two in a space that gives a slightly different value
   * back.
   */
  siteShadow: {
    value: 'rgba(31, 27, 25, 0.25)',
    roles: ['line'],
    textOn: [],
  },
  /**
   * The same cast, a fifth as strong, under the screenshot on the page that explains the
   * encryption. That board lifts the picture off the paper by a few pixels rather than standing it
   * on the page, so the two are two values rather than one value at two distances.
   */
  siteFaintShadow: {
    value: 'rgba(31, 27, 25, 0.05)',
    roles: ['line'],
    textOn: [],
  },
  /** Every word of the site a reader is meant to read first. */
  siteText: {
    value: '#1F1B19',
    roles: ['text'],
    textOn: ['siteGround', 'siteCard', 'siteTint', 'siteTintDeep', 'siteFooterGround'],
  },
  /** A label, a link in the foot of a page, and the quieter half of a line. */
  siteQuietText: {
    value: '#56423D',
    roles: ['text'],
    textOn: ['siteGround', 'siteCard', 'siteTint', 'siteTintDeep', 'siteFooterGround'],
  },
  /** The colour a link acts in, and the small label standing over a section. */
  siteAccent: {
    value: '#843117',
    roles: ['text'],
    textOn: ['siteGround', 'siteCard', 'siteTint', 'siteTintDeep'],
  },
  /** The colour a browser draws the slider of the ring in. */
  siteSlider: {
    value: '#A3482C',
    roles: ['control'],
    textOn: [],
  },
  /** The label and the link inside a dark band, where the acting colour would disappear. */
  siteNightAccent: {
    value: '#FFB59F',
    roles: ['text'],
    textOn: ['siteNight'],
  },
  /** The quieter half of a line inside a dark band. */
  siteNightQuietText: {
    value: '#CCC5BE',
    roles: ['text'],
    textOn: ['siteNight'],
  },
  /**
   * The four phases, as the label over each guide. They are darker than the four the ring is drawn
   * in, because a word has to be read and a band of colour only has to be seen. The board uses the
   * first of them for a link a reader is standing on as well.
   */
  sitePeriodInk: {
    value: '#5C2018',
    roles: ['text'],
    textOn: ['siteCard'],
  },
  siteFollicularInk: {
    value: '#5E3B10',
    roles: ['text'],
    textOn: ['siteCard'],
  },
  siteOvulationInk: {
    value: '#404218',
    roles: ['text'],
    textOn: ['siteCard'],
  },
  siteLutealInk: {
    value: '#433246',
    roles: ['text'],
    textOn: ['siteCard'],
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

/** The four roles the boards give a face, under the names the theme of the site reads. */
export type WebsiteFaceName = 'display' | 'text' | 'data' | 'serif';

/**
 * The family the site serves for each role. Running text is a humanist sans, a small label over a
 * section is monospaced so the letters hold their place, and a heading is a grotesque.
 *
 * A heading names the family the board reaches for on a machine that holds none of Apple's own:
 * `websiteFaceStack` below holds the whole list, in the board's order.
 */
export const websiteFace: Readonly<Record<WebsiteFaceName, string>> = {
  display: 'Inter',
  text: 'Plus Jakarta Sans',
  data: 'JetBrains Mono',
  serif: 'Newsreader',
};

/**
 * Every family a role names, in the order the board writes them, with the served family somewhere
 * inside the list rather than always at its head.
 *
 * A heading on a Mac is drawn in Apple's own interface face, which the board asks for first and
 * which no licence lets Emi ship. The served family stands behind it, and draws the heading on
 * every machine that has none of the three above it, which is every machine the pipeline runs on.
 * A face a machine already holds asks nobody for a file, so naming one first costs no privacy.
 *
 * The serif names the served family first, because the board does: it is the whole point of that
 * board's headings, and Georgia behind it is only there for a machine that fetched nothing.
 */
export const websiteFaceStack: Readonly<Record<WebsiteFaceName, readonly string[]>> = {
  display: [
    '-apple-system',
    'BlinkMacSystemFont',
    'SF Pro Display',
    websiteFace.display,
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ],
  text: [websiteFace.text, 'system-ui', 'sans-serif'],
  data: [websiteFace.data, 'ui-monospace', 'monospace'],
  serif: [websiteFace.serif, 'Georgia', 'serif'],
};

/** One file of one family, at the weight the board asks that file for. */
export interface WebsiteFontCut {
  readonly name: string;
  readonly weight: 400 | 500 | 600;
  readonly format: 'ttf' | 'woff2';
}

/**
 * The seven files the site serves, under the role each one carries. They are the files the boards
 * themselves name in `docs/design/website/home-v2/render/MainV2.html` and in
 * `docs/design/website/protection/render/Protection.html`, so a page of the site measures the same
 * as the design it was drawn from.
 *
 * The two serif cuts arrived with the second board. One page of the site draws them, so a reader
 * who never opens that page fetches neither: a browser asks for a face when a glyph needs it.
 *
 * The two cuts of the heading face are the board's own two files rather than the same family from
 * a font service. The service builds that family from one variable file of another release, and it
 * draws a heading wider or narrower than the board draws it: at 32 px and weight 600 the two
 * disagree by 9 px over 57 characters, which moves a word onto the next line and lengthens the
 * whole page.
 */
export const websiteFontCuts: Readonly<Record<WebsiteFaceName, readonly WebsiteFontCut[]>> = {
  display: [
    { name: 'Inter-400', weight: 400, format: 'woff2' },
    { name: 'Inter-600', weight: 600, format: 'woff2' },
  ],
  text: [
    { name: 'PlusJakartaSans-Regular', weight: 400, format: 'ttf' },
    { name: 'PlusJakartaSans-SemiBold', weight: 600, format: 'ttf' },
  ],
  data: [{ name: 'JetBrainsMono-Medium', weight: 500, format: 'ttf' }],
  serif: [
    { name: 'Newsreader16pt-Regular', weight: 400, format: 'ttf' },
    { name: 'Newsreader16pt-Medium', weight: 500, format: 'ttf' },
  ],
};

/** The roles as data, in the order a page reads them. */
export const websiteFaceNames: readonly WebsiteFaceName[] = ['display', 'text', 'data', 'serif'];

/**
 * Where the site keeps those files, from the root of the repository. The site serves its own faces,
 * which is contract SITE-4: a face fetched from another company tells that company a woman opened
 * a page about periods.
 */
export const websiteFontsRoot = 'apps/website/assets/fonts';

/** The name of one file on disk, under `websiteFontsRoot`. */
export function websiteFontFile(cut: WebsiteFontCut): string {
  return `${cut.name}.${cut.format}`;
}

/**
 * The one width the board changes the shape of a band at, in pixels. At this width and narrower the
 * six ways into the product fold into one button, because six links across a phone are six links
 * she cannot read. It is a design value rather than a breakpoint of a framework, so it lives here
 * and the theme of the site names it `phone`.
 */
export const websitePhoneWidth = 640;

/**
 * The second width the board changes the shape of a band at, in pixels. At this width and narrower
 * the row of reviews drops from three cards to two, and the one it drops is the one a reader at
 * this width would only see half of.
 */
export const websiteTabletWidth = 1023;

/**
 * How long one card of a carousel stands before the next one takes its place, in milliseconds.
 *
 * Both carousels of the home page move on this one wait, together, because two waits running next
 * to each other put two things in motion at two different moments and a reader cannot read either.
 */
export const websiteCarouselWait = 7000;

/**
 * The colours another company fixes for its own sign in press, and the names the theme of the site
 * gives them.
 *
 * They are not the palette of Emi and nothing of Emi is painted in them. Each one is the value the
 * company publishes for its own mark, and the approved board draws the press in those values, so a
 * press in the palette of Emi would be a press that company does not allow.
 *
 * They are kept apart from `websiteColours` for that reason: a value in the palette is a value any
 * band of the site may use, and these may be used by one press each. A colour written into a page
 * is a colour nobody measured, which is why they are here rather than in the page that draws them.
 *
 * Apple asks for its own mark in white on black. Those two are `siteCard` and `siteBlack` of the
 * palette already, so Apple's press needs nothing of its own.
 */
export const websiteMarkColour = {
  /** The rule around Google's press. */
  markGoogleLine: '#747775',
  /** The words on Google's press. */
  markGoogleText: '#1F1F1F',
  /** The four quarters of Google's own mark, in the order the mark draws them. */
  markGoogleRed: '#EA4335',
  markGoogleBlue: '#4285F4',
  markGoogleYellow: '#FBBC05',
  markGoogleGreen: '#34A853',
} as const;

/** One colour of another company's mark, by the name the theme gives it. */
export type WebsiteMarkColourName = keyof typeof websiteMarkColour;

/** The names as data, so a rule can read every one of them. */
export const websiteMarkColourNames: readonly WebsiteMarkColourName[] = Object.keys(
  websiteMarkColour,
) as WebsiteMarkColourName[];
