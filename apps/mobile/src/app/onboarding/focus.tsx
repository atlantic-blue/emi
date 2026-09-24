import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { Focus } from '../../features/onboarding/Focus';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';

export default function FocusRoute(): ReactNode {
  const router = useRouter();
  const { focus, pressFocus, forgetTheFocus } = useFirstRun();

  return (
    <Focus
      chosen={focus}
      onBack={() => router.back()}
      onContinue={() => router.push('/onboarding/today')}
      onPress={pressFocus}
      onSkip={() => {
        forgetTheFocus();
        router.push('/onboarding/today');
      }}
    />
  );
}
