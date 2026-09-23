import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { PeriodLength } from '../../features/onboarding/PeriodLength';
import { defaultPeriodLengthDays } from '../../features/onboarding/firstRun';

export default function PeriodLengthRoute(): ReactNode {
  const router = useRouter();
  const { periodLengthDays, setPeriodLengthDays } = useFirstRun();

  // Nothing held is the answer "I am not sure" leaves behind, so the stepper opens on the number
  // the screen offers and Done is what turns that number into her answer.
  const shown = periodLengthDays ?? defaultPeriodLengthDays;

  return (
    <PeriodLength
      days={shown}
      onBack={() => router.back()}
      onChange={setPeriodLengthDays}
      onDone={() => {
        setPeriodLengthDays(shown);
        router.push('/onboarding/regularity');
      }}
      onNotSure={() => {
        setPeriodLengthDays(undefined);
        router.push('/onboarding/regularity');
      }}
    />
  );
}
