import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { type SiteWords, isLanguage, wordsIn } from '@/app/words';
import { TheReturnFromAProvider } from '@/components/theReturnFromAProvider';
import { theLinksOf } from '@/lib/theAddressesOfAPage';

/**
 * Where Apple and Google send her back to, in the language she was reading.
 *
 * It is the address the pool holds for this site: `infra/cognito.tf` lists one of these for each
 * language, and the pool refuses a return to any other address. So the path is fixed from outside
 * and the page cannot be moved without moving that list.
 *
 * She reads one line and presses nothing. The exchange runs in her browser as soon as the page is
 * drawn, and it leaves her on her account. A return that did not finish says so and offers the
 * page she signs in on, which is the one thing left to do.
 *
 * The page draws nothing of the sign in itself. A heading and a press would be a page she has to
 * read on her way through, and she is on her way through: the whole page exists for the two
 * seconds the exchange takes.
 */

/** The path this page sits at under a language, which the pool holds as a return address. */
export const THE_RETURN_PAGE = 'sign-in/returning/';

/** The column the board draws the page she signs in on, which this page keeps. */
const theColumn = 'max-w-[440px]';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const language = isLanguage(lang) ? lang : 'en';
  const words = wordsIn(language);

  return {
    title: words.returningTitle,
    description: words.returningWait,
    alternates: theLinksOf(language, THE_RETURN_PAGE),
  };
}

export default async function ReturningPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  if (!isLanguage(lang)) {
    notFound();
  }

  const words: SiteWords = wordsIn(lang);

  return (
    <main
      className={`mx-auto box-border flex ${theColumn} w-full flex-col items-stretch gap-spaceLg px-spaceXl pt-[88px] pb-[96px] text-center`}
    >
      <h1 className="font-serif text-[32px] leading-[40px] font-medium tracking-[-0.01em]">
        {words.returningTitle}
      </h1>
      <TheReturnFromAProvider language={lang} words={words} />
    </main>
  );
}
