import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { SaveAndStart } from '../../features/onboarding/SaveAndStart';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { theSettingTableHolds } from '../../services/store/theAnswerThePhoneHolds';
import { sheIsPaidUp } from '../../services/store/thePurchase';

/**
 * The last screen of the first run that asks her anything, and the only one that writes. The
 * paywall replaces it once the write is done, so her answers are in the database before she is
 * asked for money. A woman the store already pays for is never asked, and goes home.
 *
 * Whichever one arrives replaces this screen rather than sitting on top of it, so a press of back
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
        writeEverything().then(() => {
          router.replace(
            sheIsPaidUp(theSettingTableHolds(database).read()) ? '/' : '/onboarding/paywall',
          );
        })
      }
    />
  );
}
