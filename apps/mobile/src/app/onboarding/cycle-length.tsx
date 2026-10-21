import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { CycleLength } from '../../features/onboarding/CycleLength';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { lengthsFromHerDates } from '../../features/pastPeriods/pastPeriods';

export default function CycleLengthRoute(): ReactNode {
  const router = useRouter();
  const { cycleLengthDays, periods, setCycleLengthDays } = useFirstRun();

  return (
    <CycleLength
      chosen={cycleLengthDays}
      fromHerDates={lengthsFromHerDates(periods)?.cycleLengthDays}
      onBack={() => router.back()}
      onChoose={setCycleLengthDays}
      onDone={() => router.push('/onboarding/period-length')}
    />
  );
}
