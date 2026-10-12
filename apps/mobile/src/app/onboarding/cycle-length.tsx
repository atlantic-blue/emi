import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { CycleLength } from '../../features/onboarding/CycleLength';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';

export default function CycleLengthRoute(): ReactNode {
  const router = useRouter();
  const { cycleLengthDays, setCycleLengthDays } = useFirstRun();

  return (
    <CycleLength
      chosen={cycleLengthDays}
      onBack={() => router.back()}
      onChoose={setCycleLengthDays}
      onDone={() => router.push('/onboarding/period-length')}
    />
  );
}
