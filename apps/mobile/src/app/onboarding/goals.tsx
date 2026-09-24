import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { Goals } from '../../features/onboarding/Goals';

export default function GoalsRoute(): ReactNode {
  const router = useRouter();
  const { goals, pressGoal, forgetTheGoals } = useFirstRun();

  return (
    <Goals
      chosen={goals}
      onBack={() => router.back()}
      onContinue={() => router.push('/onboarding/hold')}
      onPress={pressGoal}
      onSkip={() => {
        forgetTheGoals();
        router.push('/onboarding/hold');
      }}
    />
  );
}
