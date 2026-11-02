'use client';

/** A stand in. The band of what other people say about Emi arrives with the code. */

export interface Review {
  readonly quote: string;
  readonly name: string;
  readonly source: string;
}

export const CARDS_ACROSS = 3;

export function showing(reviews: readonly Review[], _at: number): Review[] {
  return [...reviews].slice(0, CARDS_ACROSS);
}

export function ReviewRow(_props: {
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
  return null;
}
