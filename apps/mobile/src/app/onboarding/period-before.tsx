import { Redirect, useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { PeriodBefore } from '../../features/onboarding/PeriodBefore';

export default function PeriodBeforeRoute(): ReactNode {
  const router = useRouter();
  const { periodStartedOn, periodBeforeStartedOn, setPeriodBeforeStartedOn } = useFirstRun();

  // Every day on this screen is measured from the one before it, so a woman who reaches it
  // without that answer is sent back to give it rather than shown a month of nothing.
  if (periodStartedOn === undefined) {
    return <Redirect href="/onboarding/last-period" />;
  }

  return (
    <PeriodBefore
      chosen={periodBeforeStartedOn}
      lastPeriodStartedOn={periodStartedOn}
      now={new Date()}
      onAdd={() => router.push('/onboarding/cycle-length')}
      onBack={() => router.back()}
      onChoose={setPeriodBeforeStartedOn}
      onSkip={() => {
        setPeriodBeforeStartedOn(undefined);
        router.push('/onboarding/cycle-length');
      }}
    />
  );
}
