'use client';

/** A stand in. The band where the two people building Emi say why arrives with the code. */

export interface Founder {
  readonly initials: string;
  readonly name: string;
  readonly role: string;
  readonly note: string;
  readonly awaited: boolean;
}

export function FounderNote(_props: {
  eyebrow: string;
  controls: string;
  previous: string;
  next: string;
  pause: string;
  play: string;
  founders: readonly Founder[];
}) {
  return null;
}
