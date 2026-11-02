'use client';

import type { SiteWordKey } from '@/app/words';

/**
 * The ring of the hero, which is the one part of the page that answers her while she reads it.
 *
 * The arithmetic is the board's own, from the script in
 * `docs/design/website/home-v2/boards/MainV2.dc.html`, and the four phases it names are the four
 * the application draws on her home screen.
 */

/** Which of the four phases a day of the cycle falls in, as the word key the ring draws. */
export function phaseKeyOf(day: number): SiteWordKey {
  throw new Error(`The ring does not know what phase day ${day} is in yet.`);
}

/** Where the marker sits, as the transform the ring hands the browser. */
export function markerTransformOf(day: number): string {
  throw new Error(`The ring does not know where day ${day} sits yet.`);
}

export function CycleRing(): null {
  return null;
}
