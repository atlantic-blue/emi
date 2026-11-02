'use client';

import { CarouselControls, CarouselDots, useCarousels } from '@/components/carousels';

/**
 * The band where the two people building Emi say why, one at a time.
 *
 * It is the band of the approved board in `docs/design/website/home-v2/boards/MainV2.dc.html`,
 * measure for measure, and the board decides which of the two stands first.
 *
 * The board draws a note that is still a hole quieter than a note that is written, so the colour
 * of the quote follows the note rather than the band.
 */

export interface Founder {
  /** Two letters, drawn in a round badge where a photograph would go. */
  readonly initials: string;
  readonly name: string;
  readonly role: string;
  readonly note: string;
  /** True where the note is still the hole the board left for it. */
  readonly awaited: boolean;
}

export function FounderNote({
  eyebrow,
  controls,
  previous,
  next,
  pause,
  play,
  founders,
}: {
  eyebrow: string;
  controls: string;
  previous: string;
  next: string;
  pause: string;
  play: string;
  founders: readonly Founder[];
}) {
  const { founder: at, stepFounder } = useCarousels();
  const showing = founders[at] ?? founders[0];

  if (showing === undefined) {
    throw new Error('The band of the founders has to be given at least one of them.');
  }

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-[40px] px-spaceXl py-[120px]">
      <div className="flex flex-wrap items-center justify-between gap-spaceLg">
        <h2
          className="font-data text-[12px] leading-[16px] font-medium tracking-[0.08em] text-siteAccent"
          id="note-title"
        >
          {eyebrow}
        </h2>
        <CarouselControls
          group={controls}
          next={next}
          onNext={() => stepFounder(1)}
          onPrevious={() => stepFounder(-1)}
          pause={pause}
          play={play}
          previous={previous}
        />
      </div>
      <figure aria-live="polite" className="flex min-h-[300px] flex-col gap-[32px]">
        <blockquote
          className={`font-display text-[32px] leading-[44px] font-normal tracking-[-0.01em] ${
            showing.awaited ? 'text-siteQuietText' : 'text-siteText'
          }`}
        >
          {showing.note}
        </blockquote>
        <figcaption className="mt-auto flex items-center gap-spaceLg">
          <span
            aria-hidden="true"
            className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-siteTint text-[16px] font-semibold text-siteAccent"
          >
            {showing.initials}
          </span>
          <span className="flex flex-col">
            <span className="text-[16px] leading-[24px] font-semibold">{showing.name}</span>
            <span className="text-[14px] leading-[20px] text-siteQuietText">{showing.role}</span>
          </span>
        </figcaption>
      </figure>
      <CarouselDots at={at} of={founders.length} />
    </div>
  );
}
