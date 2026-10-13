import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { ThreePeriods } from '../../features/onboarding/ThreePeriods';

/**
 * The way past is an answer of nothing, so it drops every period rather than only skipping the
 * screen: a row she gave before she read the link would otherwise reach the hold and be written.
 */
export default function ThreePeriodsRoute(): ReactNode {
  const router = useRouter();
  const { periods, givePeriod, removePeriod, forgetTheDates } = useFirstRun();

  return (
    <ThreePeriods
      now={new Date()}
      onBack={() => router.back()}
      onContinue={() => router.push('/onboarding/cycle-length')}
      onGive={givePeriod}
      onRemove={removePeriod}
      onWayPast={() => {
        forgetTheDates();
        router.push('/onboarding/cycle-length');
      }}
      periods={periods}
    />
  );
}
