import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { type SiteWords, isLanguage, wordsIn } from '@/app/words';
import { TheReturnFromTelegram } from '@/components/theReturnFromTelegram';
import { theLinksOf } from '@/lib/theAddressesOfAPage';

/**
 * Where Telegram sends her back to, which is a relay and not a page she reads.
 *
 * Telegram processes a login only for an address registered in advance, and it matches the address
 * rather than the page, so one address serves every language of the site and every surface. That
 * address is under `en`. She reads whatever language she pressed in, and the relay sends her on in
 * it: the language travels in the state value, and the page reads it from there.
 *
 * It draws what the page Apple and Google come back to draws, and says the same two sentences, so
 * this piece adds no state no board of the sign in has drawn. She reads one line and presses
 * nothing. The sign in runs in her browser as soon as the page is drawn, and it leaves her on the
 * page she signs in on, signed in. A return that did not finish says so and offers that page,
 * which is the one thing left to do.
 *
 * Every value is a class and none is a style attribute, because the content policy of SITE-6 names
 * a secret for a style and a style written on an element cannot carry one, so a browser would
 * refuse it and the page would quietly draw wrong.
 */

/** The path this page sits at under a language, which Telegram holds as a return address. */
export const THE_TELEGRAM_RETURN_PAGE = 'sign-in/telegram/';

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
    alternates: theLinksOf(language, THE_TELEGRAM_RETURN_PAGE),
  };
}

export default async function TelegramReturnPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
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
      <TheReturnFromTelegram language={lang} words={words} />
    </main>
  );
}
