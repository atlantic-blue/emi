import {
  SchedulableTriggerInputTypes,
  cancelScheduledNotificationAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
} from 'expo-notifications';

/**
 * The one way Emi reaches her while it is closed: a notification this phone schedules and this
 * phone raises. Nothing here asks for a push token, registers for remote notifications or opens a
 * connection, so the words and the moment never leave the phone. The only calls are to the
 * scheduler of the operating system.
 */

/**
 * One identifier for the one reminder. A new schedule under it replaces the old one, so a forecast
 * that moves can never leave two reminders behind it.
 */
export const reminderIdentifier = 'emi-period-reminder';

/** What the reminder can do on this phone, as the operating system answers. */
export type ReminderPermission = 'allowed' | 'refused';

function permissionOf(answer: { readonly granted: boolean }): ReminderPermission {
  return answer.granted ? 'allowed' : 'refused';
}

/**
 * Asks the phone once. The system draws the dialog and writes every word of it. A phone that has
 * already been answered returns that answer without a dialog, which is the behaviour of the
 * operating system and not of Emi.
 */
export async function askToRemindHer(): Promise<ReminderPermission> {
  const answer = await requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });

  return permissionOf(answer);
}

/** Reads the answer she already gave, and never draws the dialog. */
export async function reminderPermission(): Promise<ReminderPermission> {
  return permissionOf(await getPermissionsAsync());
}

/** Takes the reminder off the phone, whether one is scheduled or not. */
export async function cancelHerReminder(): Promise<void> {
  await cancelScheduledNotificationAsync(reminderIdentifier);
}

/** Puts the one reminder on the phone at that moment, in place of any reminder already there. */
export async function scheduleHerReminder(at: Date, words: string): Promise<void> {
  await cancelHerReminder();
  await scheduleNotificationAsync({
    identifier: reminderIdentifier,
    content: { body: words },
    trigger: { type: SchedulableTriggerInputTypes.DATE, date: at },
  });
}
