import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { Regularity } from '../../features/onboarding/Regularity';

export default function RegularityRoute(): ReactNode {
  const router = useRouter();
  const { regularity, setRegularity } = useFirstRun();

  return (
    <Regularity
      chosen={regularity}
      onBack={() => router.back()}
      onChoose={setRegularity}
      onContinue={() => router.push('/onboarding/feeling')}
      onSkip={() => {
        setRegularity(undefined);
        router.push('/onboarding/feeling');
      }}
    />
  );
}
