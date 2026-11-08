import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { onAReminderPressed } from '../../services/notifications/localReminder';
import { theEntryOfToday } from './dailyLogReminder';

/**
 * Opens the entry of today when she presses the daily log reminder. Any other address a
 * notification carries is not one Emi wrote, so it opens nothing. It draws nothing.
 */
export function ReminderPresses(): ReactNode {
  const router = useRouter();

  useEffect(
    () =>
      onAReminderPressed((address) => {
        if (address === theEntryOfToday) {
          router.push(theEntryOfToday);
        }
      }),
    [router],
  );

  return null;
}
