import type { HoldsTheAnswer } from './theAnswerThePhoneHolds';
import type {
  ReadsWhatSheHoldsInTheStore,
  WhatSheIsEntitledTo,
  WhatSheIsEntitledToNow,
  WhatTheStoreSaysAboutATransaction,
} from './theEntitlement';
import { theStatesSheCanBeIn } from './theEntitlement';
import { theStatesAWriteIsRefusedIn } from './theWriteGate';
import {
  type FilesWhatTheStoreNamed,
  filesNothing,
  theEntitlementWhenSheOpens,
} from './theEntitlementWhenSheOpens';

/**
 * Contract PAY-2. She presses a plan, and this is everything between the press and the state the
 * screen reads back.
 *
 * The App Store takes the money, so nothing here holds a card, a country or an amount. The press
 * reaches the store, the store answers, the transaction is finished, and then the entitlement is
 * worked out again through the launch read. One route writes that answer, so a purchase and a
 * launch leave the phone holding the same shape.
 *
 * Restoring is the same route with the store's own restore in front of it. Apple allows that call
 * only in answer to a press, so it is here and never on a launch.
 */

/** What the store did with a press, which is the one word the screen reads. */
export type WhatTheStoreDid = 'itAnswered' | 'sheCancelled' | 'itRefusedThePress';

/**
 * The code the purchase library writes where she pressed cancel in the system sheet. Cancelling is
 * an answer and not a fault, so it is told apart from every other refusal by this value.
 */
export const THE_CODE_FOR_A_PURCHASE_SHE_CANCELLED = 'user-cancelled';

/** The one state this screen exists for, which is the one state no purchase can leave her in. */
export const THE_STATE_THE_PAYWALL_HOLDS = 'neverPaid';

/**
 * The states that let her into Emi: every state a write is allowed in, less the one this screen
 * holds her on.
 *
 * It is worked out from the write gate rather than written again, because two lists of paid
 * states drift until a woman is let past this screen into a product that refuses her writes. A
 * woman who stopped the renewal keeps every day of the period she paid for, so cancelling is one
 * of them, and a restore can land on it.
 */
export const theStatesThatLetHerIn: readonly WhatSheIsEntitledTo[] = theStatesSheCanBeIn.filter(
  (state) => state !== THE_STATE_THE_PAYWALL_HOLDS && !theStatesAWriteIsRefusedIn.includes(state),
);

export function sheIsPaidUp(answer: WhatSheIsEntitledToNow | null): boolean {
  return answer !== null && theStatesThatLetHerIn.includes(answer.state);
}

/** One transaction the store made, and the way to take it off the queue. */
export interface ThePurchaseTheStoreMade {
  readonly transaction: WhatTheStoreSaysAboutATransaction;
  /**
   * Finishing tells the App Store the application has dealt with the transaction. An unfinished
   * one is handed to the application again on every launch, for ever.
   */
  readonly finish: () => Promise<void>;
}

/**
 * How this half reaches the store. A test hands it one that answers without a store, and the phone
 * hands it the purchase library.
 */
export interface BuysInTheStore extends ReadsWhatSheHoldsInTheStore {
  readonly buy: (identifier: string) => Promise<ThePurchaseTheStoreMade>;
  /** The store's own restore, which Apple allows only in answer to a press. */
  readonly restore: () => Promise<void>;
}

/** What she is left with: the word for the press, and the answer the phone now holds. */
export interface WhereThePressLeftHer {
  readonly did: WhatTheStoreDid;
  readonly entitlement: WhatSheIsEntitledToNow | null;
}

function theCodeOn(raised: unknown): unknown {
  return typeof raised === 'object' && raised !== null
    ? (raised as Record<string, unknown>).code
    : undefined;
}

/** Whether the store refused the press or she stopped it herself. */
export function whatTheStoreDidWith(raised: unknown): 'sheCancelled' | 'itRefusedThePress' {
  return theCodeOn(raised) === THE_CODE_FOR_A_PURCHASE_SHE_CANCELLED
    ? 'sheCancelled'
    : 'itRefusedThePress';
}

async function theAnswerAfterwards(
  using: BuysInTheStore,
  holding: HoldsTheAnswer,
  now: () => Date,
  files: FilesWhatTheStoreNamed,
): Promise<WhereThePressLeftHer> {
  const read = await theEntitlementWhenSheOpens(using, holding, now, files);

  return { did: 'itAnswered', entitlement: read.entitlement };
}

/**
 * The press on a plan.
 *
 * The connection is opened first, because the store refuses a purchase on a connection nobody
 * opened and the refusal reads the same as a store that is down.
 *
 * A transaction that is paid for and never finished is the one failure that takes her money and
 * leaves her with nothing, so the finish happens before the entitlement is read, and a finish that
 * raises is read as a refusal rather than as a purchase.
 */
export async function sheBuys(
  identifier: string,
  using: BuysInTheStore,
  holding: HoldsTheAnswer,
  now: () => Date,
  files: FilesWhatTheStoreNamed = filesNothing,
): Promise<WhereThePressLeftHer> {
  try {
    await using.open();

    const made = await using.buy(identifier);

    await made.finish();
  } catch (raised) {
    return { did: whatTheStoreDidWith(raised), entitlement: null };
  }

  return theAnswerAfterwards(using, holding, now, files);
}

/**
 * The press on Restore purchases. The store is asked once, and the answer is applied through the
 * same read a launch uses, so a year she bought on another phone reaches her the same way.
 *
 * A restore that finds nothing is an answer too. She stays on the paywall holding the state the
 * store named, and no refusal is drawn, because nothing failed.
 */
export async function sheRestores(
  using: BuysInTheStore,
  holding: HoldsTheAnswer,
  now: () => Date,
  files: FilesWhatTheStoreNamed = filesNothing,
): Promise<WhereThePressLeftHer> {
  try {
    await using.open();
    await using.restore();
  } catch (raised) {
    return { did: whatTheStoreDidWith(raised), entitlement: null };
  }

  return theAnswerAfterwards(using, holding, now, files);
}
