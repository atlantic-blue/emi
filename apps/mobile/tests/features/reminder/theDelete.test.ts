import { migrate } from '../../../src/data/schema';
import { writeSetting } from '../../../src/data/settingRepository';
import { scheduleHerReminder } from '../../../src/services/notifications/localReminder';
import type { ServerDelete } from '../../../src/services/sync/deleteAccount';
import { deleteEverything, nothingIsLeft } from '../../../src/services/vault/wipe';
import { openTestDatabase } from '../../data/nodeDatabase';
import {
  resetExpoNotifications,
  theRemindersOnThePhone,
  thePhoneWasAnswered,
  theSchedulerRefuses,
} from '../../fixtures/expoNotifications';
import { memorySecureStore } from '../../fixtures/secureStore';

jest.mock('expo-notifications', () => jest.requireActual('../../fixtures/expoNotifications'));

const aServerThatTookIt: ServerDelete = () => Promise.resolve('gone');

/** A phone holding her choice and the reminder it scheduled from it. */
async function aPhoneWithAReminder() {
  const db = openTestDatabase();

  migrate(db);
  writeSetting(db, 'reminderLead', 'twoDaysBefore');
  thePhoneWasAnswered('allow');
  await scheduleHerReminder(new Date('2026-06-04T09:00:00'), 'A reminder from Emi');

  return db;
}

describe('delete everything takes the reminder off the phone', () => {
  beforeEach(() => {
    resetExpoNotifications();
  });

  it('leaves no reminder scheduled, so nothing is raised for a forecast that is gone', async () => {
    const db = await aPhoneWithAReminder();

    expect(theRemindersOnThePhone()).toHaveLength(1);

    const outcome = await deleteEverything(db, memorySecureStore(), aServerThatTookIt);

    expect(theRemindersOnThePhone()).toEqual([]);
    expect(outcome.reminderLeft).toBe(false);
    expect(nothingIsLeft(outcome)).toBe(true);
  });

  it('says the delete did not finish where the scheduler kept the reminder', async () => {
    const db = await aPhoneWithAReminder();
    theSchedulerRefuses();

    const outcome = await deleteEverything(db, memorySecureStore(), aServerThatTookIt);

    expect(outcome.reminderLeft).toBe(true);
    expect(outcome.rowsLeft).toBe(0);
    expect(nothingIsLeft(outcome)).toBe(false);
  });
});
