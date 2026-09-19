import { Stack } from 'expo-router';
import type { ReactNode } from 'react';

/**
 * The three screens of the first run are one sequence of questions, so they move as one. A slide
 * from the right is the forward step, and the same setting reverses it when she goes back. Without
 * this layout the movement is whatever the platform does, which is the movement an unrelated screen
 * gets. The root layout hides the header, and the first run must not grow one here.
 */
export default function OnboardingLayout(): ReactNode {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
