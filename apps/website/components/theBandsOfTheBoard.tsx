import { websiteColour } from '@emi/tokens';
import type { ReactNode } from 'react';

import { type Language, type SiteWordKey, type SiteWords, wordsIn } from '@/app/words';
import { CarouselsProvider } from '@/components/carousels';
import { type Founder, FounderNote } from '@/components/founderNote';
import { NextPeriodWindow } from '@/components/nextPeriodWindow';
import { type Review, ReviewRow } from '@/components/reviewRow';
import { JULIANS_PHOTOGRAPH, THE_APP_STORE_LISTING, THE_EMI_COMMUNITY } from '@/lib/addresses';
import { asADayNumber, theDayOf } from '@/lib/theNextPeriodRange';
import { theCardsOf, theRealReviews } from '@/lib/theReviews';

/**
 * The bands of the board the operator approved on 2026-09-28,
 * `docs/design/website/home-v2/boards/MainV2.dc.html`, section for section and value for value.
 *
 * Two pages draw them: the page a woman meets Emi on, and the Black Friday page, which draws the
 * same board with the offer in its hero. They sit here so the two cannot drift. A band edited for
 * one page is edited for both, and a browser holds the home page against the render of the board
 * at three widths, so a measure here the board does not draw fails that comparison.
 *
 * Every value is a class and none is a style attribute, because the content policy of SITE-6 names
 * a secret for a style and a style written on an element cannot carry one, so a browser would
 * refuse it and the page would quietly draw wrong.
 *
 * One band of the board is drawn by neither page. It says what other people think of Emi, and
 * nobody has said anything yet, so the band is drawn from `lib/theReviews.ts` and that list is
 * empty.
 */

/** Each band, at the measures the board gives it. One place, so the order reads as one. */
export const theWidestBand = 'max-w-[1120px]';

/** One of the two cards the board offers a reader who is not ready to install anything. */
export interface AnOffer {
  /** What it is called on the page, which is also what labels the band when it is drawn first. */
  readonly named: string;
  readonly title: SiteWordKey;
  readonly line: SiteWordKey;
  readonly press: SiteWordKey;
  readonly path: string;
  /**
   * Whether the page behind it is still to be built. An offer marked this way is not drawn, and it
   * comes back by taking this one line off it on the day its page ships.
   */
  readonly waitsForItsPage?: boolean;
}

/**
 * The two offers, in the order the board puts them: the free calculator, and the support page.
 *
 * Each card is a press and the sentence that explains the press, so a card whose page is still to
 * be built has nothing left to say and is not drawn at all. The calculator is still to be built.
 *
 * The list the sitemap is written from says which pages the site serves, and the scenario of step
 * 26.26 holds the two together, so a mark here cannot go on waiting after its page arrives.
 */
const theOffers: readonly AnOffer[] = [
  {
    named: 'try-title',
    title: 'tryTitle',
    line: 'tryLine',
    press: 'tryLink',
    path: 'calculator/',
    waitsForItsPage: true,
  },
  { named: 'ask-title', title: 'askTitle', line: 'askLine', press: 'askLink', path: 'support/' },
];

/** Every offer the band draws, which is every one whose page a reader can open. */
export function theOffersOnThePage(): readonly AnOffer[] {
  return theOffers.filter((offer) => offer.waitsForItsPage !== true);
}

/** Apple's own mark, which is Apple's drawing and not Emi's, at the two sizes the board draws it. */
export function AppleMark({ paint }: { paint: string }) {
  return (
    <svg aria-hidden="true" fill={paint} height="22" viewBox="0 0 24 24" width="22">
      <path d="M16.4 12.6c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.8-3.5.8-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.6zM14.1 5.6c.6-.8 1.1-1.8 1-2.9-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.7-1.3z" />
    </svg>
  );
}

/**
 * The press to the listing in Apple's store, which the board draws twice: in the hero, on the
 * light ground, and again in the band at the end, on the night ground.
 *
 * It is drawn only where Apple has issued an address for the listing, which is `theStoreListingIsOpen`.
 * A press to an address nobody has issued answers nothing, and a page that asks a reader to install
 * software it cannot hand her is the page she stops believing.
 */
