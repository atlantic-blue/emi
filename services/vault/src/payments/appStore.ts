import { createPrivateKey, sign } from 'node:crypto';

import { base64Of } from '@emi/crypto';

import { bytesFromBase64Url } from '../telegram/identityToken';
import type { EntitlementState } from './entitlements';

/**
 * The App Store Server api, as far as the filing reaches it: where it is, what one call carries,
 * and what the answer says about one subscription.
 *
 * Every call travels through one port, so a test reads the address, the headers and the token the
 * function actually sent. The credential is an argument rather than a value this module holds,
 * because it is read from the parameter store when a container starts and never from the
 * environment of a function.
 *
 * Apple is asked about a transaction identifier and nothing else. No account identifier, no record
 * identifier and no day of hers reaches this api.
 */

/** Where a production transaction is read. Apple writes `/inApps` with that capital letter. */
export const appStoreProduction = 'https://api.storekit.apple.com';

/** Where a sandbox transaction is read. It is a host of its own and not a parameter of a call. */
export const appStoreSandbox = 'https://api.storekit-sandbox.apple.com';

/** The two words Apple writes an environment as, in an answer and in every signed payload. */
export type StoreEnvironment = 'Production' | 'Sandbox';

/** Which host answers for which environment, so no call site works one out for itself. */
export const theHostOf: Readonly<Record<StoreEnvironment, string>> = {
  Production: appStoreProduction,
  Sandbox: appStoreSandbox,
};

/**
 * The order the two environments are asked in. A transaction identifier belongs to one of them and
 * not to both, and Apple answers 404 for the one it does not belong to. So production is asked
 * first and the sandbox only after that answer, which is the rule Apple states as "You're making
 * the request in the same environment, production or sandbox, that generated the transaction ID".
 */
export const theEnvironmentsInOrder: readonly StoreEnvironment[] = ['Production', 'Sandbox'];

/** The name this store writes on the account item, which is the store field of contract PAY-5. */
export const theAppleStore = 'apple';

/** The yearly plan of contract PAY-1, which carries the one free month. */
export const theYearlyProduct = 'blue.atlantic.emi.yearly';

/** The monthly plan of contract PAY-1, which carries no offer. */
export const theMonthlyProduct = 'blue.atlantic.emi.monthly';

/** The Black Friday product of contract PAY-1, at half the yearly price on every renewal. */
export const theHalfPriceProduct = 'blue.atlantic.emi.yearly.halfprice';

/**
 * The three products contract PAY-1 names. A transaction for anything else is refused and written
 * nowhere, because a date on her account has to come from something Emi sold.
 */
export const theProductsOnSale: readonly string[] = [
  theYearlyProduct,
  theMonthlyProduct,
  theHalfPriceProduct,
];

/**
 * The bundle identifier the application ships under. The token names it, Apple reads it, and an
 * answer about another application is refused here as well.
 */
export const theBundleIdentifier = 'blue.atlantic.emi';

/** Where the statuses of every subscription of one customer are read. */
export function subscriptionStatusAddress(host: string, transactionId: string): string {
  return `${host}/inApps/v1/subscriptions/${encodeURIComponent(transactionId)}`;
}

/** What one call carries. Every call this module makes is a read, so none of them has a body. */
export interface AskedOfTheAppStore {
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
}

/** What one call comes back with, as the status and the text. */
export interface AnsweredByTheAppStore {
  readonly status: number;
  readonly body: string;
}

/** How this module reaches Apple. A test hands it one that answers without a network. */
export type ReachesTheAppStore = (
  address: string,
  asked: AskedOfTheAppStore,
) => Promise<AnsweredByTheAppStore>;

/**
 * The credential App Store Connect issues for the api: the key identifier, the issuer identifier,
 * and the private key a token is signed with. The three are issued together, so they are read from
 * one parameter rather than from three that could disagree.
 */
export interface AppStoreCredential {
  readonly keyIdentifier: string;
  readonly issuerIdentifier: string;
  /** The key as App Store Connect downloads it, which is text and not bytes. */
  readonly privateKey: string;
}

