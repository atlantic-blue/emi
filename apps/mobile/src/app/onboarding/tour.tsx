import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { TourScreen } from '../../features/onboarding/TourScreen';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { tourCards } from '../../features/onboarding/copy';

/**
 * The four cards live in one route and not in four. They ask her nothing, so there is nothing to
 * lose by moving between them, and the way out stays in one place however far through she is.
 */
export default function TourRoute(): ReactNode {
  const router = useRouter();
  const { leaveTheTour } = useFirstRun();
  const [at, setAt] = useState(0);

  const card = tourCards[at] ?? tourCards[0];

  const goOn = (): void => {
    if (at + 1 < tourCards.length) {
      setAt(at + 1);
      return;
    }
    leave();
  };

  const leave = (): void => {
    leaveTheTour();
    // Replaced rather than pushed, so the first question is not sitting on top of a tour she has
    // already left and a press of back does not walk her into it again.
    router.replace('/onboarding/welcome');
  };

  return (
    <TourScreen
      card={card}
      onBack={() => {
        setAt(Math.max(0, at - 1));
      }}
      onNext={goOn}
      onSkip={leave}
    />
  );
}
