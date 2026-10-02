import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { nameSheGave } from '../../features/onboarding/firstRun';
import { YearOfBirth } from '../../features/onboarding/YearOfBirth';

export default function YearOfBirthRoute(): ReactNode {
  const router = useRouter();
  const { birthYear, nameTyped, setBirthYear } = useFirstRun();

  return (
    <YearOfBirth
      chosen={birthYear}
      name={nameSheGave(nameTyped)}
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
