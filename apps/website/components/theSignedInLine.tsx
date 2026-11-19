'use client';

import { useSyncExternalStore } from 'react';

import type { Language, SiteWords } from '@/app/words';
import { theSessionHeld, whenTheSessionChanges } from '@/lib/theSessionSheHolds';
import { theWayHerTokenNames, whatThatWayIsCalled } from '@/lib/theWaySheSignedIn';

/**
 * The line under the title of the Buy Emi page: which way she signed in, and the press that takes
 * her back to the sign in page if the answer is not her.
 *
 * It runs in her browser because the session runs there. A server of this site never reads her
 * tokens, so it cannot know the answer, and the line is drawn once the browser has read it. A
 * reader with no session reads nothing here rather than a line about somebody.
 */

/** Where the press takes her, which is the page she signs in on. */
export const WHERE_NOT_YOU_GOES = 'sign-in/';

const whatHerBrowserHolds = (): string | null => theSessionHeld()?.idToken ?? null;

const whatAServerKnows = (): string | null => null;

export function TheSignedInLine({
  language,
  words,
}: {
  readonly language: Language;
  readonly words: SiteWords;
}) {
  const token = useSyncExternalStore(whenTheSessionChanges, whatHerBrowserHolds, whatAServerKnows);
  const way = token === null ? null : theWayHerTokenNames(token);

  if (way === null) {
    return null;
  }

  return (
    <span className="text-body-lg text-siteQuietText">
      {words.checkoutSignedInWith.replace('{way}', whatThatWayIsCalled(way, words))}{' '}
      <a className="text-siteAccent" href={`/${language}/${WHERE_NOT_YOU_GOES}`}>
        {words.checkoutNotYou}
      </a>
    </span>
  );
}
