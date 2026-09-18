import { Stack } from 'expo-router';
import type { ReactNode } from 'react';

import { DatabaseProvider } from '../data/DatabaseProvider';
import { FirstRunProvider } from '../features/onboarding/FirstRunProvider';
import { VaultProvider } from '../services/vault/VaultProvider';

export default function RootLayout(): ReactNode {
  return (
    <DatabaseProvider>
      <VaultProvider>
        <FirstRunProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </FirstRunProvider>
      </VaultProvider>
    </DatabaseProvider>
  );
}
