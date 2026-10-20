import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { WhatEmiIs } from '../../features/onboarding/WhatEmiIs';

/** The welcome comes first, then the tour, then the questions. A tour already read is not shown again. */
export default function WelcomeRoute(): ReactNode {
  const router = useRouter();
  const { tourIsDone } = useFirstRun();

  return (
    <WhatEmiIs
      onContinue={() => router.push(tourIsDone ? '/onboarding/name' : '/onboarding/tour')}
      onWhoCanSee={() => router.push('/settings/who-can-see')}
    />
  );
}
