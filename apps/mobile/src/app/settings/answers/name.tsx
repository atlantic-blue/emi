import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';

import { useDatabase } from '../../../data/DatabaseProvider';
import { changeProfileAnswer, readProfile } from '../../../data/profileRepository';
import { ChangeName } from '../../../features/settings/ChangeName';
import { useProfileVault } from '../../../services/vault/VaultProvider';

/**
 * Her name, read out of the one sealed row and written back into it.
 *
 * Save returns her to her answers, and the screen she opens reads the row on its own focus, so the
 * greeting at the top of it follows the new name without either screen being told.
 */
export default function AnswerNameRoute(): ReactNode {
  const database = useDatabase();
  const profiles = useProfileVault();
  const router = useRouter();
  const [gave] = useState(() => readProfile(database, profiles)?.name);

  return (
    <ChangeName
      gave={gave}
      onCancel={() => {
        router.back();
      }}
      onSave={(name) => {
        changeProfileAnswer(database, profiles, { answer: { name }, now: new Date() });
        router.back();
      }}
    />
  );
}
