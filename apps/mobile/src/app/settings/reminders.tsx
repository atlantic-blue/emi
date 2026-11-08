import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import {
  readDailyLogReminder,
  readDailyLogReminderTime,
  writeDailyLogReminder,
  writeDailyLogReminderTime,
} from '../../features/reminder/dailyLogReminder';
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
    dailyLog: readDailyLogReminder(database),
    dailyLogTime: readDailyLogReminderTime(database),
    time: readReminderTime(database),
  }));
  const [holding, setHolding] = useState<ReminderSettings>(held);

  const save = useCallback(() => {
    writeReminderTime(database, holding.time);
    writeDailyLogReminder(database, holding.dailyLog);
    writeDailyLogReminderTime(database, holding.dailyLogTime);

    if (holding.choice === 'never') {
      writeNoReminder(database);
    } else {
      writeReminderLead(database, holding.choice);
    }

    if (holding.choice === 'never' && holding.dailyLog === 'off') {
      rescheduleTheReminder();
      router.back();
      return;
    }

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
      onDailyLog={() =>
        setHolding((now) => ({ ...now, dailyLog: now.dailyLog === 'on' ? 'off' : 'on' }))
      }
      onDailyLogEarlier={() =>
        setHolding((now) => ({ ...now, dailyLogTime: reminderTimeMovedBy(now.dailyLogTime, -1) }))
      }
      onDailyLogLater={() =>
        setHolding((now) => ({ ...now, dailyLogTime: reminderTimeMovedBy(now.dailyLogTime, 1) }))
      }
      onEarlier={() => setHolding((now) => ({ ...now, time: reminderTimeMovedBy(now.time, -1) }))}
      onLater={() => setHolding((now) => ({ ...now, time: reminderTimeMovedBy(now.time, 1) }))}
      onSave={save}
    />
  );
}
