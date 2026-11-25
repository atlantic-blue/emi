import type { Database } from '../../data/database';
import { theSettingTableHolds } from './theAnswerThePhoneHolds';
import type { WhatSheIsEntitledTo } from './theEntitlement';

/**
 * Contract PAY-4. The one question a write of a record she entered asks before it writes.
 *
 * The answer comes from the row the launch read left on the phone, and never from the store. So
 * the gate answers in the time one statement takes, with no network. A woman with no signal keeps
 * writing.
 *
 * Reading, the history, the export and the delete ask nothing here. They stay open in every
 * state, for ever, which is the floor contracts PAY-4 and WIRE-5 put under this gate.
 */

/** The two states a new write is refused in, and the only two. */
export const theStatesAWriteIsRefusedIn: readonly WhatSheIsEntitledTo[] = ['lapsed', 'refunded'];

/**
 * Whether a state lets her write.
 *
 * A state nobody worked out yet is allowed, and so is never paid. No paywall exists yet, so every
 * woman on a build today is in one of those two states. A refusal there locks all of them out of
 * the product they test.
 */
export function aWriteIsAllowedIn(state: WhatSheIsEntitledTo | null): boolean {
  return state === null || !theStatesAWriteIsRefusedIn.includes(state);
}

/** The state the phone holds, and nothing where this phone worked no answer out yet. */
export function theStateThePhoneHolds(db: Database): WhatSheIsEntitledTo | null {
  return theSettingTableHolds(db).read()?.state ?? null;
}

/** The gate. Every write of a day asks this first, and writes nothing when it answers no. */
export function sheMayWrite(db: Database): boolean {
  return aWriteIsAllowedIn(theStateThePhoneHolds(db));
}
