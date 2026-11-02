'use client';

import { type ReactNode } from 'react';

/** A stand in. The clock both carousels of the home page run on arrives with the code. */

export const LESS_MOTION = '(prefers-reduced-motion: reduce)';

export function useCarousels() {
  return {
    founder: 0,
    review: 0,
    paused: false,
    togglePause: () => undefined,
    stepFounder: (_by: number) => undefined,
    stepReview: (_by: number) => undefined,
  };
}

export function CarouselsProvider({
  founders: _founders,
  reviews: _reviews,
  children,
}: {
  founders: number;
  reviews: number;
  children: ReactNode;
}) {
  return children;
}

export function CarouselControls(_props: {
  group: string;
  previous: string;
  next: string;
  pause: string;
  play: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return null;
}

export function CarouselDots(_props: { of: number; at: number }) {
  return null;
}
