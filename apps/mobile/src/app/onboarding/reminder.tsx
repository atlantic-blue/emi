import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { Reminder } from '../../features/onboarding/Reminder';

/**
 * The reminder sits after the first day she logs and before her first forecast. "Remind me" asks
 * the phone and goes on whatever it answers. "Not now" and Skip go on and ask nothing.
 */
export default function ReminderRoute(): ReactNode {
  const router = useRouter();
  const { reminderLead, chooseReminder, forgetTheReminder, askForTheReminder } = useFirstRun();
  const goOn = (): void => {
    router.push('/onboarding/first-forecast');
  };

  return (
    <Reminder
      chosen={reminderLead}
      onBack={() => router.back()}
      onChoose={chooseReminder}
      onNotNow={() => {
        forgetTheReminder();
        goOn();
      }}
      onRemind={() => {
        void askForTheReminder().then(goOn);
      }}
    />
  );
}
