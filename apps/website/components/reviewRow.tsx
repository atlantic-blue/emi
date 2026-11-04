'use client';

import { CarouselControls, CarouselDots, useCarousels } from '@/components/carousels';

/**
 * The band of what other people say about Emi, three cards at a time on a desktop.
 *
 * It is the band of the approved board in `docs/design/website/home-v2/boards/MainV2.dc.html`. The
 * row always holds the three cards the board holds, and the board hides the third of them below the
 * tablet width and the second as well below the phone width, so a card never arrives half cut off
 * the side of a narrow screen. The cards that are hidden are still drawn, because that is what the
 * board draws and the page is held to the board pixel for pixel.
 *
 * Every card is a hole until a reader has written something. `lib/thePlaceholders.ts` says why
 * those holes are not words.
 */

export interface Review {
  readonly quote: string;
  readonly name: string;
  /** Where she said it: Apple's store, the community, or the beta. */
  readonly source: string;
}

/** How many cards of the row a reader sees at the width of a desktop. */
export const CARDS_ACROSS = 3;

/** The three the row shows, from the one it has moved to, wrapping round the end of the list. */
export function showing(reviews: readonly Review[], at: number): Review[] {
  return Array.from({ length: CARDS_ACROSS }, (_nothing, across) => {
    const found = reviews[(at + across) % reviews.length];

    if (found === undefined) {
      throw new Error('The row of reviews has to be given at least one review.');
    }

    return found;
  });
}

export function ReviewRow({
  eyebrow,
  headline,
  rating,
  controls,
  previous,
  next,
  pause,
  play,
  reviews,
}: {
  eyebrow: string;
  headline: string;
  rating: string;
  controls: string;
  previous: string;
  next: string;
  pause: string;
  play: string;
  reviews: readonly Review[];
}) {
  const { review: at, stepReview } = useCarousels();
  const cards = showing(reviews, at);

  /** Which widths hide which card, so a row of three never spills off a narrow screen. */
  const hiddenAt = ['', 'phone:hidden', 'tablet:hidden'];

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-[40px] px-spaceXl py-[112px]">
      <div className="flex flex-wrap items-end justify-between gap-x-[48px] gap-y-spaceLg">
        <div className="flex flex-col gap-spaceLg">
          <span className="font-data text-[12px] leading-[16px] font-medium tracking-[0.08em] text-siteAccent">
            {eyebrow}
          </span>
          <h2
            className="font-display text-[48px] leading-[56px] font-semibold tracking-[-0.015em] phone:text-[32px] phone:leading-[40px]"
            id="reviews-title"
          >
            {headline}
          </h2>
          <span className="font-data text-[14px] leading-[20px] text-siteQuietText">{rating}</span>
        </div>
        <CarouselControls
          group={controls}
          next={next}
          onNext={() => stepReview(1)}
          onPrevious={() => stepReview(-1)}
          pause={pause}
          play={play}
          previous={previous}
        />
      </div>
      <div
        aria-live="polite"
        className="grid grid-cols-3 gap-margin tablet:grid-cols-2 phone:grid-cols-1"
      >
        {cards.map((card, across) => (
          <figure
            className={`flex min-h-[260px] flex-col gap-spaceXl rounded-[24px] bg-siteCard p-[32px] ${hiddenAt[across] ?? ''}`}
            key={`${across}`}
          >
            <blockquote className="font-display text-[24px] leading-[32px]">
              {card.quote}
            </blockquote>
            <figcaption className="mt-auto flex flex-col">
              <span className="text-[16px] leading-[24px] font-semibold">{card.name}</span>
              <span className="text-[14px] leading-[20px] text-siteQuietText">{card.source}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <CarouselDots at={at} of={reviews.length} />
    </div>
  );
}
