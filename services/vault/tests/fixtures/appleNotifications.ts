import {
  type KeyObject,
  type KeyPairKeyObjectResult,
  generateKeyPairSync,
  sign,
} from 'node:crypto';

import { theBundleIdentifier, theYearlyProduct } from '../../src/payments/appStore';
import { didRenew } from '../../src/payments/storeEvents';
import { aTransactionId, theOriginalTransactionId } from './appStore';

/**
 * The notifications of the App Store, as Apple sends them: a real chain of certificates, a real
 * signature over the body, and a real second signature over the transaction inside it.
 *
 * Apple's own chain cannot be made here, because only Apple holds the key at the end of it. So this
 * file writes a chain of its own in the same shape, and the route is handed its root as the pinned
 * one. What that proves is the rule rather than the bytes: a chain that reaches the pinned root is
 * believed, and every chain that does not is refused. The bytes Apple publishes are pinned in
 * `src/payments/appleRoot.ts`, and `storeNotifications.test.ts` reads them there.
 *
 * Everything is written as the bytes a certificate is, with no library between this file and the
 * platform, so what the route parses is what a reader of this file can check field by field against
 * the standard.
 */

function lengthOf(count: number): Buffer {
  if (count < 0x80) {
    return Buffer.from([count]);
  }

  const bytes: number[] = [];

  for (let left = count; left > 0; left = Math.floor(left / 256)) {
    bytes.unshift(left % 256);
  }

  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

function tagged(tag: number, body: Buffer): Buffer {
  return Buffer.concat([Buffer.from([tag]), lengthOf(body.length), body]);
}

const sequence = (...parts: Buffer[]): Buffer => tagged(0x30, Buffer.concat(parts));

const set = (...parts: Buffer[]): Buffer => tagged(0x31, Buffer.concat(parts));

const yes = (): Buffer => tagged(0x01, Buffer.from([0xff]));

function integer(value: number): Buffer {
  const bytes: number[] = [];

  for (let left = value; left > 0; left = Math.floor(left / 256)) {
    bytes.unshift(left % 256);
  }

  if (bytes.length === 0) {
    bytes.push(0);
  }

  // A number whose first byte has its high bit set would read as a negative one, so a zero goes in
  // front of it.
  if ((bytes[0] as number) & 0x80) {
    bytes.unshift(0);
  }

  return tagged(0x02, Buffer.from(bytes));
}

function objectId(dotted: string): Buffer {
  const parts = dotted.split('.').map(Number);
  const bytes: number[] = [(parts[0] as number) * 40 + (parts[1] as number)];

  for (const part of parts.slice(2)) {
    const seven: number[] = [];
    let left = part;

    do {
      seven.unshift(left % 128);
      left = Math.floor(left / 128);
    } while (left > 0);

    for (let at = 0; at < seven.length - 1; at += 1) {
      seven[at] = (seven[at] as number) | 0x80;
    }

    bytes.push(...seven);
  }

  return tagged(0x06, Buffer.from(bytes));
}

/** A moment as the two digit year form a certificate writes its dates in. */
function moment(at: Date): Buffer {
  const written = at
    .toISOString()
    .replace(/[-:T]/g, '')
    .replace(/\.\d{3}/, '')
    .slice(2);

  return tagged(0x17, Buffer.from(written, 'ascii'));
}

const explicit = (number: number, body: Buffer): Buffer => tagged(0xa0 | number, body);

/** A name of one common name, which is the whole of what these certificates are named by. */
const nameOf = (common: string): Buffer =>
  sequence(set(sequence(objectId('2.5.4.3'), tagged(0x13, Buffer.from(common, 'ascii')))));

/** The one algorithm these certificates are signed with, which is the one Apple signs with. */
const theAlgorithm = (): Buffer => sequence(objectId('1.2.840.10045.4.3.2'));

/** Whether this certificate may sign another one, which is what a chain stands on. */
const theConstraint = (mayIssue: boolean): Buffer =>
  sequence(objectId('2.5.29.19'), yes(), tagged(0x04, mayIssue ? sequence(yes()) : sequence()));

/** A key pair of the curve Apple signs with. */
const aPair = (): KeyPairKeyObjectResult => generateKeyPairSync('ec', { namedCurve: 'prime256v1' });

interface WhatACertificateSays {
  /** The pair inside it. It is made outside, so the key that signs the next one is at hand. */
  readonly pair: KeyPairKeyObjectResult;
  readonly subject: string;
  readonly issuer: string;
  readonly signWith: KeyObject;
  readonly from: Date;
  readonly to: Date;
  readonly mayIssue: boolean;
  readonly serial: number;
}

/** One certificate, as base 64, which is how the header of a signed payload carries one. */
function oneCertificate(says: WhatACertificateSays): string {
  const body = sequence(
    explicit(0, integer(2)),
    integer(says.serial),
    theAlgorithm(),
    nameOf(says.issuer),
    sequence(moment(says.from), moment(says.to)),
    nameOf(says.subject),
    says.pair.publicKey.export({ type: 'spki', format: 'der' }),
    explicit(3, sequence(theConstraint(says.mayIssue))),
  );
  const signature = sign('sha256', body, { key: says.signWith, dsaEncoding: 'der' });

  return sequence(
    body,
    theAlgorithm(),
    tagged(0x03, Buffer.concat([Buffer.from([0]), signature])),
  ).toString('base64');
}

/** What one chain is: the certificates, the key the body is signed with, and the root it reaches. */
export interface WhatTheChainIs {
  /** The certificates, the one that signs first, which is the order the header carries them in. */
  readonly written: readonly string[];
  readonly signsWith: KeyObject;
  /** The root at the end of it, which a test hands the route as the pinned one. */
  readonly root: string;
}

/** How a chain is built, where a test wants one that is wrong in one way. */
export interface HowTheChainIsWrong {
  /** Every certificate of it ran out before the moment the route reads it. */
  readonly ranOut?: boolean;
  /** The middle certificate is one nothing in this chain signed, so a link of it is broken. */
  readonly broken?: boolean;
}

const theRootName = 'A pinned root';
const theIssuerName = 'The one that issues';
const longAgo = new Date('2020-01-01T00:00:00.000Z');
const faraway = new Date('2040-01-01T00:00:00.000Z');
const ranOutAlready = new Date('2021-01-01T00:00:00.000Z');

/** One chain of three certificates, the way Apple carries one on every notification it signs. */
export function aChain(wrong: HowTheChainIsWrong = {}): WhatTheChainIs {
  const from = longAgo;
  const to = wrong.ranOut === true ? ranOutAlready : faraway;
  const root = aPair();
  const middle = aPair();
  const leaf = aPair();
  const stranger = aPair();
  const written = oneCertificate({
    pair: root,
    subject: theRootName,
    issuer: theRootName,
    signWith: root.privateKey,
    from,
    to,
    mayIssue: true,
    serial: 1,
  });
  const issues = oneCertificate({
    pair: middle,
    subject: theIssuerName,
    issuer: theRootName,
    // A certificate of nobody's chain, where a test asks for a broken link: it carries the same
    // name as the one it stands in for, and no certificate of this chain signed it.
    signWith: wrong.broken === true ? stranger.privateKey : root.privateKey,
    from,
    to,
    mayIssue: true,
    serial: 2,
  });
  const signs = oneCertificate({
    pair: leaf,
    subject: 'The one that signs',
    issuer: theIssuerName,
    signWith: middle.privateKey,
    from,
    to,
    mayIssue: false,
    serial: 3,
  });

  return { written: [signs, issues, written], signsWith: leaf.privateKey, root: written };
}

/** The chain this file signs with, and the root a test pins against it. */
export const theChainApplePresents = aChain();

/** The pinned roots a test hands the route, which hold the root of the chain above and no other. */
export const thePinnedRoots: readonly string[] = [theChainApplePresents.root];

/** A chain of its own, whose root nothing pins, so every notification signed under it is refused. */
export const theChainOfAStranger = aChain();

function base64UrlOf(held: unknown): string {
  return Buffer.from(JSON.stringify(held), 'utf8').toString('base64url');
}

/** How a signed payload is built, where a test wants one that is wrong in one way. */
export interface HowThePayloadIsSigned {
  readonly chain?: WhatTheChainIs;
  /** Signed by a key that is in no certificate of the chain it carries. */
  readonly byAnotherKey?: boolean;
  /** An algorithm this service does not verify, named in the header. */
  readonly algorithm?: string;
  /** The chain left out of the header altogether. */
  readonly withNoChain?: boolean;
}

/** One payload, signed the way Apple signs the body of a notification and the transaction in it. */
export function aSignedPayload(payload: unknown, signed: HowThePayloadIsSigned = {}): string {
  const chain = signed.chain ?? theChainApplePresents;
  const header = base64UrlOf({
    alg: signed.algorithm ?? 'ES256',
    ...(signed.withNoChain === true ? {} : { x5c: chain.written }),
  });
  const body = base64UrlOf(payload);
  const signsWith =
    signed.byAnotherKey === true
      ? generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey
      : chain.signsWith;
  const signature = sign('sha256', Buffer.from(`${header}.${body}`, 'utf8'), {
    key: signsWith,
    dsaEncoding: 'ieee-p1363',
  });

  return `${header}.${body}.${signature.toString('base64url')}`;
}

/** What the transaction inside a notification says, where a test wants it to say something else. */
export interface WhatTheTransactionSays {
  readonly originalTransactionId?: string;
  readonly productId?: string;
  readonly bundleId?: string;
  readonly environment?: string;
  readonly expiresDate?: number | null;
  readonly revocationDate?: number;
  readonly signedDate?: number;
}

/** What one notification says, where a test wants it to say something else. */
export interface WhatANotificationSays {
  readonly type?: string;
  readonly subtype?: string | null;
  /** The instant Apple signed the notification at, which orders one write against another. */
  readonly notifiedAt?: string;
  /** The environment the body names, which the transaction inside it has to agree with. */
  readonly environment?: string;
  readonly transaction?: WhatTheTransactionSays;
  /** The transaction left out of the body, where a test wants a body with nothing in it. */
  readonly withNoTransaction?: boolean;
  readonly signed?: HowThePayloadIsSigned;
}

/** The instant the yearly plan she bought runs to, which is the date a renewal writes. */
export const paidUntilNextYear = '2027-11-24T09:00:00.000Z';

/** The transaction payload of one notification, signed under the same chain as the body. */
export function aSignedTransaction(says: WhatTheTransactionSays = {}): string {
  const expiresDate =
    says.expiresDate === undefined ? Date.parse(paidUntilNextYear) : says.expiresDate;

  return aSignedPayload({
    transactionId: aTransactionId,
    originalTransactionId: says.originalTransactionId ?? theOriginalTransactionId,
    productId: says.productId ?? theYearlyProduct,
    bundleId: says.bundleId ?? theBundleIdentifier,
    environment: says.environment ?? 'Production',
    type: 'Auto-Renewable Subscription',
    inAppOwnershipType: 'PURCHASED',
    signedDate: says.signedDate ?? Date.parse('2026-11-24T09:00:00.000Z'),
    purchaseDate: Date.parse('2026-11-24T08:59:00.000Z'),
    ...(expiresDate === null ? {} : { expiresDate }),
    ...(says.revocationDate === undefined ? {} : { revocationDate: says.revocationDate }),
    // The price and the storefront are in every real notification, and this route reads neither.
    price: 39000,
    currency: 'EUR',
    storefront: 'DEU',
  });
}

/** The body App Store Connect posts to the route, which is one signed payload and nothing else. */
export function aNotification(says: WhatANotificationSays = {}): string {
  const environment = says.environment ?? 'Production';
  const signedPayload = aSignedPayload(
    {
      notificationType: says.type ?? didRenew,
      ...(says.subtype === undefined || says.subtype === null ? {} : { subtype: says.subtype }),
      notificationUUID: '002e14d5-51f5-4503-b5a8-c3a1af68eb20',
      version: '2.0',
      signedDate: Date.parse(says.notifiedAt ?? '2026-11-24T10:00:00.000Z'),
      data: {
        appAppleId: 6815742770,
        bundleId: theBundleIdentifier,
        bundleVersion: '1',
        environment,
        status: 1,
        ...(says.withNoTransaction === true
          ? {}
          : {
              signedTransactionInfo: aSignedTransaction({
                environment,
                ...says.transaction,
              }),
            }),
        signedRenewalInfo: aSignedPayload({ autoRenewStatus: 1 }, says.signed),
      },
    },
    says.signed,
  );

  return JSON.stringify({ signedPayload });
}
