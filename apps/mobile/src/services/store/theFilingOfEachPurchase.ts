import type { Database } from '../../data/database';
import { readSetting, writeSetting } from '../../data/settingRepository';
import { readDeviceKey } from '../sync/deviceKey';
import { answeredWithin, type SendRequest } from '../sync/send';
import { signRequestHeaders } from '../sync/sign';
import { vaultAddress, withoutATrailingSlash } from '../sync/vaultAddress';
import type { SecureStore } from '../vault/keychain';
import { theSubscriptionsEmiSells, type WhatTheStoreSaysAboutATransaction } from './theEntitlement';

/**
 * Contract PAY-3, the phone's half. Every transaction the App Store names reaches the server once,
 * so the server can ask Apple about it and keep the one date it keeps.
 *
 * The identifier is written down as pending before the call and cleared by the answer. That order
 * is the whole retry: a phone that stops, a radio that drops and a server that is down all leave
 * the same row behind, and the next launch reads it and files again. Nothing here depends on an
 * unfinished transaction, because a purchase is finished as soon as it is made.
 *
 * What comes back changes nothing the phone thinks she holds. The state and the date she reads are
 * worked out from the store, by `theEntitlement`, and a server that disagreed with the store would
 * be a server that can lock her out of her own diary.
 *
 * Nothing here writes a transaction identifier anywhere but the setting table. It names a sale of
 * hers, so it is never put in front of a log reader.
 */

/** The path the vault takes a filing on, which is the route of contract PAY-3. */
export const theFilingPath = '/v1/payments/store';

/**
 * Milliseconds. A filing nobody answers by now stays pending and goes again later. It is under the
 * ten seconds the api gives the function, which asks Apple before it answers.
 */
export const theFilingWaitsMilliseconds = 8000;

/** The one key the filing is held under. */
export const THE_KEY_THE_FILING_IS_HELD_UNDER = 'storeFiling';

/**
 * How many filed identifiers the row keeps. The store hands over every transaction of her Apple
 * Account for ever, and each renewal adds one, so the list is capped rather than left to grow
 * inside one setting value. An identifier that falls off the end is filed again, and the server
 * writes nothing for an event it already holds.
 */
export const theFilingsTheRowKeeps = 50;

/** Why the server would not take a filing. A screen for each one waits on a design board. */
export type WhyAFilingWasRefused = 'theStoreHoldsNoSuchSubscription' | 'anotherAccountHoldsIt';

/** What the phone holds about its filings between two launches. */
export interface WhatTheFilingHolds {
  /** The identifier waiting for an answer, written before the call and cleared by one. */
  readonly pending: string | null;
  /** The identifiers the server answered about, so a second notice of one files nothing again. */
  readonly filed: readonly string[];
  readonly refusedBecause: WhyAFilingWasRefused | null;
}

/** A phone that has filed nothing, and a row this version of Emi cannot read. */
export const nothingIsFiledYet: WhatTheFilingHolds = {
  pending: null,
  filed: [],
  refusedBecause: null,
};

/** The shape the row is read back through. A test hands one in with no database behind it. */
export interface HoldsTheFiling {
  readonly read: () => WhatTheFilingHolds;
  readonly hold: (filing: WhatTheFilingHolds) => void;
}

/** What one pass of the filing is bound to: the row, the keychain, the network and the clock. */
export interface WhatTheFilingNeeds {
  readonly holding: HoldsTheFiling;
  readonly keychain: Pick<SecureStore, 'read'>;
  readonly send: SendRequest;
  readonly now: () => Date;
  /** The vault this build talks to. Nothing is filed where the build carries no address. */
  readonly address?: string | null;
}

const theReasonsARefusalCarries: readonly WhyAFilingWasRefused[] = [
  'theStoreHoldsNoSuchSubscription',
  'anotherAccountHoldsIt',
];

function isAString(value: unknown): value is string {
  return typeof value === 'string';
}

function aRefusalOrNull(value: unknown): WhyAFilingWasRefused | null | undefined {
  if (value === null) {
    return null;
  }

  return theReasonsARefusalCarries.find((reason) => reason === value);
}

/**
 * A row this version of Emi did not write reads as nothing filed at all. The cost of that reading
 * is one filing made twice, which the server answers the same way both times.
 */