export function TheStorePress({ words, onNight }: { words: SiteWords; onNight?: boolean }) {
  const ground = onNight === true ? 'bg-siteCard text-siteBlack' : 'bg-siteBlack text-siteCard';

  return (
    <a
      aria-label={words.store}
      className={`box-content flex min-h-[52px] items-center gap-spaceSm rounded px-margin no-underline ${ground}`}
      href={THE_APP_STORE_LISTING}
    >
      <AppleMark paint={onNight === true ? websiteColour.siteBlack : websiteColour.siteCard} />
      <span className={onNight === true ? 'flex flex-col text-left' : 'flex flex-col'}>
        <span className="text-[12px] leading-[16px]">{words.storeSmall}</span>
        <span className="text-[19px] leading-[20px] font-semibold">{words.footerAppStore}</span>
      </span>
    </a>
  );
}

/**
 * The two people building Emi, in the board's order. A name is a name in every language, so the
 * names, the initials and the photographs are here and only the roles and the notes are words.
 *
 * One of the two has sent a photograph. The other is drawn as her initials until she sends hers.
 */
export function theFoundersOf(words: SiteWords): Founder[] {
  return [
    {
      initials: 'IN',
      name: 'Iuliia Nikolaeva',
      role: words.founderIuliiaRole,
      note: words.founderIuliiaNote,
    },
    {
      initials: 'JT',
      photograph: JULIANS_PHOTOGRAPH,
      name: 'Julian Tellez',
      role: words.founderJulianRole,
      note: words.founderJulianNote,
    },
  ];
}

/**
 * The cards of the row of reviews: one for each person who has said something about Emi and
 * agreed to it being printed. Nobody has yet, so the list is empty and the band is not drawn.
 * `lib/theReviews.ts` is the one place an entry is added, and adding one brings the band back with
 * that person's own words in it.
 */
export function theReviewsOf(words: SiteWords): Review[] {
  return theCardsOf(theRealReviews, {
    store: words.reviewFromTheStore,
    community: words.reviewFromTheCommunity,
    beta: words.reviewFromTheBeta,
  });
}

/**
 * The one clock the two carousels of the board run on. It draws nothing of its own, so the markup
 * a reader gets is the markup the board draws, and it wraps the whole of a page rather than the
 * bands alone: a page that wrapped only part of itself would hold a carousel outside the clock
 * that moves it.
 */
export function TheCarousels({ language, children }: { language: Language; children: ReactNode }) {
  const words = wordsIn(language);

  return (
    <CarouselsProvider founders={theFoundersOf(words).length} reviews={theReviewsOf(words).length}>
      {children}
    </CarouselsProvider>
  );
}

/**
 * Every band of the board below the hero, in the board's own order: the forecast, the four
 * phases, the community, the note the founders sign, the encryption, the reviews and the two
 * offers.
 *
 * The hero is not here. It is the one band the two pages say different things in: the home page
 * says what Emi is, and the Black Friday page says what the offer costs and when it ends.
 */
