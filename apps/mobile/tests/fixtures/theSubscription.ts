import type { Database } from '../../src/data/database';
import {
  THE_KEY_THE_ANSWER_IS_HELD_UNDER,
  theSettingTableHolds,
} from '../../src/services/store/theAnswerThePhoneHolds';
import type { WhatSheIsEntitledTo } from '../../src/services/store/theEntitlement';
import { theYearlyPlan } from '../../src/services/store/theProducts';

/**
 * What the phone holds about her subscription, as the launch read writes it.
 *
 * Emi has no free content, so this row decides where she lands: a state that pays for her reaches
 * the application, and every other state reaches the sign in and the paywall. A walk that is about
 * something else holds the paid state and goes where it used to go, and a walk about the paywall
 * holds the state it is about.
 */

/** A year, in milliseconds, so the date held reads as a subscription that has a way to run. */
const aYear = 365 * 24 * 60 * 60 * 1000;

export function herPhoneHoldsTheState(
  database: Database,
  state: WhatSheIsEntitledTo,
  at: Date,
): void {
  theSettingTableHolds(database).hold({
    state,
    until: new Date(at.getTime() + aYear).toISOString(),
    plan: theYearlyPlan.identifier,
    transaction: 'the-first-one',
    readAt: at.toISOString(),
  });
}

/** The App Store pays for her, which is the state every walk past the paywall needs. */
export function theAppStoreIsPayingForHer(database: Database, at: Date): void {
  herPhoneHoldsTheState(database, 'paid', at);
}

/**
 * A phone that worked no answer out yet, which is a fresh install and a phone the store has never
 * answered. The row is emptied rather than written, because a value this version cannot read is a
 * different thing from no value at all.
 */
export function herPhoneKnowsNothingAboutHerSubscription(database: Database): void {
  database.run('DELETE FROM setting WHERE key = ?', [THE_KEY_THE_ANSWER_IS_HELD_UNDER]);
}
