import { type Language, type SiteWordKey, fallbackLanguage, wordsIn } from '@/app/words';
import { LanguageSwitcher } from '@/components/languageSwitcher';
import { LANGUAGES_ANCHOR } from '@/components/siteHeader';
import {
  THE_APP_STORE_LISTING,
  THE_EMI_BETA,
  THE_EMI_CODE,
  THE_EMI_COMMUNITY,
} from '@/lib/addresses';
import { theStoreListingIsOpen } from '@/lib/theStoreListing';

/**
 * What every link in the band at the foot carries at the width of a phone: a box forty four pixels
 * tall, and six pixels of hit area on each side of the words. Wider than a phone a pointer does the
 * pressing and the words are target enough.
 *
 * The six pixels are padding that an equal negative margin pays for, so the box she presses grows
 * and nothing she looks at moves. The narrowest link of the band is a language naming itself, and
 * twelve pixels of hit area carries it past the floor in every language.
 */
export const aThumbCanHitIt =
  'phone:-mx-[6px] phone:flex phone:min-h-[44px] phone:items-center phone:px-[6px]';

export interface FooterLink {
  readonly word: SiteWordKey;
  /** A path under the language, or nothing when the press leaves the site. */
  readonly path?: string;
  /**
   * A whole address on another host, for a press of the band that does not lead to a page of this
   * site. It wins over the path, and it is what marks the press as leaving the site.
   */
  readonly outside?: string;
  /**
   * Whether the page behind it is still to be built. A press marked this way is not drawn, and it
   * comes back by taking this one line off it on the day its page ships.
   */
  readonly waitsForItsPage?: boolean;
}

export interface FooterGroup {
  readonly title: SiteWordKey;
  readonly links: readonly FooterLink[];
}

/**
 * The four groups the board puts in the band at the foot of a page, in its order: where to get the
 * application, how Emi protects her data, what she can learn, and how to reach somebody.
 *
 * Seven of the twelve presses have no page yet, so the band draws the five that lead somewhere and
 * holds the other seven here until theirs ship. The store waits for a listing rather than for a
 * page of this site: Apple opens the pre-order on 17 November 2026, and pasting the address Apple
 * gives into `THE_APP_STORE_LISTING` draws this press and the one on the home page.
 *
 * The group about learning is left with no press at all, so the band draws neither it nor its
 * heading. A heading over nothing reads as a part of the page that failed to load.
 */
export const footerGroups: readonly FooterGroup[] = [
  {
    title: 'footerEmiGroup',
    links: [
      {
        word: 'footerAppStore',
        outside: THE_APP_STORE_LISTING,
        waitsForItsPage: !theStoreListingIsOpen,
      },
      { word: 'footerBeta', outside: THE_EMI_BETA },
      { word: 'footerBuyOnTheWeb', path: 'buy/', waitsForItsPage: true },
    ],
  },
  {
    title: 'footerPrivacyGroup',
    links: [
      { word: 'footerHowEmiProtects', path: 'privacy/' },
      { word: 'footerOpenCode', outside: THE_EMI_CODE },
      { word: 'footerTransparency', path: 'pulse/', waitsForItsPage: true },
    ],
  },
  {
    title: 'footerLearnGroup',
    links: [
      { word: 'footerCalculator', path: 'calculator/', waitsForItsPage: true },
      { word: 'footerGuides', path: 'calculator/', waitsForItsPage: true },
      { word: 'footerPulse', path: 'pulse/', waitsForItsPage: true },
    ],
  },
  {
    title: 'footerHelpGroup',
    links: [
      { word: 'footerSupport', path: 'support/' },
      { word: 'footerCommunity', outside: THE_EMI_COMMUNITY },
      { word: 'footerAccount', path: 'sign-in/', waitsForItsPage: true },
    ],
  },
];

/**
 * The press to the terms, which the band draws beside the privacy policy at the end. It waits for
 * its page like the eight above, and it comes back by taking this one line off it.
 */