export function TheBandsBelowTheHero({ language }: { language: Language }) {
  const words = wordsIn(language);
  const under = (path: string): string => `/${language}/${path}`;
  const theFounders = theFoundersOf(words);
  const theReviews = theReviewsOf(words);

  /** The four guides, one for each phase of the ring above them, in the board's order. */
  const theGuides = [
    {
      label: words.learnPeriodLabel,
      ink: 'text-sitePeriodInk',
      title: words.learnPeriodTitle,
      rule: 'bg-period',
    },
    {
      label: words.learnFollicularLabel,
      ink: 'text-siteFollicularInk',
      title: words.learnFollicularTitle,
      rule: 'bg-follicular',
    },
    {
      label: words.learnOvulationLabel,
      ink: 'text-siteOvulationInk',
      title: words.learnOvulationTitle,
      rule: 'bg-ovulation',
    },
    {
      label: words.learnLutealLabel,
      ink: 'text-siteLutealInk',
      title: words.learnLutealTitle,
      rule: 'bg-luteal',
    },
  ];

  return (
    <>
      <section aria-labelledby="forecast-title" className="bg-siteCard">
        <div
          className={`mx-auto flex ${theWidestBand} flex-wrap items-center gap-[64px] px-spaceXl py-[112px]`}
        >
          <div className="flex flex-[1_1_320px] justify-center">
            <picture className="block w-[300px]">
              <img
                alt={words.cycleScreenAlt}
                className="block h-auto w-full rounded-[40px] shadow-[0_24px_48px_-16px] shadow-siteShadow"
                src="/the-home-screen.png"
              />
            </picture>
          </div>
          <div className="flex min-w-[0px] flex-[999_1_440px] flex-col gap-spaceXl">
            <span className="font-data text-[12px] leading-[16px] font-medium tracking-[0.08em] text-siteAccent">
              {words.cycleEyebrow}
            </span>
            <h2
              className="font-display text-[48px] leading-[56px] font-semibold tracking-[-0.015em] phone:text-[32px] phone:leading-[40px]"
              id="forecast-title"
            >
              {words.cycleHeadline}
            </h2>
            <p className="text-[19px] leading-[28px] text-siteQuietText">{words.cycleLine}</p>
            <div className="box-content flex max-w-[440px] flex-col gap-spaceMd rounded-lg bg-siteTint p-spaceXl">
              <span className="text-[14px] leading-[20px] text-siteQuietText">
                {words.cycleNextLabel}
              </span>
              <span className="font-display text-[24px] leading-[30px] font-semibold">
                <NextPeriodWindow
                  drawnOn={asADayNumber(theDayOf(new Date()))}
                  language={language}
                />
              </span>
              <span className="text-[14px] leading-[20px] text-siteQuietText">
                {words.cycleNextConfidence}
              </span>
            </div>
            <p className="text-[14px] leading-[20px] text-siteQuietText">{words.cycleDenial}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="learn-title" className="bg-siteTint">
        <div className={`mx-auto flex ${theWidestBand} flex-col gap-[48px] px-spaceXl py-[112px]`}>
          <div className="flex max-w-[720px] flex-col gap-spaceLg">
            <span className="font-data text-[12px] leading-[16px] font-medium tracking-[0.08em] text-siteAccent">
              {words.learnEyebrow}
            </span>
            <h2
              className="font-display text-[48px] leading-[56px] font-semibold tracking-[-0.015em] phone:text-[32px] phone:leading-[40px]"
              id="learn-title"
            >
              {words.learnHeadline}
            </h2>
            <p className="text-[19px] leading-[28px] text-siteQuietText">{words.learnLine}</p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-margin">
            {theGuides.map((guide) => (
              // The guide behind each card is not written yet, so the card says what the phase is
              // and presses nowhere. It becomes a press again on the day the guides ship, by
              // drawing an `a` here with `under('calculator/')` and the same classes.
              <div
                className="flex min-h-[200px] flex-col gap-spaceSm rounded-[24px] bg-siteCard p-marginMd text-siteText no-underline"
                key={guide.label}
              >
                <span
                  className={`text-[12px] leading-[16px] font-semibold tracking-[0.02em] ${guide.ink}`}
                >
                  {guide.label}
                </span>
                <span className="font-display text-[24px] leading-[30px] font-semibold">
                  {guide.title}
                </span>
                <span aria-hidden="true" className={`mt-auto h-[6px] rounded-full ${guide.rule}`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="community-title" className="bg-siteNight text-siteTintDeep">
        <div
          className={`mx-auto grid ${theWidestBand} grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-x-[64px] gap-y-[48px] px-spaceXl py-[112px]`}
        >
          <div className="flex flex-col gap-spaceLg">
            <span className="font-data text-[12px] leading-[16px] font-medium tracking-[0.08em] text-siteNightAccent">
              {words.communityEyebrow}
            </span>
            <h2
              className="font-display text-[48px] leading-[56px] font-semibold tracking-[-0.015em] phone:text-[32px] phone:leading-[40px]"
              id="community-title"
            >
              {words.communityHeadline}
            </h2>
            <p className="text-[19px] leading-[28px] text-siteNightQuietText">
              {words.communityLine}
            </p>
            <a
              className="self-start text-[16px] leading-[44px] text-siteNightAccent no-underline"
              href={THE_EMI_COMMUNITY}
              rel="noopener"
            >
              {words.communityJoin}
            </a>
          </div>
          <div className="flex flex-col gap-spaceMd rounded-[24px] bg-siteTintDeep p-[36px] text-siteText">
            <span className="text-[12px] leading-[16px] font-semibold tracking-[0.02em] text-siteAccent">
              {words.parentsEyebrow}
            </span>
            <span className="font-display text-[32px] leading-[40px] font-semibold">
              {words.parentsHeadline}
            </span>
            <p className="text-[16px] leading-[24px] text-siteQuietText">{words.parentsLine}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="note-title" className="bg-siteCard">
        <FounderNote
          controls={words.founderControlsLabel}
          eyebrow={words.noteEyebrow}
          founders={theFounders}
          next={words.founderNext}
          pause={words.carouselPause}
          play={words.carouselPlay}
          previous={words.founderPrevious}
        />
      </section>

      <section
        aria-labelledby="privacy-title"
        className="border-t-hairline border-t-siteTintLine bg-siteGround"
      >
        <div
          className={`mx-auto flex ${theWidestBand} flex-wrap items-center justify-between gap-x-[48px] gap-y-spaceXl px-spaceXl py-[72px]`}
        >
          <div className="flex items-center gap-margin">
            <span className="flex h-marginLg w-marginLg flex-[0_0_auto] items-center justify-center rounded-full bg-siteCard">
              <svg
                aria-hidden="true"
                fill="none"
                height="26"
                stroke={websiteColour.siteAccent}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                viewBox="0 0 24 24"
                width="26"
              >
                <rect height="10" rx="2" width="14" x="5" y="11" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            </span>
            <h2
              className="font-display text-[32px] leading-[40px] font-semibold"
              id="privacy-title"
            >
              {words.privacyHeadline}
            </h2>
          </div>
          <a
            className="text-[16px] leading-[44px] font-semibold text-siteAccent no-underline"
            href={under('privacy/')}
          >
            {words.privacyLink}
          </a>
        </div>
      </section>

      {theReviews.length > 0 && (
        <section aria-labelledby="reviews-title" className="bg-siteTintDeep">
          <ReviewRow
            controls={words.reviewControlsLabel}
            eyebrow={words.reviewsEyebrow}
            headline={words.reviewsHeadline}
            next={words.reviewNext}
            pause={words.carouselPause}
            play={words.carouselPlay}
            previous={words.reviewPrevious}
            rating={words.reviewsRating}
            reviews={theReviews}
          />
        </section>
      )}

      {/* The band of the two offers. A card is a press and the sentence that explains the
            press, so a card whose page is still to be built has nothing left to say and is not
            drawn. The calculator is still to be built; the support page is not. The band is
            labelled by the first card it draws, because the card that used to label it is the one
            that may be missing. The board draws both at
            docs/design/website/home-v2/boards/MainV2.dc.html. */}
      {theOffersOnThePage().length > 0 ? (
        <section aria-labelledby={theOffersOnThePage()[0]?.named} className="bg-siteCard">
          <div
            className={`mx-auto grid ${theWidestBand} grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-spaceXl px-spaceXl py-[96px]`}
          >
            {theOffersOnThePage().map((offer) => (
              <a
                className="flex min-h-[200px] flex-col gap-spaceMd rounded-[24px] bg-siteTint p-[36px] text-siteText no-underline"
                href={under(offer.path)}
                key={offer.named}
              >
                <span
                  className="font-display text-[32px] leading-[40px] font-semibold"
                  id={offer.named}
                >
                  {words[offer.title]}
                </span>
                <span className="text-[16px] leading-[24px] text-siteQuietText">
                  {words[offer.line]}
                </span>
                <span className="mt-auto text-[16px] font-semibold text-siteAccent">
                  {words[offer.press]}
                </span>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

/**
 * The band at the end of the page, which asks her once more. The press is the page's own: the home
 * page offers the store, and the Black Friday page offers the till at half price. The sentence
 * below it is the page's own for the same reason.
 */
export function TheClosingBand({
  words,
  press,
  line,
}: {
  words: SiteWords;
  press: ReactNode;
  line: string;
}) {
  return (
    <section aria-labelledby="end-title" className="bg-siteNight text-siteTintDeep">
      <div className="mx-auto flex max-w-[760px] flex-col items-center gap-spaceXl px-spaceXl py-[120px] text-center">
        <h2
          className="font-display text-[48px] leading-[56px] font-semibold tracking-[-0.015em] phone:text-[32px] phone:leading-[40px]"
          id="end-title"
        >
          {words.heroHeadline}
        </h2>
        {press}
        <span className="text-[14px] leading-[20px] text-siteNightQuietText">{line}</span>
      </div>
    </section>
  );
}
