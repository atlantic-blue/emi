import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';

import { useDatabase } from '../../../data/DatabaseProvider';
import { changeProfileAnswer, readProfile } from '../../../data/profileRepository';
import { ChangeBirthYear } from '../../../features/settings/ChangeBirthYear';
import { useProfileVault } from '../../../services/vault/VaultProvider';

/**
 * The year she was born, read out of the one sealed row and written back into it.
 *
 * The clock is read once, when she opens the screen, because the newest year the wheel offers moves
 * with it and a wheel that grew a year under her would move the row she was looking at.
 */
export default function AnswerBirthYearRoute(): ReactNode {
  const database = useDatabase();
  const profiles = useProfileVault();
  const router = useRouter();
  const [now] = useState(() => new Date());
  const [gave] = useState(() => readProfile(database, profiles)?.birthYear);

  return (
    <ChangeBirthYear
      gave={gave}
      now={now}
      onCancel={() => {
        router.back();
      }}
      onSave={(birthYear) => {
        changeProfileAnswer(database, profiles, { answer: { birthYear }, now: new Date() });
        router.back();
      }}
    />
  );
}
