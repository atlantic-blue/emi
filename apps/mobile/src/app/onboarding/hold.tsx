import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { HoldToBegin } from '../../features/onboarding/HoldToBegin';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';

/**
 * The last screen of the first run, and the only one that writes. The home screen replaces it
 * rather than sitting on top of it, so a press of back does not walk her into a hold she has
 * already given.
 */
export default function HoldRoute(): ReactNode {
  const router = useRouter();
  const { writeEverything } = useFirstRun();

  return (
    <HoldToBegin
      onHeld={() =>
        writeEverything().then(() => {
          // Replaced rather than pushed, so a press of back does not walk her into a hold she
          // has already given.
          router.replace('/');
        })
      }
    />
  );
}
