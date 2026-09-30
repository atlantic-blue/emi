import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';

import { useDatabase } from '../../../data/DatabaseProvider';
import { changeProfileAnswer, readProfile } from '../../../data/profileRepository';
import { ChangeFeeling } from '../../../features/settings/ChangeFeeling';
import { useProfileVault } from '../../../services/vault/VaultProvider';

/**
 * How she feels about her cycle, read out of the one sealed row and written back into it.
 *
 * It chooses the line the screen she opens carries on a period day, so the save shows there.
 */
export default function AnswerFeelingRoute(): ReactNode {
  const database = useDatabase();
  const profiles = useProfileVault();
  const router = useRouter();
  const [gave] = useState(() => readProfile(database, profiles)?.feeling);

  return (
    <ChangeFeeling
      gave={gave}
      onCancel={() => {
        router.back();
      }}
      onSave={(feeling) => {
        changeProfileAnswer(database, profiles, { answer: { feeling }, now: new Date() });
        router.back();
      }}
    />
  );
}
