import { useFocusEffect, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

import { useDatabase } from '../../../data/DatabaseProvider';
import { theRowSaysSheIsSignedInAs } from '../../../features/account/copy';
import { readReminderLead } from '../../../features/reminder/reminder';
import { SettingsScreen } from '../../../features/settings/SettingsScreen';
import { reminderChoiceSaid } from '../../../features/settings/RemindersScreen';
import { type HerSignIn, readHerSignIn } from '../../../services/signIn/herSignIn';
import { expoKeychain } from '../../../services/vault/keychain';

export default function SettingsRoute(): ReactNode {
  const router = useRouter();
  const database = useDatabase();
  const readTheReminder = useCallback(
    () => reminderChoiceSaid(readReminderLead(database) ?? 'never'),
    [database],
  );
  const [reminder, setReminder] = useState(readTheReminder);
  const [signIn, setSignIn] = useState<HerSignIn | null>(null);

  // Reminders and the sign in are pushed over this screen, so the rows read the phone again when
  // she comes back.
  useFocusEffect(
    useCallback(() => {
      let isFocused = true;

      setReminder(readTheReminder());
      readHerSignIn(expoKeychain())
        .then((held) => {
          if (isFocused) {
            setSignIn(held);
          }
        })
        .catch(() => {
          if (isFocused) {
            setSignIn(null);
          }
        });

      return () => {
        isFocused = false;
      };
    }, [readTheReminder]),
  );

  return (
    <SettingsScreen
      onAccount={() => router.push(signIn === null ? '/settings/sign-in' : '/settings/account')}
      onAnswers={() => router.push('/settings/answers')}
      onBack={() => router.back()}
      onDelete={() => router.push('/settings/delete')}
      onExport={() => router.push('/export')}
      onReminders={() => router.push('/settings/reminders')}
      onWhoCanSee={() => router.push('/settings/who-can-see')}
      reminder={reminder}
      signedInAs={signIn === null ? undefined : theRowSaysSheIsSignedInAs(signIn)}
    />
  );
}
