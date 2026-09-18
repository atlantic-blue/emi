import { Redirect, useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { HomeScreen } from '../features/home/HomeScreen';
import { useFirstRun } from '../features/onboarding/FirstRunProvider';

/** Nothing recorded means nothing to draw, so a woman who has not answered yet is sent to answer. */
export default function HomeRoute(): ReactNode {
  const { isDone } = useFirstRun();
  const router = useRouter();

  if (!isDone) {
    return <Redirect href="/onboarding/welcome" />;
  }

  return <HomeScreen onLogToday={() => router.push('/log')} />;
}
