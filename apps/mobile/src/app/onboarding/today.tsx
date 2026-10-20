import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { Today } from '../../features/onboarding/Today';

export default function TodayRoute(): ReactNode {
  const router = useRouter();
  const { symptoms, pressSymptom, forgetToday } = useFirstRun();

  return (
    <Today
      chosen={symptoms}
      onAllSymptoms={() => router.push('/onboarding/all-symptoms')}
      onBack={() => router.back()}
      onPress={pressSymptom}
      onSave={() => router.push('/onboarding/reminder')}
      onSkip={() => {
        forgetToday();
        router.push('/onboarding/reminder');
      }}
    />
  );
}
