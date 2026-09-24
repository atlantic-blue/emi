import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { ThePromise } from '../../features/onboarding/ThePromise';

export default function ThePromiseRoute(): ReactNode {
  const router = useRouter();

  return <ThePromise onContinue={() => router.push('/onboarding/what-emi-does-with-it')} />;
}
