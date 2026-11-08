import {
  SchedulableTriggerInputTypes,
  addNotificationResponseReceivedListener,
  cancelScheduledNotificationAsync,
  getLastNotificationResponseAsync,
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

/** One identifier for each day ahead, so a new run replaces the run before it. */
export function dailyLogReminderIdentifier(slot: number): string {
  return `emi-daily-log-reminder-${String(slot)}`;
}

/** Takes every daily log reminder off the phone. */
export async function cancelHerLogReminders(slots: number): Promise<void> {
  for (let slot = 1; slot <= slots; slot += 1) {
    await cancelScheduledNotificationAsync(dailyLogReminderIdentifier(slot));
  }
}

export interface LogReminders {
  readonly moments: readonly Date[];
  readonly words: string;
  /** The address a press opens. */
  readonly opens: string;
  /** How many identifiers a run can hold, so every one of an earlier run is taken off. */
  readonly slots: number;
}

/** Puts one reminder on the phone for each moment, in place of the run already there. */
export async function scheduleHerLogReminders(reminders: LogReminders): Promise<void> {
  await cancelHerLogReminders(reminders.slots);

  for (const [index, at] of reminders.moments.entries()) {
    await scheduleNotificationAsync({
      identifier: dailyLogReminderIdentifier(index + 1),
      content: { body: reminders.words, data: { url: reminders.opens } },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: at },
    });
  }
}

interface APress {
  readonly notification: {
    readonly date?: number;
    readonly request: {
      readonly identifier: string;
      readonly content: { readonly data?: unknown };
    };
  };
}

function addressOf(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null || !('url' in data)) {
    return undefined;
  }

  return typeof data.url === 'string' ? data.url : undefined;
}

/**
 * Calls `open` with the address a reminder carries when she presses it, including the press that
 * opened Emi, which the phone reports twice. A reminder with no address, such as the period
 * reminder, opens Emi where it was.
 */
export function onAReminderPressed(open: (address: string) => void): () => void {
  let lastPress: string | undefined;
  const opened = (press: APress | null): void => {
    if (press === null) {
      return;
    }

    const address = addressOf(press.notification.request.content.data);
    const which = `${press.notification.request.identifier} ${String(press.notification.date)}`;

    if (address === undefined || which === lastPress) {
      return;
    }
    lastPress = which;
    open(address);
  };
  const listening = addNotificationResponseReceivedListener(opened);

  void getLastNotificationResponseAsync()
    .then(opened)
    .catch(() => undefined);

  return () => listening.remove();
}
