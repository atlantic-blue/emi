import { GluestackUIProvider } from '@emi/ui';
import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DatabaseProvider } from '../data/DatabaseProvider';
import { theNavigatorGround } from '../features/chrome/theme';
import { LockGate } from '../features/lock/LockGate';
import { FirstRunProvider } from '../features/onboarding/FirstRunProvider';
import { Fonts } from '../features/type/Fonts';
import { VaultProvider } from '../services/vault/VaultProvider';

import '../../global.css';

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
 *
 * `(tabs)` is the group holding the four screens the dock reaches. The group carries no segment,
 * so the screens inside it keep their addresses, and the screens named beside it are pushed on top
 * of the dock rather than beside it, which is what gives a day and the delete screen a way back.
 */
export default function RootLayout(): ReactNode {
  // Stone is a light ground, so the clock and the battery are drawn in dark ink over it. The style
  // is set here rather than by the component of the same name: that component reads the colour
  // scheme through a store subscription the runner cannot settle while its timers are held, and
  // every test that drives the router then waits for a screen that never arrives.
  useEffect(() => {
    StatusBar.setStyle('dark');
  }, []);

  return (
    <Fonts>
      <SafeAreaProvider>
        <GluestackUIProvider mode="light">
          <DatabaseProvider>
            <LockGate>
              <VaultProvider>
                <FirstRunProvider>
                  <ThemeProvider value={theNavigatorGround}>
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="(tabs)" options={{ animationTypeForReplace: 'push' }} />
                      <Stack.Screen
                        name="onboarding"
                        options={{ animationTypeForReplace: 'push' }}
                      />
                    </Stack>
                  </ThemeProvider>
                </FirstRunProvider>
              </VaultProvider>
            </LockGate>
          </DatabaseProvider>
        </GluestackUIProvider>
      </SafeAreaProvider>
    </Fonts>
  );
}
