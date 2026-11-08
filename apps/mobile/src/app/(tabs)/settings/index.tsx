import { useFocusEffect, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

import { useDatabase } from '../../../data/DatabaseProvider';
import { readReminderLead } from '../../../features/reminder/reminder';
import { SettingsScreen } from '../../../features/settings/SettingsScreen';
import { reminderChoiceSaid } from '../../../features/settings/RemindersScreen';

export default function SettingsRoute(): ReactNode {
  const router = useRouter();
  const database = useDatabase();
  const readTheReminder = useCallback(
    () => reminderChoiceSaid(readReminderLead(database) ?? 'never'),
    [database],
  );
  const [reminder, setReminder] = useState(readTheReminder);

  // Reminders is pushed over this screen, so the row reads the phone again when she comes back.
  useFocusEffect(
    useCallback(() => {
      setReminder(readTheReminder());
    }, [readTheReminder]),
  );

  return (
    <SettingsScreen
      onAnswers={() => router.push('/settings/answers')}
      onBack={() => router.back()}
      onDelete={() => router.push('/settings/delete')}
      onExport={() => router.push('/export')}
      onReminders={() => router.push('/settings/reminders')}
      onWhoCanSee={() => router.push('/settings/who-can-see')}
      reminder={reminder}
    />
  );
}
