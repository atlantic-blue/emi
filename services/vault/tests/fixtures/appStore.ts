import { generateKeyPairSync, verify } from 'node:crypto';

import {
  type AnsweredByTheAppStore,
  type AskedOfTheAppStore,
  type ReachesTheAppStore,
  type StoreEnvironment,
  theBundleIdentifier,
  theHostOf,
  theYearlyProduct,
  transactionIsNotHere,
} from '../../src/payments/appStore';

/**
 * The App Store Server api, as far as the filing reaches it: a double that answers what Apple
 * answers, and records every call so a test reads the address and the token the function sent.
 *
 * It answers by host rather than in order, so a read made against the wrong environment fails here
 * rather than passing against a double that shrugged. It verifies the token the same way Apple
 * does, against the public half of the key the credential below carries, and answers 401 to a call
 * that carries no signature of that key.
 */

/** One call, as it left the function. */
export interface OneStoreCall {
  readonly address: string;
  readonly asked: AskedOfTheAppStore;
}

/** One last transaction of the subscription group, as a test wants Apple to answer it. */
export interface ATransaction {
  readonly originalTransactionId?: string;
  readonly productId?: string;
  readonly status?: number;
  /** The expiry, in the milliseconds Apple writes every instant in. */
  readonly expiresDate?: number;
  readonly revocationDate?: number;
  readonly signedDate?: number;
  /** The environment the payload itself names, where a test wants it to disagree with the host. */
  readonly environment?: string;
  readonly bundleId?: string;
}

/** What a test drives the double with. */
export interface WhatTheStoreAnswers {
  /**
   * Which environment holds the transaction. The other one answers that it holds no such one, and
   * `nowhere` is the transaction Apple has never heard of, which both of them refuse.
   */
  readonly heldIn?: StoreEnvironment | 'nowhere';
  /** The environment the answer names, where a test wants it to disagree with the host asked. */
  readonly answersFor?: string;
  /** The application the answer names, where a test wants another one. */
  readonly aboutTheApplication?: string;
  /** The last transactions of the one subscription group, in the order Apple lists them. */
  readonly transactions?: readonly ATransaction[];
  /** A status and a body for the read, where the test wants a refusal instead. */
  readonly refuses?: AnsweredByTheAppStore;
}

/** The double, and the calls it took. */
export interface FakeAppStore {
  readonly reaches: ReachesTheAppStore;
  calls(): OneStoreCall[];
  /** The claims of the token one call carried, so a test reads what the function signed. */
  claimsOf(call: OneStoreCall): Readonly<Record<string, unknown>>;
  /** The header of that token, which names the key and the algorithm. */
  headerOf(call: OneStoreCall): Readonly<Record<string, unknown>>;
  /** Every environment that was asked, in the order the calls were made. */
  environmentsAsked(): StoreEnvironment[];
}

/** The identifier the phone files, which is the transaction of her last renewal. */
export const aTransactionId = '2000000845620001';

/** The identifier that survives every renewal, which is what Apple answers with. */
export const theOriginalTransactionId = '2000000845620000';

/** The key identifier and the issuer identifier App Store Connect shows beside a key. */
export const aKeyIdentifier = '2X9R4HXF34';
export const anIssuerIdentifier = '57246542-96fe-1a63e053-0824d011072a';

const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });

/** The credential the parameter holds, with a key pair this run made. */
export const theCredential = JSON.stringify({
  keyIdentifier: aKeyIdentifier,
  issuerIdentifier: anIssuerIdentifier,
  privateKey: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
});

/** A credential of the right shape whose key is a second one, so a wrong signature is drivable. */
export const anotherCredential = JSON.stringify({
  keyIdentifier: aKeyIdentifier,
  issuerIdentifier: anIssuerIdentifier,
  privateKey: generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
    .privateKey.export({ type: 'pkcs8', format: 'pem' })
    .toString(),
});

function base64UrlOf(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64url');
}

function jsonIn(part: string | undefined): Readonly<Record<string, unknown>> {
  try {
    return JSON.parse(Buffer.from(part ?? '', 'base64url').toString('utf8')) as Readonly<
      Record<string, unknown>
    >;
  } catch {
    return {};
  }
}

function tokenIn(asked: AskedOfTheAppStore): string[] {
  return (asked.headers.authorization ?? '').replace('Bearer ', '').split('.');
}

/**
 * Whether the token verifies against the key of the credential above. The signature is read in the
 * pair form, which is the form a JSON Web Signature carries and not the one node writes by default.
 */
