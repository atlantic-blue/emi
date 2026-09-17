import { Stack } from 'expo-router';
import type { ReactNode } from 'react';

import { DatabaseProvider } from '../data/DatabaseProvider';
import { FirstRunProvider } from '../features/onboarding/FirstRunProvider';

export default function RootLayout(): ReactNode {
  return (
    <DatabaseProvider>
      <FirstRunProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </FirstRunProvider>
    </DatabaseProvider>
  );
}
