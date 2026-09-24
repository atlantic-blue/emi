import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { WhatEmiDoesWithIt } from '../../features/onboarding/WhatEmiDoesWithIt';

/**
 * The groups come from the answers she is still holding, because nothing is written until the hold.
 */
export default function WhatEmiDoesWithItRoute(): ReactNode {
  const router = useRouter();
  const { focus } = useFirstRun();

  return <WhatEmiDoesWithIt focus={focus} onContinue={() => router.push('/onboarding/hold')} />;
}
