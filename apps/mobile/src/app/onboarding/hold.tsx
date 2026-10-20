import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { SaveAndStart } from '../../features/onboarding/SaveAndStart';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';

/**
 * The last screen of the first run, and the only one that writes. The home screen replaces it
 * rather than sitting on top of it, so a press of back does not walk her into a save she has
 * already given.
 *
 * The route keeps the name it has in the mockups and in every link to it.
 */
export default function SaveRoute(): ReactNode {
  const router = useRouter();
  const { writeEverything } = useFirstRun();

  return (
    <SaveAndStart
      onSave={() =>
        writeEverything().then(() => {
          router.replace('/');
        })
      }
    />
  );
}
