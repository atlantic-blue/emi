import type { HowItAsks } from '@emi/sign-in';

import type { SecureStore } from '../vault/keychain';
import { forgetHerSignIn, keepHerSignIn, readTheSignInSheKeeps } from './herSignIn';
import { theAppSignIn } from './theAppSignIn';

/**
 * The refresh token of the pool, spent once each time Emi reaches the foreground.
 *
 * Nothing of hers changes unless the pool answers. A refused token is the one answer that removes
 * the sign in, because the pool has stopped accepting it and the row in Settings would otherwise
 * go on saying she is signed in. Every other failure leaves the item exactly as it was, so a woman
 * on a train with no signal does not come back to a sign in screen.
 *
 * The way in, the address and the day are the ones the item already holds. The day is the day she
 * signed in on this phone, and a refresh is not a sign in.
 */

/** How long the phone waits for the pool before it gives up and keeps what it holds. */
export const THE_REFRESH_WAITS_MILLISECONDS = 10_000;

/** What spending the token came to, as the one line a caller needs. */
export type WhatSpendingTheTokenCameTo =
  'sheHeldNoSignIn' | 'theTokenWasSpent' | 'sheIsSignedOut' | 'nothingChanged';

/**
 * One call with a deadline on it. A cancelled request raises rather than answering, and the sign
 * in module reads a raise as nobody reached, so a pool that never answers comes out of here as a
 * refresh that changed nothing.
 */
function withinTheDeadline(how: HowItAsks): HowItAsks {
  return async (where, asked) => {
    const give = new AbortController();
    const deadline = setTimeout(() => give.abort(), THE_REFRESH_WAITS_MILLISECONDS);

    try {
      return await how(where, { ...asked, signal: give.signal });
    } finally {
      clearTimeout(deadline);
    }
  };
}

async function spendIt(keychain: SecureStore): Promise<WhatSpendingTheTokenCameTo> {
  const kept = await readTheSignInSheKeeps(keychain);

  if (kept === null) {
    return 'sheHeldNoSignIn';
  }

  try {
    const came = await theAppSignIn.refreshHerTokens(kept.refreshToken, withinTheDeadline(fetch));

    if (came.kind === 'thePoolRefusedTheToken') {
      await forgetHerSignIn(keychain);

      return 'sheIsSignedOut';
    }

    await keepHerSignIn(keychain, {
      ...kept,
      refreshToken: came.held.refreshToken ?? kept.refreshToken,
    });

    return 'theTokenWasSpent';
  } catch {
    return 'nothingChanged';
  }
}

/** The one refresh in flight, so two triggers that arrive together wait on the same call. */
let inFlight: Promise<WhatSpendingTheTokenCameTo> | null = null;

/**
 * The refresh, at most one at a time.
 *
 * The application opens and reaches the foreground in the same moment, so both triggers fire
 * together. Two calls would spend the token twice, and where the client rotates, the second spends
 * a token the first has already replaced, which signs her out of her own account.
 */
export function spendHerRefreshToken(keychain: SecureStore): Promise<WhatSpendingTheTokenCameTo> {
  if (inFlight === null) {
    inFlight = spendIt(keychain).finally(() => {
      inFlight = null;
    });
  }

  return inFlight;
}
