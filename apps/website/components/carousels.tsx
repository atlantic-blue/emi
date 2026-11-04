'use client';

import { type ReactNode, createContext, useContext, useEffect, useState } from 'react';

import { websiteCarouselWait } from '@emi/tokens';

/**
 * The one clock both carousels of the home page run on, from the script of the approved board in
 * `docs/design/website/home-v2/boards/MainV2.dc.html`.
 *
 * One clock rather than two, because two waits running beside each other move two things at two
 * different moments and a reader cannot read either. One press of Pause holds both still for the
 * same reason: a reader who stopped the row of reviews to finish reading one of them did not ask
 * for the band above it to keep moving.
 *
 * Nothing moves at all for a reader who asked her machine for less motion. That is her answer to
 * this question already, given once in her own settings, so the page does not ask it again.
 */

/**
 * Which card each carousel stands on, and whether the clock is running. Both numbers are already
 * inside their own list: this is the one place a carousel comes back round to its first card, so a
 * band that drew `at % length` of its own would hide a loop that stopped working here.
 */
interface Carousels {
  readonly founder: number;
  readonly review: number;
  readonly paused: boolean;
  readonly togglePause: () => void;
  readonly stepFounder: (by: number) => void;
  readonly stepReview: (by: number) => void;
}

const nothingShared = createContext<Carousels | null>(null);

/**
 * Where a carousel stands after a move, coming back round the end of its own list. A band with no
 * cards stands on nothing and stays there: one of the two bands is drawn only when it has something
 * to show, and coming back round a list of nothing has no answer, so without this the clock would
 * put that band on a card that is not a number.
 */
export function movedTo(at: number, by: number, cards: number): number {
  return cards === 0 ? 0 : (at + cards + by) % cards;
}

/** The query a reader's own settings answer, which is the one thing that beats the clock. */
export const LESS_MOTION = '(prefers-reduced-motion: reduce)';

export function useCarousels(): Carousels {
  const shared = useContext(nothingShared);

  if (shared === null) {
    throw new Error('A carousel of the home page has to be drawn inside CarouselsProvider.');
  }

  return shared;
}

/**
 * Wraps the bands of the page without drawing anything of its own, so the markup a reader gets is
 * the markup the board draws and the two bands that move are still two bands apart.
 */
export function CarouselsProvider({
  founders,
  reviews,
  children,
}: {
  founders: number;
  reviews: number;
  children: ReactNode;
}) {
  const [founder, setFounder] = useState(0);
  const [review, setReview] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) {
      return;
    }

    if (typeof window.matchMedia === 'function' && window.matchMedia(LESS_MOTION).matches) {
      return;
    }

    const clock = setInterval(() => {
      setFounder((at) => movedTo(at, 1, founders));
      setReview((at) => movedTo(at, 1, reviews));
    }, websiteCarouselWait);

    return () => {
      clearInterval(clock);
    };
  }, [founders, paused, reviews]);

  return (
    <nothingShared.Provider
      value={{
        founder,
        review,
        paused,
        togglePause: () => setPaused((was) => !was),
        stepFounder: (by) => setFounder((at) => movedTo(at, by, founders)),
        stepReview: (by) => setReview((at) => movedTo(at, by, reviews)),
      }}
    >
      {children}
    </nothingShared.Provider>
  );
}

/** The three presses beside a carousel, at the sizes and the colours the board draws them. */
export function CarouselControls({
  group,
  previous,
  next,
  pause,
  play,
  onPrevious,
  onNext,
}: {
  group: string;
  previous: string;
  next: string;
  pause: string;
  play: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { paused, togglePause } = useCarousels();

  return (
    <div aria-label={group} className="flex items-center gap-spaceSm" role="group">
      <button
        aria-label={previous}
        className="flex h-[44px] w-[44px] items-center justify-center rounded-full border-hairline border-siteControlLine bg-transparent text-[19px] text-siteText"
        onClick={onPrevious}
        type="button"
      >
        ‹
      </button>
      <button
        className="min-h-[44px] rounded-full border-hairline border-siteControlLine bg-transparent px-spaceLg text-[14px] font-semibold text-siteText"
        onClick={togglePause}
        type="button"
      >
        {paused ? play : pause}
      </button>
      <button
        aria-label={next}
        className="flex h-[44px] w-[44px] items-center justify-center rounded-full border-hairline border-siteControlLine bg-transparent text-[19px] text-siteText"
        onClick={onNext}
        type="button"
      >
        ›
      </button>
    </div>
  );
}

/** The row of dots under a carousel, the one she is on drawn three times as wide. */
export function CarouselDots({ of, at }: { of: number; at: number }) {
  return (
    <div aria-hidden="true" className="flex gap-spaceSm">
      {Array.from({ length: of }, (_nothing, index) => (
        <span
          className={`h-spaceSm rounded-full ${
            index === at ? 'w-spaceXl bg-siteAccent' : 'w-spaceSm bg-siteLine'
          }`}
          key={index}
        />
      ))}
    </div>
  );
}
