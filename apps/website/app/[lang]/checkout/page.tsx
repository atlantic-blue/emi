import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { type SiteWords, isLanguage, wordsIn } from '@/app/words';
import { TheSignedInLine } from '@/components/theSignedInLine';
import { ThePaymentForm } from '@/components/thePaymentForm';
import { theLinksOf } from '@/lib/theAddressesOfAPage';
import { thePriceOnThisSite } from '@/lib/theOnePrice';
import { thePublishableKey } from '@/lib/theStripeOnThePage';

/**
 * The page she buys Emi on, in the language her address names. It is laid out as the board the
 * operator approved lays it out, `docs/design/website/checkout/boards/Checkout.dc.html`: the
 * title, the line that says which way she signed in, the plan, the two ways to pay and the
 * sentence that says what a payment is linked to.
 *
 * The plan is drawn by this page, on the server, because it says the same thing to everybody. The
 * half that takes money is drawn in her browser, because it needs the session that lives there.
 *
 * Every value is a class and none is a style attribute, because the content policy of SITE-6 names
 * a secret for a style and a style written on an element cannot carry one, so a browser would
 * refuse it and the page would quietly draw wrong.
 *
 * The figure and the sentence both come from `lib/theOnePrice.ts` and not from the catalogue of
 * words. She reads the price here and meets it on her statement a press later, so one file holds
 * what this site charges and every page that says it reads that file.
 */

/** The path this page sits at under a language, which its own head and the sitemap both name. */
export const THE_CHECKOUT_PAGE = 'checkout/';

/** The column the board draws the page in. */
const theColumn = 'max-w-[1024px]';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const language = isLanguage(lang) ? lang : 'en';
  const words = wordsIn(language);

  return {
    title: words.checkoutTitle,
    description: thePriceOnThisSite.said[language],
    alternates: theLinksOf(language, THE_CHECKOUT_PAGE),
  };
}

export default async function CheckoutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  if (!isLanguage(lang)) {
    notFound();
  }

  const words: SiteWords = wordsIn(lang);

  return (
    <main className="grow">
      <div
        className={`mx-auto box-border flex ${theColumn} flex-col gap-[40px] px-spaceXl pt-[56px] pb-[96px]`}
      >
        <header className="flex flex-col gap-spaceSm">
          <h1 className="font-serif text-[48px] leading-[56px] font-medium tracking-[-0.02em]">
            {words.checkoutTitle}
          </h1>
          <TheSignedInLine language={lang} words={words} />
        </header>

        <div className="flex flex-col gap-[28px]">
          <section aria-labelledby="her-plan" className="flex flex-col gap-spaceMd">
            <h2 className="text-[19px] leading-[26px] font-semibold" id="her-plan">
              {words.checkoutPlanHeading}{' '}
              <span className="font-normal text-siteQuietText">{words.checkoutPlanEveryYear}</span>
            </h2>
            <div className="flex items-center justify-between gap-spaceMd rounded-lg border-2 border-siteAccent px-margin py-margin">
              <span className="flex flex-col">
                <span className="text-body-lg font-semibold">{words.checkoutPlanYearly}</span>
                <span className="text-body-sm text-siteQuietText">{words.checkoutPlanRenews}</span>
              </span>
              <span className="font-mono text-body-lg font-medium">
                {words.checkoutPlanAmount.replace('{amount}', thePriceOnThisSite.amount)}
              </span>
            </div>
            <p className="text-body-sm text-siteQuietText">{thePriceOnThisSite.said[lang]}</p>
          </section>

          <ThePaymentForm language={lang} publishableKey={thePublishableKey()} words={words} />

          <p className="text-body-sm text-siteQuietText">{words.checkoutCancelAnyTime}</p>
        </div>
      </div>
    </main>
  );
}
