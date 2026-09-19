import { Stack } from 'expo-router';
import type { ReactNode } from 'react';

import { DatabaseProvider } from '../data/DatabaseProvider';
import { LockGate } from '../features/lock/LockGate';
import { FirstRunProvider } from '../features/onboarding/FirstRunProvider';
import { VaultProvider } from '../services/vault/VaultProvider';

/**
 * Both ends of the first run are a replace performed by this navigator rather than by the one
 * under onboarding/. The redirect on the index route replaces it with the onboarding screens, and
 * the last answer replaces those with the index route again. A replace reads the setting off the
 * screen that arrives, so the two screens that arrive carry it, and each end reads as a step
 * forward rather than as a step back.
 *
 * The two screens are named one by one rather than in screenOptions, because four other screens
 * fall back to a replace of the index route when there is nothing to go back to, and leaving a
 * screen is a step back.
 */
export default function RootLayout(): ReactNode {
  return (
    <DatabaseProvider>
      <LockGate>
        <VaultProvider>
          <FirstRunProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" options={{ animationTypeForReplace: 'push' }} />
              <Stack.Screen name="onboarding" options={{ animationTypeForReplace: 'push' }} />
            </Stack>
          </FirstRunProvider>
        </VaultProvider>
      </LockGate>
    </DatabaseProvider>
  );
}
