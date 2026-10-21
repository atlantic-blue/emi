import type { ForecastResult } from '@emi/cycle';
import { useCallback } from 'react';

import { listCycles } from '../../data/cycleRepository';
import type { Database } from '../../data/database';
import { useDatabase } from '../../data/DatabaseProvider';
import { readProfile } from '../../data/profileRepository';
import {
  cancelHerReminder,
  reminderPermission,
  scheduleHerReminder,
} from '../../services/notifications/localReminder';
import type { ProfileVault } from '../../services/vault/profileVault';
import { useProfileVault } from '../../services/vault/VaultProvider';
import { forecastOf } from '../forecast/fromCache';
import { defaultCycleLengthDays } from '../onboarding/firstRun';
import { readReminderLead, reminderNotificationWords, whenToRemindHer } from './reminder';

/** What one reschedule came to. A screen does not read it; a test does. */
export type ReminderOutcome =
  'scheduled' | 'she-chose-none' | 'no-date-yet' | 'the-phone-said-no' | 'the-scheduler-refused';

/**
 * The forecast the home screen draws, read the way the home screen reads it: the cycle cache and
 * the length she stated, or the length every new phone starts from where she stated none.
 */
export function herForecast(db: Database, profiles: ProfileVault): ForecastResult {
  const stated = readProfile(db, profiles)?.cycleLengthDays ?? defaultCycleLengthDays;

  return forecastOf(listCycles(db), stated);
}

/**
 * Works the moment out again from the forecast this phone holds and puts the reminder there, in
 * place of the one before it. A forecast with no range takes the reminder off and keeps her
 * choice, so the first day she logs that gives Emi a date is the day the reminder is scheduled.
 */
export async function rescheduleHerReminder(
  db: Database,
  profiles: ProfileVault,
  now: Date,
): Promise<ReminderOutcome> {
  const lead = readReminderLead(db);

  try {
    if (lead === undefined) {
      await cancelHerReminder();
      return 'she-chose-none';
    }
    if ((await reminderPermission()) === 'refused') {
      return 'the-phone-said-no';
    }

    const moment = whenToRemindHer(herForecast(db, profiles), lead, now);

    if (moment === undefined) {
      await cancelHerReminder();
      return 'no-date-yet';
    }

    await scheduleHerReminder(moment, reminderNotificationWords);
    return 'scheduled';
  } catch {
    // The reminder is the one part of Emi that lives with the operating system, and a scheduler
    // that refuses must not take the screen that asked down with it. The next reschedule tries
    // again.
    return 'the-scheduler-refused';
  }
}

/**
 * What a screen calls after a write that can move the forecast: the hold, a flow she logs, a
 * period she edits. It runs in the background and never holds the screen up.
 */
export function useRescheduleHerReminder(): () => void {
  const database = useDatabase();
  const profiles = useProfileVault();

  return useCallback(() => {
    void rescheduleHerReminder(database, profiles, new Date());
  }, [database, profiles]);
}
