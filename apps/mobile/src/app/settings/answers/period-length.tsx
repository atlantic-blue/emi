import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';

import { useDatabase } from '../../../data/DatabaseProvider';
import { changeProfileAnswer, readProfile } from '../../../data/profileRepository';
import { ChangePeriodLength } from '../../../features/settings/ChangePeriodLength';
import { useProfileVault } from '../../../services/vault/VaultProvider';

/**
 * How long her period runs, read out of the one sealed row and written back into it.
 *
 * The period arc of the ring is drawn at this number until she has logged a period end of her own,
 * so the screen she opens follows the save on its own focus.
 */
export default function AnswerPeriodLengthRoute(): ReactNode {
  const database = useDatabase();
  const profiles = useProfileVault();
  const router = useRouter();
  const [gave] = useState(() => readProfile(database, profiles)?.periodLengthDays);

  return (
    <ChangePeriodLength
      gave={gave}
      onCancel={() => {
        router.back();
      }}
      onSave={(periodLengthDays) => {
        changeProfileAnswer(database, profiles, { answer: { periodLengthDays }, now: new Date() });
        router.back();
      }}
    />
  );
}
