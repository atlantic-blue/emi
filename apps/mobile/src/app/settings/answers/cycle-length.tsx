import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';

import { useDatabase } from '../../../data/DatabaseProvider';
import { changeProfileAnswer, readProfile } from '../../../data/profileRepository';
import { ChangeCycleLength } from '../../../features/settings/ChangeCycleLength';
import { useProfileVault } from '../../../services/vault/VaultProvider';

/**
 * The cycle length, read out of the one sealed row and written back into it.
 *
 * Save returns her to her answers, which opens the row again, and the screen she opens reads it on
 * its own focus. So the forecast follows the new number without either screen being told.
 */
export default function AnswerCycleLengthRoute(): ReactNode {
  const database = useDatabase();
  const profiles = useProfileVault();
  const router = useRouter();
  const [gave] = useState(() => readProfile(database, profiles)?.cycleLengthDays);

  return (
    <ChangeCycleLength
      gave={gave}
      onCancel={() => {
        router.back();
      }}
      onSave={(days) => {
        changeProfileAnswer(database, profiles, {
          answer: { cycleLengthDays: days },
          now: new Date(),
        });
        router.back();
      }}
    />
  );
}