/** Every way a call of Apple fails, as a value, so a caller matches a reason and not words. */
export type AppStoreRefusal =
  | 'the-credential-is-not-readable'
  | 'the-call-was-refused'
  | 'the-answer-names-no-subscription'
  | 'the-answer-came-from-another-environment'
  | 'the-answer-names-another-application'
  | 'that-transaction-is-in-no-environment'
  | 'the-product-is-not-one-emi-sells';

/**
 * Raised when a call does not come back with the subscription it asked about. The message carries
 * the status and the environment, and never the body: a message reaches a log line, and an answer
 * about a subscription carries the transaction Apple signed.
 */
export class AppStoreError extends Error {
  readonly refusal: AppStoreRefusal;

  constructor(refusal: AppStoreRefusal, message: string) {
    super(message);
    this.name = 'AppStoreError';
    this.refusal = refusal;
  }
}

/** The one way a token is signed. Apple: "All JWTs must be signed with ES256 encryption". */
export const tokenAlgorithm = 'ES256';

/** The type a token header names, which Apple writes as the three letters of the standard. */
export const tokenType = 'JWT';

/** Who a token is for. Apple takes this one value for every call of this api. */
export const tokenAudience = 'appstoreconnect-v1';

/**
 * Seconds one token is good for. Apple refuses a token that expires more than sixty minutes after
 * it was issued, and a token is made for each call, so half of that window is room for a clock
 * that runs a little behind rather than something anybody has to keep.
 */
export const tokenLifetimeSeconds = 1800;

