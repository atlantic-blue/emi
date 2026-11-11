/**
 * The policy every page of the site answers with, and the nonce that makes it possible.
 *
 * Next.js draws a page with inline scripts: the markup carries the data the page hydrates from,
 * and a script tag runs it. A policy that names no nonce refuses every one of them, so the page
 * arrives and nothing on it runs. `'unsafe-inline'` would let them all run, and with it any script
 * anybody managed to write into the markup, so the nonce is the way: one fresh value for each
 * response, named in the policy and set on the tags of that response alone.
 *
 * `'strict-dynamic'` is what lets a script that carries the nonce load the chunks of the page by
 * name, which is how Next.js loads them, without naming any of those addresses here.
 */

import { THE_SIGN_IN_HOST } from './theProviderSignIn';
import { THE_POOL_HOST } from './theSignIn';
import { THE_API_HOST } from './theTelegramSignIn';

/** The name the policy travels under, in a request and in a response alike. */
export const POLICY_HEADER = 'content-security-policy';

/**
 * 16 bytes, which is 128 bits. A nonce is a value an attacker must not be able to guess before the
 * response carrying it arrives, and 128 bits is the floor the step sets for that.
 */
export const NONCE_BYTES = 16;

/** A fresh nonce, from the random source of the platform, written the way a header carries it. */
export function aNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));

  return btoa(String.fromCharCode(...bytes));
}

/**
 * The policy that allows one nonce and nothing else inline. Everything a page loads comes from
 * this origin, nothing reaches another host, and no page of Emi may be put in a frame.
 */
export function policyAllowing(nonce: string): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' data:`,
    `font-src 'self'`,
    // The sign in page asks Amazon Cognito for a code and answers it with six digits, from her
    // browser, because the service issues the tokens to the browser and no server of this site
    // sees them. The page she comes back to from Apple or from Google exchanges a code at the
    // address the pool answers on, which is the second host. The page Telegram sends her back to
    // hands its code to the sign in function of the api, which is the third. Those three, and no
    // other: a policy naming every host would let a script somebody managed to write into a page
    // send what she typed anywhere.
    //
    // The host Telegram asks her on is in no directive. Her browser leaves the site for it, and a
    // page she has left is a page that is asking nobody for anything.
    `connect-src 'self' ${THE_POOL_HOST} ${THE_SIGN_IN_HOST} ${THE_API_HOST}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join('; ');
}