export function theFilingIn(value: string): WhatTheFilingHolds | null {
  let read: unknown;

  try {
    read = JSON.parse(value);
  } catch {
    return null;
  }

  if (typeof read !== 'object' || read === null) {
    return null;
  }

  const held = read as Record<string, unknown>;
  const pending = held.pending;
  const filed: unknown[] | null = Array.isArray(held.filed) ? held.filed : null;
  const refusedBecause = aRefusalOrNull(held.refusedBecause);

  if (pending !== null && typeof pending !== 'string') {
    return null;
  }

  if (filed === null || !filed.every(isAString) || refusedBecause === undefined) {
    return null;
  }

  return { pending, filed, refusedBecause };
}

export function theSettingTableHoldsTheFiling(database: Database): HoldsTheFiling {
  return {
    read: () => {
      const value = readSetting(database, THE_KEY_THE_FILING_IS_HELD_UNDER);

      return (value === undefined ? null : theFilingIn(value)) ?? nothingIsFiledYet;
    },
    hold: (filing) => {
      writeSetting(database, THE_KEY_THE_FILING_IS_HELD_UNDER, JSON.stringify(filing));
    },
  };
}

/** What that status means for the identifier the phone just sent. */
export function whatThatAnswerMeans(
  status: number | null,
): 'taken' | 'not-reached' | WhyAFilingWasRefused {
  if (status === 200) {
    return 'taken';
  }

  if (status === 409) {
    return 'anotherAccountHoldsIt';
  }

  // Every 400 says the same thing about this identifier: no filing of it will ever be taken, so
  // it is cleared rather than tried for ever. Anything else is read as not reached, because a
  // refusal of the signature and a server that is down cannot be told apart here.
  return status === 400 ? 'theStoreHoldsNoSuchSubscription' : 'not-reached';
}

/** The identifiers one pass files, with the pending one first. */
export function whatIsLeftToFile(
  these: readonly WhatTheStoreSaysAboutATransaction[],
  held: WhatTheFilingHolds,
): readonly string[] {
  const named = new Set(theSubscriptionsEmiSells(these).map((one) => one.transactionIdentifier));
  const waiting = held.pending === null ? [] : [held.pending];

  return [
    ...waiting,
    ...[...named].filter((one) => one !== held.pending && !held.filed.includes(one)),
  ];
}

function withThisFiled(filed: readonly string[], transaction: string): readonly string[] {
  return [...filed.filter((one) => one !== transaction), transaction].slice(-theFilingsTheRowKeeps);
}

async function fileThisOne(
  transaction: string,
  address: string,
  needs: WhatTheFilingNeeds,
): Promise<'filed' | 'not-reached'> {
  needs.holding.hold({ ...needs.holding.read(), pending: transaction });

  const key = await readDeviceKey(needs.keychain);

  if (key === null) {
    return 'not-reached';
  }

  const body = JSON.stringify({ transactionId: transaction });
  const headers = signRequestHeaders(
    key,
    { method: 'POST', path: theFilingPath, body },
    needs.now(),
  );

  let answered: { readonly status: number } | null;

  try {
    answered = await answeredWithin(
      needs.send({
        url: `${withoutATrailingSlash(address)}${theFilingPath}`,
        method: 'POST',
        headers,
        body,
      }),
      theFilingWaitsMilliseconds,
    );
  } catch {
    return 'not-reached';
  }

  const meant = whatThatAnswerMeans(answered?.status ?? null);

  if (meant === 'not-reached') {
    return 'not-reached';
  }

  const held = needs.holding.read();

  // A filing the server took means her account holds a subscription now, so a reason it refused an
  // earlier one is no longer what she would be reading.
  needs.holding.hold({
    pending: null,
    filed: withThisFiled(held.filed, transaction),
    refusedBecause: meant === 'taken' ? null : meant,
  });

  return 'filed';
}

/**
 * One pass. The pending identifier goes first, then every transaction the store named that this
 * phone has not filed. A pass stops at the first one that was not reached, because a network that
 * is down for one is down for the rest, and the row keeps that one for the next launch.
 */
export async function filesEachPurchase(
  these: readonly WhatTheStoreSaysAboutATransaction[],
  needs: WhatTheFilingNeeds,
): Promise<void> {
  const address = needs.address === undefined ? vaultAddress() : needs.address;

  if (address === null) {
    return;
  }

  for (const transaction of whatIsLeftToFile(these, needs.holding.read())) {
    if ((await fileThisOne(transaction, address, needs)) === 'not-reached') {
      return;
    }
  }
}
