import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { SaveAndStart } from '../../features/onboarding/SaveAndStart';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { whereSheGoesNext } from '../../features/paywall/whereSheGoesNext';
import { readHerSignIn } from '../../services/signIn/herSignIn';
import { theSettingTableHolds } from '../../services/store/theAnswerThePhoneHolds';
import { expoKeychain } from '../../services/vault/keychain';

/**
 * The last screen of the first run that asks her anything, and the only one that writes. The sign
 * in and the paywall come after it, so her answers are in the database before she is asked for an
 * account and before she is asked for money. A woman the store already pays for is asked for
 * neither, and goes home.
 *
 * Whichever screen arrives replaces this one rather than sitting on top of it, so a press of back
 * does not walk her into a save she has already given.
 *
 * The route keeps the name it has in the mockups and in every link to it.
 */
export default function SaveRoute(): ReactNode {
  const router = useRouter();
  const database = useDatabase();
  const { writeEverything } = useFirstRun();

  return (
    <SaveAndStart
      onSave={() =>
        writeEverything()
          .then(() => readHerSignIn(expoKeychain()))
          .then((signedIn) => {
            router.replace(
              whereSheGoesNext(theSettingTableHolds(database).read(), signedIn !== null),
            );
          })
      }
    />
  );
}
