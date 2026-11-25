import type { Database } from '../../src/data/database';
import { theSettingTableHolds } from '../../src/services/store/theAnswerThePhoneHolds';
import { theYearlyPlan } from '../../src/services/store/theProducts';

/** A year, in milliseconds, so the date held reads as a subscription that has a way to run. */
const aYear = 365 * 24 * 60 * 60 * 1000;

/**
 * The App Store pays for her, held on the phone in the row a launch read writes.
 *
 * The end of the first run reads this row: a woman it names as paid goes to her home screen, and a
 * woman it does not is asked to pay. So a walk through the first run that is about something else
 * seeds this and reaches the home screen, and the file about the paywall itself leaves it alone.
 */
export function theAppStoreIsPayingForHer(database: Database, at: Date): void {
  theSettingTableHolds(database).hold({
    state: 'paid',
    until: new Date(at.getTime() + aYear).toISOString(),
    plan: theYearlyPlan.identifier,
    transaction: 'the-first-one',
    readAt: at.toISOString(),
  });
}
