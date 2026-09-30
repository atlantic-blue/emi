import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';

import { useDatabase } from '../../../data/DatabaseProvider';
import { changeProfileAnswer, readProfile } from '../../../data/profileRepository';
import { ChangeRegularity } from '../../../features/settings/ChangeRegularity';
import { useProfileVault } from '../../../services/vault/VaultProvider';

/**
 * How steady she says her cycle is, read out of the one sealed row and written back into it.
 *
 * The answer moves one sentence under the forecast and nothing in the arithmetic, which is what the
 * first run promised when it asked.
 */
export default function AnswerRegularityRoute(): ReactNode {
  const database = useDatabase();
  const profiles = useProfileVault();
  const router = useRouter();
  const [gave] = useState(() => readProfile(database, profiles)?.regularity);

  return (
    <ChangeRegularity
      gave={gave}
      onCancel={() => {
        router.back();
      }}
      onSave={(regularity) => {
        changeProfileAnswer(database, profiles, { answer: { regularity }, now: new Date() });
        router.back();
      }}
    />
  );
}
