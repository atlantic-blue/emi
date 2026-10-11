import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { TourScreen } from '../../features/onboarding/TourScreen';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';

/**
 * The tour comes after the welcome and before the first question. Reading it and skipping it end
 * in the same place, so both leave by one path.
 */
export default function TourRoute(): ReactNode {
  const router = useRouter();
  const { isDone, leaveTheTour } = useFirstRun();

  const leave = (): void => {
    leaveTheTour();
    // Replaced rather than pushed, so a press of back from the first question does not walk her
    // into a tour she has already left. A woman whose answers are already held goes home.
    router.replace(isDone ? '/' : '/onboarding/name');
  };

  return <TourScreen onNext={leave} onSkip={leave} />;
}
