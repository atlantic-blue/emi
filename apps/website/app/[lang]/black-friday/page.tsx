import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { isLanguage, wordsIn } from '@/app/words';
import {
  TheBandsBelowTheHero,
  TheCarousels,
  TheClosingBand,
  TheStorePress,
  theWidestBand,
} from '@/components/theBandsOfTheBoard';
import { CycleRing } from '@/components/cycleRing';
import { theLinksOf } from '@/lib/theAddressesOfAPage';
import { theCardAChatDraws } from '@/lib/theCardAChatDraws';
import { THE_BLACK_FRIDAY_OFFER, theBlackFridayOfferIsOpen } from '@/lib/theBlackFridayOffer';
import { theStoreListingIsOpen } from '@/lib/theStoreListing';

/**
 * The page a woman buys Emi at half price on, in the language her address names. It is the board
 * the operator approved for the home page, `docs/design/website/home-v2/boards/MainV2.dc.html`,
 * with the offer in its hero: what it costs, what it costs without the offer, and when it ends.
 * Every band below the hero is the home page's own band, in the same order, from
 * `components/theBandsOfTheBoard.tsx`.
 *
 * The page is drawn on each request, as the home page is, so the clock is read as a reader asks
 * for it rather than as a build is made. A page built once would go on offering a price nobody
 * sells the morning after the offer closes.
 *
 * After the offer closes, a reader is sent to the home page rather than shown a page that says
 * the offer is over. A press she saved, or a link somebody sent her in the night, then lands her
 * on what Emi costs today, which is the page she would have had to find anyway.
 *
 * Nothing links to it. It is written for a woman who was handed the address, so the band at the
 * top and the band at the foot of the site offer no way here.
 */

/** The path this page sits at under a language, which its own head and the sitemap both name. */
export const THE_BLACK_FRIDAY_PAGE = 'black-friday/';

/**
 * The till, carrying the offer she pressed in. The page she lands on reads the offer from the
 * address and charges half of the yearly price, so a press that dropped it would charge her the
 * price she just read a different figure for.
 */
function theTillWithTheOffer(language: string): string {
  return `/${language}/checkout/?offer=${THE_BLACK_FRIDAY_OFFER}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const language = isLanguage(lang) ? lang : 'en';
  const words = wordsIn(language);

  return {
    title: words.blackFridayTitle,
    description: words.blackFridayDescription,
    alternates: theLinksOf(language, THE_BLACK_FRIDAY_PAGE),
    // Written here rather than left to the layout, because the card a woman sends her sister says
    // what the offer is and when it ends, which is the whole of why she sends it.
    ...theCardAChatDraws({
      language,
      title: words.blackFridayTitle,
      description: words.blackFridayDescription,
      pictureAlt: words.sharePictureAlt,
      page: THE_BLACK_FRIDAY_PAGE,
    }),
  };
}

export default async function BlackFridayPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  if (!isLanguage(lang)) {
    notFound();
  }

  if (!theBlackFridayOfferIsOpen(new Date())) {
    redirect(`/${lang}/`);
  }

  const words = wordsIn(lang);

  return (
    <main>
      <TheCarousels language={lang}>
        <section aria-labelledby="hero-title" className="bg-siteGround">
          <div
            className={`mx-auto flex ${theWidestBand} flex-wrap items-center gap-[64px] px-spaceXl pt-[96px] pb-[104px]`}
          >
            <div className="flex min-w-[0px] flex-[999_1_440px] flex-col gap-spaceXl">
              <span className="font-data text-[12px] leading-[16px] font-medium tracking-[0.08em] text-siteAccent">
                {words.blackFridayEyebrow}
              </span>
              <h1
                className="font-display text-[64px] leading-[68px] font-semibold tracking-[-0.015em] phone:text-[48px] phone:leading-[52px]"
                id="hero-title"
              >
                {words.blackFridayHeading}
              </h1>
              <p className="max-w-[520px] text-[19px] leading-[28px] text-siteQuietText">
                {words.heroLine}
              </p>
              <div className="box-content flex max-w-[440px] flex-col gap-spaceMd rounded-lg bg-siteTint p-spaceXl">
                <span className="font-display text-[24px] leading-[30px] font-semibold">
                  {words.blackFridayPrice}
                </span>
                <span className="text-[14px] leading-[20px] text-siteQuietText">
                  {words.blackFridayInsteadOf}
                </span>
                <span className="text-[14px] leading-[20px] text-siteQuietText">
                  {words.blackFridayEnds}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-spaceXl gap-y-spaceLg pt-spaceSm">
                <a
                  className="box-content flex min-h-[52px] items-center rounded-lg bg-siteAccent px-margin text-body-lg font-semibold text-siteCard no-underline"
                  href={theTillWithTheOffer(lang)}
                >
                  {words.blackFridayPress}
                </a>
                {theStoreListingIsOpen ? <TheStorePress words={words} /> : null}
                <span className="text-[14px] leading-[20px] text-siteQuietText">
                  {words.heroPriceLine}
                  <br />
                  {words.heroCancel}
                </span>
              </div>
            </div>
            <CycleRing language={lang} />
          </div>
        </section>

        <TheBandsBelowTheHero language={lang} />

        <TheClosingBand
          line={`${words.blackFridayPrice} ${words.blackFridayEnds}`}
          press={
            <div className="flex flex-wrap items-center justify-center gap-margin">
              <a
                className="box-content flex min-h-[52px] items-center rounded-lg bg-siteCard px-margin text-body-lg font-semibold text-siteBlack no-underline"
                href={theTillWithTheOffer(lang)}
              >
                {words.blackFridayPress}
              </a>
              {theStoreListingIsOpen ? <TheStorePress onNight words={words} /> : null}
            </div>
          }
          words={words}
        />
      </TheCarousels>
    </main>
  );
}