function tokenVerifies(asked: AskedOfTheAppStore): boolean {
  const [header, payload, signature] = tokenIn(asked);

  if (header === undefined || payload === undefined || signature === undefined) {
    return false;
  }

  return verify(
    'sha256',
    new TextEncoder().encode(`${header}.${payload}`),
    { key: pair.publicKey, dsaEncoding: 'ieee-p1363' },
    Buffer.from(signature, 'base64url'),
  );
}

/**
 * One transaction, signed the way Apple signs one. The signature is a stand in: the filing reads
 * this payload off the answer to its own authorized call, so it checks no chain, and a real
 * signature here would prove nothing the token above does not already prove.
 */
function signedTransaction(held: ATransaction, environment: StoreEnvironment): string {
  const payload = {
    transactionId: aTransactionId,
    originalTransactionId: held.originalTransactionId ?? theOriginalTransactionId,
    productId: held.productId ?? theYearlyProduct,
    bundleId: held.bundleId ?? theBundleIdentifier,
    environment: held.environment ?? environment,
    type: 'Auto-Renewable Subscription',
    inAppOwnershipType: 'PURCHASED',
    signedDate: held.signedDate ?? Date.parse('2026-11-24T09:00:00.000Z'),
    purchaseDate: Date.parse('2026-11-24T08:59:00.000Z'),
    ...(held.expiresDate === undefined ? {} : { expiresDate: held.expiresDate }),
    ...(held.revocationDate === undefined ? {} : { revocationDate: held.revocationDate }),
    // The price and the storefront are in every real answer, and the filing reads neither.
    price: 39000,
    currency: 'EUR',
    storefront: 'DEU',
  };

  return [
    base64UrlOf(JSON.stringify({ alg: 'ES256', x5c: ['the-double-signed-this'] })),
    base64UrlOf(JSON.stringify(payload)),
    base64UrlOf('the-double-signed-this'),
  ].join('.');
}

/** An answer that holds one transaction of the yearly plan, paid until the instant given. */
export const paidUntil = (expiresDate: string, held: ATransaction = {}): ATransaction => ({
  status: 1,
  expiresDate: Date.parse(expiresDate),
  ...held,
});

/** A store that answers the way Apple answers, for everything the filing asks it. */
export function fakeAppStore(answers: WhatTheStoreAnswers = {}): FakeAppStore {
  const calls: OneStoreCall[] = [];
  const heldIn = answers.heldIn ?? 'Production';

  const environmentOf = (address: string): StoreEnvironment | undefined =>
    (['Production', 'Sandbox'] as const).find((one) => address.startsWith(theHostOf[one]));

  return {
    calls: () => [...calls],
    claimsOf: (call) => jsonIn(tokenIn(call.asked)[1]),
    headerOf: (call) => jsonIn(tokenIn(call.asked)[0]),
    environmentsAsked: () =>
      calls
        .map((call) => environmentOf(call.address))
        .filter((one): one is StoreEnvironment => one !== undefined),

    reaches: (address: string, asked: AskedOfTheAppStore): Promise<AnsweredByTheAppStore> => {
      calls.push({ address, asked });

      const environment = environmentOf(address);

      if (environment === undefined) {
        return Promise.resolve({ status: 500, body: JSON.stringify({ errorCode: 5000000 }) });
      }

      // Apple refuses a call whose token it cannot verify, so this one does too: a function that
      // signed a token wrongly reads a refusal here rather than an answer.
      if (!tokenVerifies(asked)) {
        return Promise.resolve({ status: 401, body: '' });
      }

      if (answers.refuses !== undefined) {
        return Promise.resolve(answers.refuses);
      }

      if (environment !== heldIn) {
        return Promise.resolve({
          status: transactionIsNotHere,
          body: JSON.stringify({
            errorCode: 4040010,
            errorMessage: 'Transaction id not found.',
          }),
        });
      }

      return Promise.resolve({
        status: 200,
        body: JSON.stringify({
          environment: answers.answersFor ?? environment,
          bundleId: answers.aboutTheApplication ?? theBundleIdentifier,
          appAppleId: 6815742770,
          data: [
            {
              subscriptionGroupIdentifier: '21500011',
              lastTransactions: (
                answers.transactions ?? [paidUntil('2027-11-24T09:00:00.000Z')]
              ).map((held) => ({
                originalTransactionId: held.originalTransactionId ?? theOriginalTransactionId,
                status: held.status ?? 1,
                signedTransactionInfo: signedTransaction(held, environment),
                signedRenewalInfo: 'the-filing-reads-no-renewal-information',
              })),
            },
          ],
        }),
      });
    },
  };
}
