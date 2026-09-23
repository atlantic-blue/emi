import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { WhatEmiIs } from '../../features/onboarding/WhatEmiIs';

export default function WelcomeRoute(): ReactNode {
  const router = useRouter();

  return <WhatEmiIs onContinue={() => router.push('/onboarding/name')} />;
}