export const theTerms: FooterLink = { word: 'footerTerms', path: 'terms/', waitsForItsPage: true };

/**
 * Where one press of the band takes her: an address off this site, or a path under the language she
 * is reading.
 *
 * A press with neither has nowhere to go. It refuses by name rather than falling back to the home
 * page, because a press that does nothing she can see is how a reader decides the software is
 * unfinished, and a silent fallback would draw exactly that.
 */
export function theAddressOfAPress(
  language: Language,
  { word, path, outside }: FooterLink,
): string {
  if (outside !== undefined && outside !== '') {
    return outside;
  }

  if (path !== undefined) {
    return `/${language}/${path}`;
  }

  throw new Error(`The press called ${word} in the band at the foot has no address.`);
}

/** Every group the band draws, which is every group left with a press a reader can follow. */
export function theGroupsOfTheBand(): readonly FooterGroup[] {
  return footerGroups
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => link.waitsForItsPage !== true),
    }))
    .filter((group) => group.links.length > 0);
}

/**
 * The band at the foot of every page, from `docs/design/website/home-v2/boards/Footer.dc.html`.
 *
 * It opens with what Emi is not, because a page that asks for money and does not say that is a page
 * nobody stands behind. The sentence is one of the approved denials of
 * `tools/pipeline/forbiddenClaims.ts` and it is the board's own words, so the gate and the design
 * agree and neither has to be bent for the other.
 *
 * A press whose page does not exist yet is not drawn. Five presses are left: the beta and the code
 * on Apple's host and on GitHub, the page that explains the encryption, the support page, and the
 * community chat.
 *
 * The legal line at the end is the one place the board underlines a link, and it is where a reader
 * looks for the terms she is agreeing to. Every other link on the site carries no decoration.
 */
export function SiteFooter({ language = fallbackLanguage }: { language?: Language }) {
  const words = wordsIn(language);
  const addressOf = (link: FooterLink): string => theAddressOfAPress(language, link);

  return (
    <footer className="w-full bg-siteFooterGround font-text text-body-sm text-siteQuietText">
      <div className="mx-auto flex max-w-[1024px] flex-col gap-spaceLg px-spaceXl pt-spaceXl pb-[32px]">
        <p className="border-b-hairline border-b-siteLine pb-spaceLg">{words.footerDisclaimer}</p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-spaceXl">
          {theGroupsOfTheBand().map((group) => (
            <nav
              aria-label={words[group.title]}
              className="flex flex-col gap-spaceMd"
              key={group.title}
            >
              <span className="font-semibold text-siteText">{words[group.title]}</span>
              {group.links.map((link) => (
                <a
                  className={`text-siteQuietText no-underline ${aThumbCanHitIt}`}
                  href={addressOf(link)}
                  key={link.word}
                  rel={link.outside === undefined ? undefined : 'noopener'}
                >
                  {words[link.word]}
                </a>
              ))}
            </nav>
          ))}
        </div>
        <div className="flex flex-wrap justify-between gap-x-spaceXl gap-y-spaceSm border-t-hairline border-t-siteLine pt-spaceLg">
          <span>{words.footerCopyright}</span>
          <span className="flex flex-wrap gap-x-spaceLg gap-y-spaceMd" id={LANGUAGES_ANCHOR}>
            <a
              className={`text-siteQuietText underline ${aThumbCanHitIt}`}
              href={`/${language}/privacy-policy/`}
            >
              {words.footerPrivacyPolicy}
            </a>
            {theTerms.waitsForItsPage === true ? null : (
              <a
                className={`text-siteQuietText underline ${aThumbCanHitIt}`}
                href={addressOf(theTerms)}
              >
                {words[theTerms.word]}
              </a>
            )}
            <LanguageSwitcher language={language} />
          </span>
        </div>
      </div>
    </footer>
  );
}
