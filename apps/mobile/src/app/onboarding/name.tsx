import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { HerName } from '../../features/onboarding/HerName';

export default function NameRoute(): ReactNode {
  const router = useRouter();
  const { nameTyped, setNameTyped } = useFirstRun();

  return (
    <HerName
      onBack={() => router.back()}
      onContinue={() => router.push('/onboarding/year-of-birth')}
      onSkip={() => {
        setNameTyped('');
        router.push('/onboarding/year-of-birth');
      }}
      onType={setNameTyped}
      typed={nameTyped}
    />
  );
}
