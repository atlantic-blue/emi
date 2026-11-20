'use client';

import { type ReactNode, useEffect, useSyncExternalStore } from 'react';

import type { Language } from '@/app/words';
import { WHERE_A_READER_WITH_NO_SESSION_GOES } from '@/components/theAccountHeader';
import {
  theSessionHasRunOut,
  theSessionHeld,
  whenTheSessionChanges,
} from '@/lib/theSessionSheHolds';
import { WHERE_SHE_BUYS_EMI, comeBackToThisPage } from '@/lib/whereASignInComesBackTo';
import { goInsteadTo } from '@/lib/whereSheGoesNext';

/**
 * The Buy Emi page is for a woman who is signed in. This draws it for her, and moves everybody
 * else to the page she signs in on, the way her account does it.
 *
 * A payment lands against the sign in she used, so there is nowhere to put a card taken from a
 * reader with no session. The press that pays reads the session and did nothing without one, which
 * is a form that looks like it works and does not.
 *
 * It runs in her browser because the session runs there. The tokens live in `localStorage` and a
 * server of this site never reads them, so a server cannot tell a signed in reader from anybody
 * else, and the page has to ask once it is drawn. Nothing of the plan and nothing of the form is
 * drawn until it has asked.
 *
 * She comes back to this page once she signs in, rather than landing on her account, because the
 * page she was trying to read is the whole reason she was moved.
 */

/**
 * What is known about her session, in three states rather than two.
 *
 * "nobody has looked" is the state a server is in and the state the first drawing in her browser
 * is in, because that drawing has to match what the server sent or the page cannot take it over.
 * Two states would draw the plan and the form for one frame to a reader with no session, and would
 * put the whole page in the markup a server hands to anybody.
 */
type WhatIsKnownOfHerSession = 'nobody has looked' | 'she is signed in' | 'she is signed out';

const whatHerBrowserHolds = (): WhatIsKnownOfHerSession => {
  const held = theSessionHeld();

  return held === null || theSessionHasRunOut(held, Date.now())
    ? 'she is signed out'
    : 'she is signed in';
};

/** What a server knows about her session, which is nothing: the entry is in her browser alone. */
const whatAServerKnows = (): WhatIsKnownOfHerSession => 'nobody has looked';

export function TheCheckoutBehindASignIn({
  language,
  children,
}: {
  readonly language: Language;
  /** The plan and the form, which only a woman who is signed in reads. */
  readonly children: ReactNode;
}) {
  const known = useSyncExternalStore(whenTheSessionChanges, whatHerBrowserHolds, whatAServerKnows);

  useEffect(() => {
    if (known === 'she is signed out') {
      comeBackToThisPage(WHERE_SHE_BUYS_EMI);
      goInsteadTo(`/${language}/${WHERE_A_READER_WITH_NO_SESSION_GOES}`);
    }
  }, [known, language]);

  return known === 'she is signed in' ? <>{children}</> : null;
}
