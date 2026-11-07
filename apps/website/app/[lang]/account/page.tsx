import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { type SiteWords, isLanguage, wordsIn } from '@/app/words';
import { TheAccountHeader } from '@/components/theAccountHeader';
import { theLinksOf } from '@/lib/theAddressesOfAPage';

/**
 * The account page, in the language her address names. It is laid out as the board the operator
 * approved lays it out, `docs/design/website/sign-in/boards/Profile.dc.html`.
 *
 * The head of that board is built and the four sections under it are not. The subscription, the
 * ways she signs in, the preferences and the data each need a step of their own, and a section
 * drawn with nothing behind it would say Emi holds something it does not hold.
 *
 * The board paints the page on the tint rather than on the paper every other page sits on, so the
 * column carries that ground itself.
 *
 * Every value is a class and none is a style attribute, because the content policy of SITE-6 names
 * a secret for a style and a style written on an element cannot carry one, so a browser would
 * refuse it and the page would quietly draw wrong.
 */

/** The path this page sits at under a language, which its own head and the sitemap both name. */
export const THE_ACCOUNT_PAGE = 'account/';

/** The column the board draws the account in. */
const theColumn = 'max-w-[720px]';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const language = isLanguage(lang) ? lang : 'en';
  const words = wordsIn(language);

  return {
    title: words.accountTitle,
    description: words.accountRecordsStayOnYourPhone,
    alternates: theLinksOf(language, THE_ACCOUNT_PAGE),
  };
}

export default async function AccountPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  if (!isLanguage(lang)) {
    notFound();
  }

  const words: SiteWords = wordsIn(lang);

  return (
    <main className="grow bg-siteTint">
      <div
        className={`mx-auto box-border flex ${theColumn} flex-col gap-[32px] px-spaceXl pt-[64px] pb-[96px]`}
      >
        <TheAccountHeader language={lang} words={words} />
      </div>
    </main>
  );
}
