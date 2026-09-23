import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { LastPeriod } from '../../features/onboarding/LastPeriod';

export default function LastPeriodRoute(): ReactNode {
  const router = useRouter();
  const { periodStartedOn, setPeriodStartedOn } = useFirstRun();

  return (
    <LastPeriod
      chosen={periodStartedOn}
      now={new Date()}
      onBack={() => router.back()}
      onChoose={setPeriodStartedOn}
      onContinue={() => router.push('/onboarding/cycle-length')}
    />
  );
}
