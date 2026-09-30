import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';

import { useDatabase } from '../../../data/DatabaseProvider';
import { changeProfileAnswer, readProfile } from '../../../data/profileRepository';
import { ChangeGoals } from '../../../features/settings/ChangeGoals';
import { useProfileVault } from '../../../services/vault/VaultProvider';

/**
 * What she came to Emi for, read out of the one sealed row and written back into it.
 *
 * Each goal draws one card on the screen she opens, so a goal she drops here takes its card with it.
 */
export default function AnswerGoalsRoute(): ReactNode {
  const database = useDatabase();
  const profiles = useProfileVault();
  const router = useRouter();
  const [gave] = useState(() => readProfile(database, profiles)?.goals ?? []);

  return (
    <ChangeGoals
      gave={gave}
      onCancel={() => {
        router.back();
      }}
      onSave={(goals) => {
        changeProfileAnswer(database, profiles, { answer: { goals }, now: new Date() });
        router.back();
      }}
    />
  );
}
