import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { YearOfBirth } from '../../features/onboarding/YearOfBirth';

export default function YearOfBirthRoute(): ReactNode {
  const router = useRouter();
  const { birthYear, setBirthYear } = useFirstRun();

  return (
    <YearOfBirth
      chosen={birthYear}
      now={new Date()}
      onBack={() => router.back()}
      onChoose={setBirthYear}
      onContinue={() => router.push('/onboarding/last-period')}
      onSkip={() => {
        setBirthYear(undefined);
        router.push('/onboarding/last-period');
      }}
    />
  );
}
