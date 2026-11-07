import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { type SiteWordKey, type SiteWords, isLanguage, wordsIn } from '@/app/words';
import { EmiIcon } from '@/components/emiIcon';
import { TheSignInForm } from '@/components/theSignInForm';
import { theLinksOf } from '@/lib/theAddressesOfAPage';

/**
 * The page a woman signs in on, in the language her address names. It is laid out as the board the
 * operator approved lays it out, `docs/design/website/sign-in/boards/SignIn.dc.html`: the band at
 * the top, the mark, the title, the line under it, the ways in, and the two sentences that say
 * what the account is for.
 *
 * The board offers four ways in and the page draws one. Sign in with Apple, Google and Telegram
 * each need a credential only a person can make, and step 28.3 makes them, so each of the three
 * presses and the divider over them wait here the way every other press of this site waits for its
 * page. The three come back by taking one line off each.
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
   * Whether the credential behind it is still to be made. A way marked this way is not drawn, and
   * it comes back by taking this one line off it on the day step 28.3 lands.
   */
  readonly waitsForItsKeys?: boolean;
}

/**
 * The three ways in the board draws above the divider, none of which is drawn today. Each one
 * needs a credential only a person can make, and step 28.3 makes all three.
 *
 * They are listed rather than deleted, so the page keeps the shape the board gives it and the day
 * the credentials exist is one line of work for each. The mark each press carries is Apple own,
 * Google own and Telegram own, and each company states how its mark may be drawn, so the three
 * marks arrive with the credentials rather than being drawn from memory here.
 */
export const theWaysToSignIn: readonly AWayToSignIn[] = [
  { word: 'signInApple', ground: 'bg-siteBlack text-siteCard', waitsForItsKeys: true },
  {
    word: 'signInGoogle',
    ground: 'border-hairline border-siteControlLine bg-siteCard text-siteText',
    waitsForItsKeys: true,
  },
  { word: 'signInTelegram', ground: 'bg-siteTint text-siteText', waitsForItsKeys: true },
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
        {offered.map((way) => (
          <button
            className={`flex min-h-[52px] items-center justify-center gap-spaceMd rounded-[12px] text-body-lg font-semibold ${way.ground}`}
            key={way.word}
            type="button"
          >
            {words[way.word]}
          </button>
        ))}

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
