import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { PeriodLength } from '../../features/onboarding/PeriodLength';
import { lengthsFromHerDates } from '../../features/pastPeriods/pastPeriods';

/** Nothing held is the answer "I am not sure" leaves behind, and it is also where the wheel starts. */
export default function PeriodLengthRoute(): ReactNode {
  const router = useRouter();
  const { periodLengthDays, periods, setPeriodLengthDays } = useFirstRun();

  return (
    <PeriodLength
      chosen={periodLengthDays}
      fromHerDates={lengthsFromHerDates(periods)?.periodLengthDays}
      onBack={() => router.back()}
      onChoose={setPeriodLengthDays}
      onDone={() => router.push('/onboarding/regularity')}
      onNotSure={() => {
        setPeriodLengthDays(undefined);
        router.push('/onboarding/regularity');
      }}
    />
  );
}
