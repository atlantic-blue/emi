import { Stack } from 'expo-router';
import type { ReactNode } from 'react';

import { theOptionsThePaywallNeeds } from '../../features/paywall/Paywall';

/**
 * The screens of the first run are one sequence, the three questions and the hold that writes
 * their answers, so they move as one. A slide from the right is the forward step, and the same
 * setting reverses it when she goes back. Without this layout the movement is whatever the
 * platform does, which is the movement an unrelated screen gets. The root layout hides the
 * header, and the first run must not grow one here.
 *
 * The sign in and the paywall at the end are named on their own, because a swipe back is the
 * navigator's to refuse and neither screen can close that way out from inside itself.
 */
export default function OnboardingLayout(): ReactNode {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="sign-in" options={theOptionsThePaywallNeeds} />
      <Stack.Screen name="paywall" options={theOptionsThePaywallNeeds} />
    </Stack>
  );
}
