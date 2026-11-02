import { type Language, type SiteWordKey, fallbackLanguage, wordsIn } from '@/app/words';
import { EmiIcon } from '@/components/emiIcon';

/**
 * The file the site serves the mark from. It is the icon the community chose in issue 331, the one
 * the application ships as `apps/mobile/assets/icon/emi-icon.svg`, and the one the approved board
 * draws. The band below draws the same outlines inside the page, and the scenario of step 26.19
 * reads the copy against the file, so the drawing at the top of a page cannot drift from the drawing
 * on her home screen.
 *
 * The file is served as well as drawn, because a reader who saves the page, a store listing and a
 * link somebody shares all ask for the mark by name.
 */
export const ICON_FILE = '/emi-icon.svg';

/** The address the three language links in the band at the foot of the page sit at. */
export const LANGUAGES_ANCHOR = 'site-languages';

/**
 * The six ways into the product, in the order the board puts them, each with the path it sits at
 * under the language. A page that does not exist yet answers 404 with the Emi page, which is what
 * `app/[lang]/[...rest]` is for, so a link here is never a dead end outside the site.
 */
export const mainLinks: readonly { readonly word: SiteWordKey; readonly path: string }[] = [
  { word: 'headerEmi', path: '' },
  { word: 'headerPrivacy', path: 'privacy/' },
  { word: 'headerCalculator', path: 'calculator/' },
  { word: 'headerPulse', path: 'pulse/' },
  { word: 'headerBuy', path: 'buy/' },
  { word: 'headerSupport', path: 'support/' },
];

/** How each language names itself in two letters, which is all the band has room for. */
const shortNameOf: Readonly<Record<Language, string>> = { en: 'EN', ru: 'RU', es: 'ES' };

/**
 * The band at the top of every page, from `docs/design/website/home-v2/boards/Header.dc.html`.
 *
 * At the width of a phone the six links are not drawn and the menu button is, because six links
 * across a phone are six links she cannot read. The width is `websitePhoneWidth` in the token
 * package and the theme names it `phone`.
 *
 * The language link points at the three language links in the band at the foot of the page. The site
 * ships no script of its own, so a control that opened a list would open nothing, and a link to the
 * list that is already on the page works before anything has loaded.
 */
export function SiteHeader({ language = fallbackLanguage }: { language?: Language }) {
  const words = wordsIn(language);
  const under = (path: string): string => `/${language}/${path}`;

  return (
    <header className="w-full border-b-hairline border-b-siteHeaderLine bg-siteGround/85 font-text text-siteText">
      <div className="mx-auto flex min-h-[48px] max-w-[1024px] flex-wrap items-center justify-between gap-x-spaceXl px-spaceXl">
        <a
          aria-label={words.headerHomeLabel}
          // The mark is thirty two pixels wide, so eight pixels of hit area on each side carries the
          // way home past the floor a thumb needs. The padding is paid for by an equal negative
          // margin, so the box she presses grows and the mark stays where it was drawn.
          className="flex min-h-[44px] items-center phone:-mx-[8px] phone:px-[8px]"
          href={under('')}
        >
          {/* The corner is on the wrapper rather than on the drawing, so the drawing stays the file
              the application ships and the test can hold the two together. */}
          <span className="block h-[32px] w-[32px] overflow-hidden rounded-[7px]">
            <EmiIcon className="h-full w-full" />
          </span>
        </a>
        <nav
          aria-label={words.headerMainLabel}
          className="flex flex-1 flex-wrap items-center justify-center gap-x-marginMd phone:hidden"
        >
          {mainLinks.map(({ word, path }) => (
            <a
              className="text-body-sm leading-[44px] text-siteText no-underline"
              href={under(path)}
              key={word}
            >
              {words[word]}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-spaceLg">
          <a
            aria-label={words.headerLanguageLabel}
            // Two letters are nineteen pixels wide, and fourteen pixels of hit area on each side
            // carries them past the floor. The negative margin pays for the padding, so the two
            // presses beside this one stay where the board drew them.
            className="text-body-sm leading-[44px] text-siteQuietText no-underline phone:-mx-[14px] phone:px-[14px]"
            href={`#${LANGUAGES_ANCHOR}`}
          >
            {shortNameOf[language]}
          </a>
          <button
            aria-label={words.headerMenuLabel}
            className="hidden h-[44px] w-[44px] items-center justify-center phone:flex"
            type="button"
          >
            <svg
              aria-hidden="true"
              fill="none"
              height="20"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
              width="20"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <a
            aria-label={words.headerSignInLabel}
            className="flex h-[44px] w-[44px] items-center justify-center text-siteText"
            href={under('sign-in/')}
          >
            <svg
              aria-hidden="true"
              fill="none"
              height="18"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
              width="18"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
