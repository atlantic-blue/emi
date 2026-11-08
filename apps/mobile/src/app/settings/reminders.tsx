import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import {
  readReminderLead,
  readReminderTime,
  reminderTimeMovedBy,
  writeNoReminder,
  writeReminderLead,
  writeReminderTime,
} from '../../features/reminder/reminder';
import { useRescheduleHerReminder } from '../../features/reminder/rescheduleHerReminder';
import { type ReminderSettings, RemindersScreen } from '../../features/settings/RemindersScreen';
import { askToRemindHer } from '../../services/notifications/localReminder';

/**
 * Reminders, opened from Privacy. What the phone holds is read once, when the screen stands up,
 * because it is what Save is compared against.
 */
export default function RemindersRoute(): ReactNode {
  const database = useDatabase();
  const router = useRouter();
  const rescheduleTheReminder = useRescheduleHerReminder();
  const [held] = useState<ReminderSettings>(() => ({
    choice: readReminderLead(database) ?? 'never',
    time: readReminderTime(database),
  }));
  const [holding, setHolding] = useState<ReminderSettings>(held);

  const save = useCallback(() => {
    writeReminderTime(database, holding.time);

    if (holding.choice === 'never') {
      writeNoReminder(database);
      rescheduleTheReminder();
      router.back();
      return;
    }

    writeReminderLead(database, holding.choice);
    // The phone draws its own dialog the first time, and answers at once every time after. A
    // phone that refuses keeps her choice, and the reschedule then puts nothing on it.
    void askToRemindHer()
      .catch(() => 'refused')
      .then(rescheduleTheReminder);
    router.back();
  }, [database, holding, rescheduleTheReminder, router]);

  return (
    <RemindersScreen
      held={held}
      holding={holding}
      onBack={() => router.back()}
      onChoose={(choice) => setHolding((now) => ({ ...now, choice }))}
      onEarlier={() => setHolding((now) => ({ ...now, time: reminderTimeMovedBy(now.time, -1) }))}
      onLater={() => setHolding((now) => ({ ...now, time: reminderTimeMovedBy(now.time, 1) }))}
      onSave={save}
    />
  );
}
