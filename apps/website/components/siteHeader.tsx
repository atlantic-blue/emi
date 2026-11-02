import { type Language, type SiteWordKey, fallbackLanguage } from '@/app/words';
import { EmiWordmark } from '@/components/emiWordmark';
import { LanguageSwitcher } from '@/components/languageSwitcher';

/**
 * The file the site serves the mark from. It is the drawing in `brand/logo/emi-wordmark.svg`, and
 * `test/wordmark.test.tsx` reads the two files against each other, so the one a browser asks for
 * cannot drift from the one the brand generates.
 */
export const WORDMARK_FILE = '/emi-wordmark.svg';

/** The size the drawing is made at. The same test reads these two against its own canvas. */
export const WORDMARK_UNITS = { width: 3002, height: 1879 } as const;

/** The file the site serves the mark from once the band draws the approved icon. */
export const ICON_FILE = '/emi-icon.svg';

/** The address the three language links in the band at the foot of the page sit at. */
export const LANGUAGES_ANCHOR = 'site-languages';

/** The six ways into the product, each with the path it sits at under the language. */
export const mainLinks: readonly { readonly word: SiteWordKey; readonly path: string }[] = [
  { word: 'headerEmi', path: '' },
  { word: 'headerPrivacy', path: 'privacy/' },
  { word: 'headerCalculator', path: 'calculator/' },
  { word: 'headerPulse', path: 'pulse/' },
  { word: 'headerBuy', path: 'buy/' },
  { word: 'headerSupport', path: 'support/' },
];

/**
 * A thin band at the top of every page, carrying the mark and the language she reads in. The mark
 * is drawn inside the page: the content security policy of this site names a secret for a style,
 * a style written on an element cannot carry one, and an element carrying a picture writes one on
 * itself. So the drawing travels in the markup, which also costs her browser one request fewer.
 *
 * The page a woman reaches by accident has no language in its address, so the band takes the
 * fallback there and the switcher still offers her the three.
 */
export function SiteHeader({ language = fallbackLanguage }: { language?: Language }) {
  return (
    <header className="flex items-center justify-between bg-ground px-margin py-spaceMd">
      <a className="inline-flex items-center" href="/">
        <EmiWordmark className="h-spaceXl w-auto" />
      </a>
      <LanguageSwitcher language={language} />
    </header>
  );
}
