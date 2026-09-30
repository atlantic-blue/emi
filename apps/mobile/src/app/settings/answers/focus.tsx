import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';

import { useDatabase } from '../../../data/DatabaseProvider';
import { changeProfileAnswer, readProfile } from '../../../data/profileRepository';
import { ChangeFocus } from '../../../features/settings/ChangeFocus';
import { useProfileVault } from '../../../services/vault/VaultProvider';

/**
 * What she says changes with her cycle, read out of the one sealed row and written back into it.
 *
 * The order is the answer: the log sheet draws her groups in it, so the first tile she presses here
 * is the first heading she reads the next time she logs a day.
 */
export default function AnswerFocusRoute(): ReactNode {
  const database = useDatabase();
  const profiles = useProfileVault();
  const router = useRouter();
  const [gave] = useState(() => readProfile(database, profiles)?.focus ?? []);

  return (
    <ChangeFocus
      gave={gave}
      onCancel={() => {
        router.back();
      }}
      onSave={(focus) => {
        changeProfileAnswer(database, profiles, { answer: { focus }, now: new Date() });
        router.back();
      }}
    />
  );
}
