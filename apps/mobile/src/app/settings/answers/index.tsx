import { useFocusEffect, useRouter } from 'expo-router';
import { type ReactNode, useCallback, useState } from 'react';

import { useDatabase } from '../../../data/DatabaseProvider';
import { readProfile } from '../../../data/profileRepository';
import { YourAnswers } from '../../../features/settings/YourAnswers';
import { theScreenEachRowOpens } from '../../../features/settings/herAnswers';
import { useProfileVault } from '../../../services/vault/VaultProvider';

/**
 * The one sealed profile row, opened and handed to the screen.
 *
 * It is opened again every time she looks at this screen, because the screens it opens write to
 * that row and come back here. Reading it once at the first render would leave a row saying the
 * answer she just changed away from.
 */
export default function YourAnswersRoute(): ReactNode {
  const database = useDatabase();
  const profiles = useProfileVault();
  const router = useRouter();
  const [answers, setAnswers] = useState(() => readProfile(database, profiles));

  useFocusEffect(
    useCallback(() => {
      setAnswers(readProfile(database, profiles));
    }, [database, profiles]),
  );

  return (
    <YourAnswers
      answers={answers}
      onBack={() => {
        router.back();
      }}
      onOpen={(row) => {
        router.push(theScreenEachRowOpens[row]);
      }}
    />
  );
}
