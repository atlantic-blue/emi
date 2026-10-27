import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { HerName } from '../../features/onboarding/HerName';
import { nameIsInRange } from '../../features/onboarding/firstRun';

export default function NameRoute(): ReactNode {
  const router = useRouter();
  const { nameTyped, setNameTyped } = useFirstRun();

  return (
    <HerName
      onBack={() => router.back()}
      onContinue={() => router.push('/onboarding/year-of-birth')}
      onSkip={() => {
        if (!nameIsInRange(nameTyped)) {
          setNameTyped('');
        }
        router.push('/onboarding/year-of-birth');
      }}
      onType={setNameTyped}
      typed={nameTyped}
    />
  );
}
