import type { HttpRequestEvent } from '../api';

/**
 * Who is paying, read out of the token the api gateway already believed.
 *
 * The token authorizer in front of the route checks the signature, the issuer and the audience, so
 * a request that reaches this code carries a token of this pool minted for a client of it. What is
 * read here is the one claim the payer digest is cut from, and the issuer is read again beside it:
 * the digest is cut under a pool identifier, so a token of another pool would open a partition of
 * its own under the same user name.
 */

/** The claim the pool user name travels in. The site needs no link endpoint to learn it. */
export const userNameClaim = 'cognito:username';

/** Every way a payer is not read, as a value, so a test matches the reason and not the words. */
export type PoolTokenRefusal = 'no-token' | 'another-pool' | 'no-user-name';

/** The pool user name the token names, or the reason it names none. */
export type PoolTokenRead = { readonly userName: string } | { readonly refusal: PoolTokenRefusal };

/**
 * The address a token of one pool is issued by. The pool identifier opens with its own region, so
 * this is worked out rather than carried as a second value that could disagree with the first.
 */
export function issuerOfPool(poolId: string): string {
  return `https://cognito-idp.${poolId.slice(0, poolId.indexOf('_'))}.amazonaws.com/${poolId}`;
}

/** The pool user name her token names, read against the pool this function is bound to. */
export function payerNameIn(event: HttpRequestEvent, poolId: string): PoolTokenRead {
  const claims = event.requestContext.authorizer?.jwt?.claims;

  if (claims === undefined || poolId.length === 0 || !poolId.includes('_')) {
    return { refusal: 'no-token' };
  }

  if (claims.iss !== issuerOfPool(poolId)) {
    return { refusal: 'another-pool' };
  }

  const userName = claims[userNameClaim];

  return userName === undefined || userName.length === 0
    ? { refusal: 'no-user-name' }
    : { userName };
}
