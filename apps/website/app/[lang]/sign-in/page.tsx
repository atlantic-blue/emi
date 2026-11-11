import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { type SiteWordKey, type SiteWords, isLanguage, wordsIn } from '@/app/words';
import { EmiIcon } from '@/components/emiIcon';
import { TheSignInForm } from '@/components/theSignInForm';
import { TheWaysSheCanSignIn } from '@/components/theWaysSheCanSignIn';
import { theLinksOf } from '@/lib/theAddressesOfAPage';

/**
 * The page a woman signs in on, in the language her address names. It is laid out as the board the
 * operator approved lays it out, `docs/design/website/sign-in/boards/SignIn.dc.html`: the band at
 * the top, the mark, the title, the line under it, the ways in, and the two sentences that say
 * what the account is for.
 *
 * The board offers four ways in and the page draws all four: Apple, Google, Telegram and the code
 * sent to her email address. Telegram leaves for Telegram rather than for the pool, because a
 * custom sign in cannot be processed inside the managed login pages of the pool.
 *
 * She does not need an account to use Emi. The page says so under the form, because a sign in page
 * that said nothing would read as a sign in she has to do.
 *
 * Every value is a class and none is a style attribute, because the content policy of SITE-6 names
 * a secret for a style and a style written on an element cannot carry one, so a browser would
 * refuse it and the page would quietly draw wrong.
 */

/** The path this page sits at under a language, which its own head and the sitemap both name. */
export const THE_SIGN_IN_PAGE = 'sign-in/';

/** The column the board draws the page in, which is narrower than any other page of the site. */
const theColumn = 'max-w-[440px]';

/** One way in: what it is called, and the ground the board draws it on. */
interface AWayToSignIn {
  readonly word: SiteWordKey;
  readonly ground: string;
  /**
   * Whether the way in is still to be built. A way marked this way is not drawn, and it comes back
   * by taking this one line off it on the day the sign in behind it exists. Every way in the board
   * draws is built, so no entry carries it today and the filter below has nothing to take out.
   */
  readonly waitsForItsKeys?: boolean;
}

/**
 * The three ways in the board draws above the divider, in the order it draws them.
 *
 * Each press carries the mark of its own company, drawn as the board draws it in
 * `components/theMarksOfTheWaysIn.tsx`, because each company fixes how its mark is drawn.
 *
 * Apple sits above Google because Apple's review rule asks for a way in that limits what it
 * learns beside every social sign in, and the board draws it first.
 */
export const theWaysToSignIn: readonly AWayToSignIn[] = [
  { word: 'signInApple', ground: 'bg-siteBlack text-siteCard' },
  {
    word: 'signInGoogle',
    // Google's own rule and Google's own words, which are neither of them a colour of Emi.
    ground: 'box-border border-hairline border-markGoogleLine bg-siteCard text-markGoogleText',
  },
  { word: 'signInTelegram', ground: 'bg-siteTint text-siteText' },
];

/** The ways in the page draws, which is every one whose credential exists. */
export function theWaysInSheIsOffered(): readonly AWayToSignIn[] {
  return theWaysToSignIn.filter((way) => way.waitsForItsKeys !== true);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const language = isLanguage(lang) ? lang : 'en';
  const words = wordsIn(language);

  // The layout names the home page as the address of every page it draws, because it cannot read
  // the path. A page that let that stand would tell a search engine it is the home page, and the
  // two would then be one page in the record.
  return {
    title: words.signInTitle,
    description: words.signInNoAccountNeeded,
    alternates: theLinksOf(language, THE_SIGN_IN_PAGE),
  };
}

export default async function SignInPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  if (!isLanguage(lang)) {
    notFound();
  }

  const words: SiteWords = wordsIn(lang);
  const offered = theWaysInSheIsOffered();

  return (
    <main
      className={`mx-auto box-border flex ${theColumn} w-full flex-col items-stretch gap-spaceLg px-spaceXl pt-[88px] pb-[96px] text-center`}
    >
      <span className="block h-[72px] w-[72px] self-center overflow-hidden rounded-lg">
        <EmiIcon className="h-full w-full" decorative />
      </span>
      <h1 className="font-serif text-[32px] leading-[40px] font-medium tracking-[-0.01em]">
        {words.signInTitle}
      </h1>
      <TheSignInForm language={lang} words={words}>
        <TheWaysSheCanSignIn language={lang} ways={offered} words={words} />

        {offered.length === 0 ? null : (
          <div className="flex items-center gap-spaceMd py-spaceSm text-body-sm text-siteQuietText">
            <span className="h-hairline flex-1 bg-siteLine" />
            {words.signInOr}
            <span className="h-hairline flex-1 bg-siteLine" />
          </div>
        )}
      </TheSignInForm>

      <div className="mt-[32px] flex flex-col gap-spaceSm border-t-hairline border-t-siteLine pt-spaceXl text-body-sm text-siteQuietText">
        <span>{words.signInNoAccountNeeded}</span>
        <span>{words.signInWhatTheAccountHolds}</span>
      </div>
    </main>
  );
}
