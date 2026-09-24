import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { Feeling } from '../../features/onboarding/Feeling';

export default function FeelingRoute(): ReactNode {
  const router = useRouter();
  const { feeling, setFeeling } = useFirstRun();

  return (
    <Feeling
      chosen={feeling}
      onBack={() => router.back()}
      onChoose={setFeeling}
      onContinue={() => router.push('/onboarding/hold')}
      onSkip={() => {
        setFeeling(undefined);
        router.push('/onboarding/hold');
      }}
    />
  );
}
