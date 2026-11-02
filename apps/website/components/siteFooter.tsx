import { type Language, type SiteWordKey, fallbackLanguage, wordsIn } from '@/app/words';
import { LanguageSwitcher } from '@/components/languageSwitcher';
import { LANGUAGES_ANCHOR } from '@/components/siteHeader';
import { NO_PAGE_YET } from '@/lib/addresses';

interface FooterLink {
  readonly word: SiteWordKey;
  /** A path under the language, or nothing when no page exists for it anywhere yet. */
  readonly path?: string;
}

interface FooterGroup {
  readonly title: SiteWordKey;
  readonly links: readonly FooterLink[];
}

/**
 * The four groups the board puts in the band at the foot of a page, in its order: where to get the
 * application, how Emi protects her data, what she can learn, and how to reach somebody.
 */
export const footerGroups: readonly FooterGroup[] = [
  {
    title: 'footerEmiGroup',
    links: [
      { word: 'footerAppStore' },
      { word: 'footerBeta' },
      { word: 'footerBuyOnTheWeb', path: 'buy/' },
    ],
  },
  {
    title: 'footerPrivacyGroup',
    links: [
      { word: 'footerHowEmiProtects', path: 'privacy/' },
      { word: 'footerOpenCode' },
      { word: 'footerTransparency', path: 'pulse/' },
    ],
  },
  {
    title: 'footerLearnGroup',
    links: [
      { word: 'footerCalculator', path: 'calculator/' },
      { word: 'footerGuides', path: 'calculator/' },
      { word: 'footerPulse', path: 'pulse/' },
    ],
  },
  {
    title: 'footerHelpGroup',
    links: [
      { word: 'footerSupport', path: 'support/' },
      { word: 'footerCommunity' },
      { word: 'footerAccount', path: 'sign-in/' },
    ],
  },
];

/**
 * The band at the foot of every page, from `docs/design/website/home-v2/boards/Footer.dc.html`.
 *
 * It opens with what Emi is not, because a page that asks for money and does not say that is a page
 * nobody stands behind. The sentence is one of the approved denials of
 * `tools/pipeline/forbiddenClaims.ts` and it is the board's own words, so the gate and the design
 * agree and neither has to be bent for the other.
 *
 * Three links have no page anywhere yet, in or out of this site, so they point at the home page
 * rather than at a guess at an address somebody else will give them.
 */
export function SiteFooter({ language = fallbackLanguage }: { language?: Language }) {
  const words = wordsIn(language);
  const addressOf = ({ path }: FooterLink): string =>
    path === undefined ? NO_PAGE_YET : `/${language}/${path}`;

  return (
    <footer className="w-full bg-siteFooterGround font-text text-body-sm text-siteQuietText">
      <div className="mx-auto flex max-w-[1024px] flex-col gap-spaceLg px-spaceXl pt-spaceXl pb-[32px]">
        <p className="border-hairline border-b border-siteLine pb-spaceLg">
          {words.footerDisclaimer}
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-spaceXl">
          {footerGroups.map((group) => (
            <nav
              aria-label={words[group.title]}
              className="flex flex-col gap-spaceMd"
              key={group.title}
            >
              <span className="font-semibold text-siteText">{words[group.title]}</span>
              {group.links.map((link) => (
                <a
                  className="text-siteQuietText no-underline"
                  href={addressOf(link)}
                  key={link.word}
                >
                  {words[link.word]}
                </a>
              ))}
            </nav>
          ))}
        </div>
        <div className="flex flex-wrap justify-between gap-x-spaceXl gap-y-spaceSm border-hairline border-t border-siteLine pt-spaceLg">
          <span>{words.footerCopyright}</span>
          <span className="flex flex-wrap gap-x-spaceLg gap-y-spaceMd" id={LANGUAGES_ANCHOR}>
            <a className="text-siteQuietText no-underline" href={`/${language}/privacy-policy/`}>
              {words.footerPrivacyPolicy}
            </a>
            <a className="text-siteQuietText no-underline" href={`/${language}/terms/`}>
              {words.footerTerms}
            </a>
            <LanguageSwitcher language={language} />
          </span>
        </div>
      </div>
    </footer>
  );
}
