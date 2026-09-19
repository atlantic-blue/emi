import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DatabaseProvider } from '../data/DatabaseProvider';
import { LockGate } from '../features/lock/LockGate';
import { FirstRunProvider } from '../features/onboarding/FirstRunProvider';
import { VaultProvider } from '../services/vault/VaultProvider';

export default function RootLayout(): ReactNode {
  // Stone is a light ground, so the clock and the battery are drawn in dark ink over it. The style
  // is set here rather than by the component of the same name: that component reads the colour
  // scheme through a store subscription the runner cannot settle while its timers are held, and
  // every test that drives the router then waits for a screen that never arrives.
  useEffect(() => {
    StatusBar.setStyle('dark');
  }, []);

  return (
    <SafeAreaProvider>
      <DatabaseProvider>
        <LockGate>
          <VaultProvider>
            <FirstRunProvider>
              <Stack screenOptions={{ headerShown: false }} />
            </FirstRunProvider>
          </VaultProvider>
        </LockGate>
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}
