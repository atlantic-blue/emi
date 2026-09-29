import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';

import { useDatabase } from '../../../data/DatabaseProvider';
import { readProfile } from '../../../data/profileRepository';
import { YourAnswers } from '../../../features/settings/YourAnswers';
import { useProfileVault } from '../../../services/vault/VaultProvider';

/**
 * The one sealed profile row, opened once and handed to the screen. Nothing on this screen writes,
 * so the row is read when she arrives and not again.
 */
export default function YourAnswersRoute(): ReactNode {
  const database = useDatabase();
  const profiles = useProfileVault();
  const router = useRouter();
  const [answers] = useState(() => readProfile(database, profiles));

  return <YourAnswers answers={answers} onBack={() => router.back()} />;
}
