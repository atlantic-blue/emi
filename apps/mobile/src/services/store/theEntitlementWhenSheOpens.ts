import type { HoldsTheAnswer } from './theAnswerThePhoneHolds';
import {
  type ReadsWhatSheHoldsInTheStore,
  type WhatSheIsEntitledToNow,
  type WhatTheStoreSaysAboutATransaction,
  whatTheseTransactionsEntitleHerTo,
} from './theEntitlement';

/**
 * Contract PAY-2. The application asks the App Store what she holds each time it opens, works the
 * answer out, and holds it.
 *
 * A store it cannot reach costs her nothing. The answer the phone already holds stands, untouched,
 * because the alternative is a woman on a train reading a paywall for a year she paid for.
 */

/** Where the answer a caller is given came from. */
export type WhereTheAnswerCameFrom = 'theStore' | 'whatThePhoneHeld' | 'nothingIsKnownYet';

export interface TheAnswerSheOpensWith {
  readonly entitlement: WhatSheIsEntitledToNow | null;
  readonly from: WhereTheAnswerCameFrom;
}

/** A watch on the store, which a caller stops when it goes away. */
export interface TheWatchOnTheStore {
  readonly stop: () => void;
}

/**
 * What every read hands on: the transactions the store named, as it named them. The filing of
 * contract PAY-3 is the one caller, and a read the store refused hands on none, so the identifier
 * already waiting in the setting table still gets its next try.
 */
export type FilesWhatTheStoreNamed = (
  these: readonly WhatTheStoreSaysAboutATransaction[],
) => Promise<void>;

/** A build with nothing to file with, which is every caller that only wants the answer. */
export const filesNothing: FilesWhatTheStoreNamed = () => Promise.resolve();

interface WhatTheStoreSaid {
  readonly transactions: readonly WhatTheStoreSaysAboutATransaction[];
  readonly entitlement: WhatSheIsEntitledToNow;
}

function whatThePhoneHeld(holding: HoldsTheAnswer): TheAnswerSheOpensWith {
  const held = holding.read();

  return { entitlement: held, from: held === null ? 'nothingIsKnownYet' : 'whatThePhoneHeld' };
}

async function workItOut(
  using: ReadsWhatSheHoldsInTheStore,
  now: () => Date,
): Promise<WhatTheStoreSaid> {
  await using.open();

  const transactions = await using.whatSheHolds();

  return { transactions, entitlement: whatTheseTransactionsEntitleHerTo(transactions, now()) };
}

/**
 * The read on launch. A fresh install on her second phone reads the year she already owns, because
 * the App Store hands every transaction of her Apple Account to the application that asks.
 */
export async function theEntitlementWhenSheOpens(
  using: ReadsWhatSheHoldsInTheStore,
  holding: HoldsTheAnswer,
  now: () => Date,
  files: FilesWhatTheStoreNamed = filesNothing,
): Promise<TheAnswerSheOpensWith> {
  let said: WhatTheStoreSaid;

  try {
    said = await workItOut(using, now);
  } catch {
    await files([]);

    return whatThePhoneHeld(holding);
  }

  holding.hold(said.entitlement);
  await files(said.transactions);

  return { entitlement: said.entitlement, from: 'theStore' };
}

/**
 * The watch. A renewal, a purchase on another device and a refund each arrive here with nobody
 * pressing anything, and each one is a reason to ask the store again rather than a reason to trust
 * the one transaction the store named. A read that fails leaves the held answer as it was.
 */
export function watchForATransactionElsewhere(
  using: ReadsWhatSheHoldsInTheStore,
  holding: HoldsTheAnswer,
  now: () => Date,
  files: FilesWhatTheStoreNamed = filesNothing,
): TheWatchOnTheStore {
  const askAgain = async (): Promise<void> => {
    let said: WhatTheStoreSaid;

    try {
      said = await workItOut(using, now);
    } catch {
      await files([]);

      return;
    }

    holding.hold(said.entitlement);
    await files(said.transactions);
  };

  try {
    const watching = using.whenATransactionArrives(() => void askAgain());

    return { stop: () => watching.remove() };
  } catch {
    return { stop: () => undefined };
  }
}