/** The address safe alphabet a token writes its three parts in, with the padding dropped. */
function base64UrlOf(bytes: Uint8Array): string {
  return base64Of(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function partOf(held: unknown): string {
  return base64UrlOf(new TextEncoder().encode(JSON.stringify(held)));
}

/**
 * The credential as the parameter holds it, raised on unless all three parts are there. The
 * parameter is written by hand, so the shape is read rather than assumed: a value with a part
 * missing would sign a token Apple refuses, and every filing would then read as Apple being down.
 */
export function credentialIn(written: string): AppStoreCredential {
  let read: Readonly<Record<string, unknown>> = {};

  try {
    read = (JSON.parse(written) as Readonly<Record<string, unknown>> | null) ?? {};
  } catch {
    read = {};
  }

  const keyIdentifier = textIn(read.keyIdentifier);
  const issuerIdentifier = textIn(read.issuerIdentifier);
  const privateKey = textIn(read.privateKey);

  if (keyIdentifier === null || issuerIdentifier === null || privateKey === null) {
    throw new AppStoreError(
      'the-credential-is-not-readable',
      'the App Store credential holds a key identifier, an issuer identifier and a private key',
    );
  }

  return { keyIdentifier, issuerIdentifier, privateKey };
}

/**
 * The authorization one call carries, which is a token signed with the store credential and good
 * for the next half hour.
 *
 * The signature is asked for in the pair form rather than in the form node writes by default. A
 * JSON Web Signature carries the two numbers of an elliptic curve signature one after the other,
 * and the default wraps them in a structure Apple reads as a signature that does not verify.
 */
export function authorizationFor(credential: AppStoreCredential, now: Date): string {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const header = partOf({ alg: tokenAlgorithm, kid: credential.keyIdentifier, typ: tokenType });
  const payload = partOf({
    iss: credential.issuerIdentifier,
    iat: issuedAt,
    exp: issuedAt + tokenLifetimeSeconds,
    aud: tokenAudience,
    bid: theBundleIdentifier,
  });
  const signed = sign('sha256', new TextEncoder().encode(`${header}.${payload}`), {
    key: createPrivateKey(credential.privateKey),
    dsaEncoding: 'ieee-p1363',
  });

  return `Bearer ${header}.${payload}.${base64UrlOf(new Uint8Array(signed))}`;
}

/** The headers every call carries. The token is here and in no other line of this service. */
export function storeHeadersFor(credential: AppStoreCredential, now: Date): Record<string, string> {
  return { authorization: authorizationFor(credential, now) };
}

/** What a call is bound to: one way of reaching Apple, the credential, and the instant. */
export interface WhatAStoreCallHolds {
  readonly reaches: ReachesTheAppStore;
  readonly credential: AppStoreCredential;
  readonly now: Date;
}

/** Apple: "The auto-renewable subscription is active." */
export const statusIsActive = 1;

/** Apple: "The auto-renewable subscription is expired." */
export const statusIsExpired = 2;

/** Apple: "The auto-renewable subscription is in a billing retry period." */
export const statusIsInBillingRetry = 3;

/** Apple: "The auto-renewable subscription is in a Billing Grace Period." */
export const statusIsInGracePeriod = 4;

/** Apple: "The auto-renewable subscription is revoked", which is a refund or a revocation. */
export const statusIsRevoked = 5;

/** What Apple answers a transaction that belongs to the other environment with. */
export const transactionIsNotHere = 404;

/**
 * What the filing takes out of Apple's answer, and the whole of it. The price she paid, the country
 * she paid from and the Apple Account she paid with are each in that answer, and none of them is
 * read.
 */
export interface TheSubscriptionAppleHolds {
  /** The identifier that survives every renewal, which is what the pointer item is named by. */
  readonly originalTransactionId: string;
  /** Which of the three products of contract PAY-1 she holds. */
  readonly productId: string;
  /** Which environment answered, which is the environment the call was made against. */
  readonly environment: StoreEnvironment;
  /** The instant she is paid until, or the instant of the refund where there was one. */
  readonly paidUntil: string;
  /** Where the subscription stands, in the words of contract PAY-5. */
  readonly state: EntitlementState;
  /** The seconds Apple signed the transaction at, which orders one write against another. */
  readonly signedAt: number;
}

/** Apple's answer for one environment, or the word that says the transaction is not in it. */
export type WhatTheStoreSaid = TheSubscriptionAppleHolds | 'no-such-transaction';

interface SignedTransaction {
  readonly originalTransactionId?: unknown;
  readonly productId?: unknown;
  readonly bundleId?: unknown;
  readonly environment?: unknown;
  readonly expiresDate?: unknown;
  readonly revocationDate?: unknown;
  readonly signedDate?: unknown;
}

interface LastTransaction {
  readonly status?: unknown;
  readonly signedTransactionInfo?: unknown;
}

interface StatusAnswer {
  readonly environment?: unknown;
  readonly bundleId?: unknown;
  readonly data?: unknown;
}

function textIn(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function millisecondsIn(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * The payload of one transaction Apple signed. The signature is not checked, and that is
 * deliberate: this payload arrives inside the answer to a call this service made itself, over
 * Transport Layer Security, authorized by a token only this service can sign. The route that takes
 * a body Apple posts holds no such proof, so that one verifies the chain before it reads a field.
 */
function transactionIn(signed: unknown): SignedTransaction | null {
  const parts = textIn(signed)?.split('.') ?? [];
  const payload = parts.length === 3 ? parts[1] : undefined;

  if (payload === undefined) {
    return null;
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytesFromBase64Url(payload))) as SignedTransaction;
  } catch {
    return null;
  }
}

/**
 * Where one transaction leaves her, in the words of contract PAY-5. A refund is read before a
 * status, because Apple carries the instant of it on the transaction itself and that instant is
 * what the date becomes. Billing retry and the grace period both read as paid: she is inside the
 * period she bought, and contract PAY-4 keeps a lapse humane.
 *
 * No filing writes `cancelling`. That is the renewal she turned off, and the notification which
 * says so is what writes it.
 */
function stateOf(status: number, revoked: boolean): EntitlementState {
  if (revoked || status === statusIsRevoked) {
    return 'refunded';
  }

  return status === statusIsExpired ? 'lapsed' : 'active';
}

function subscriptionIn(
  last: LastTransaction,
  asked: StoreEnvironment,
): TheSubscriptionAppleHolds | null {
  const read = transactionIn(last.signedTransactionInfo);

  if (read === null || typeof last.status !== 'number') {
    return null;
  }

  // The payload names its own environment and its own application, beside the answer that carries
  // it, so a transaction of one environment inside an answer of the other is dropped rather than
  // read.
  if (read.environment !== asked || read.bundleId !== theBundleIdentifier) {
    return null;
  }

  const originalTransactionId = textIn(read.originalTransactionId);
  const productId = textIn(read.productId);
  const signedDate = millisecondsIn(read.signedDate);
  const revocationDate = millisecondsIn(read.revocationDate);
  const paidUntil = revocationDate ?? millisecondsIn(read.expiresDate);

  if (
    originalTransactionId === null ||
    productId === null ||
    signedDate === null ||
    paidUntil === null
  ) {
    return null;
  }

  return {
    originalTransactionId,
    productId,
    environment: asked,
    paidUntil: new Date(paidUntil).toISOString(),
    state: stateOf(last.status, revocationDate !== null),
    signedAt: Math.floor(signedDate / 1000),
  };
}

function lastTransactionsIn(answered: StatusAnswer): LastTransaction[] {
  return (Array.isArray(answered.data) ? answered.data : []).flatMap((group) => {
    const held = (group ?? {}) as { readonly lastTransactions?: unknown };

    return Array.isArray(held.lastTransactions) ? (held.lastTransactions as LastTransaction[]) : [];
  });
}

/**
 * The subscription Apple holds in one environment, read off one call.
 *
 * The furthest date wins where she holds more than one. A woman who moves between the yearly plan
 * and the monthly plan holds both of them for a while, and the one she is paid under is the one
 * that runs longest. A refunded transaction carries the instant of its refund, so it never wins
 * over a subscription that is still running.
 */
export async function subscriptionInEnvironment(
  held: WhatAStoreCallHolds,
  environment: StoreEnvironment,
  transactionId: string,
): Promise<WhatTheStoreSaid> {
  const answered = await held.reaches(
    subscriptionStatusAddress(theHostOf[environment], transactionId),
    { method: 'GET', headers: storeHeadersFor(held.credential, held.now) },
  );

  if (answered.status === transactionIsNotHere) {
    return 'no-such-transaction';
  }

  if (answered.status < 200 || answered.status >= 300) {
    throw new AppStoreError(
      'the-call-was-refused',
      `the App Store answered ${answered.status} to a read of a ${environment} subscription`,
    );
  }

  let read: StatusAnswer;

  try {
    read = JSON.parse(answered.body) as StatusAnswer;
  } catch {
    throw new AppStoreError(
      'the-answer-names-no-subscription',
      'the App Store answered no readable subscription',
    );
  }

  if (read.environment !== environment) {
    throw new AppStoreError(
      'the-answer-came-from-another-environment',
      `a read of ${environment} was answered for another environment`,
    );
  }

  if (read.bundleId !== theBundleIdentifier) {
    throw new AppStoreError(
      'the-answer-names-another-application',
      'the App Store answered about another application',
    );
  }

  const readable = lastTransactionsIn(read)
    .map((last) => subscriptionIn(last, environment))
    .filter((one): one is TheSubscriptionAppleHolds => one !== null);

  if (readable.length === 0) {
    throw new AppStoreError(
      'the-answer-names-no-subscription',
      `a read of ${environment} named no subscription this service can read`,
    );
  }

  const sold = readable.filter((one) => theProductsOnSale.includes(one.productId));

  if (sold.length === 0) {
    throw new AppStoreError(
      'the-product-is-not-one-emi-sells',
      'that transaction is for a product Emi does not sell',
    );
  }

  return sold.reduce((furthest, one) => (one.paidUntil > furthest.paidUntil ? one : furthest));
}

/**
 * The subscription, found in whichever environment holds the transaction.
 *
 * Production is asked first, and the sandbox only where production answers that it holds no such
 * transaction. So a sandbox purchase is never read against production, and a real purchase is never
 * read against the sandbox.
 */
export async function theSubscriptionFor(
  held: WhatAStoreCallHolds,
  transactionId: string,
): Promise<TheSubscriptionAppleHolds> {
  for (const environment of theEnvironmentsInOrder) {
    const said = await subscriptionInEnvironment(held, environment, transactionId);

    if (said !== 'no-such-transaction') {
      return said;
    }
  }

  throw new AppStoreError(
    'that-transaction-is-in-no-environment',
    'the App Store holds no subscription for that transaction',
  );
}
