import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { TheWayIn } from '../../features/account/TheWayIn';
import { thePaywallOfTheFirstRun } from '../../features/paywall/whereSheGoesNext';

/**
 * The same sign in Settings reaches, standing between her written answers and the paywall. A
 * purchase belongs to an account, so the account comes first.
 *
 * It carries no way past it and no way back: the screen draws neither, the layout refuses the
 * swipe, and the paywall behind it replaces this screen rather than sitting on top of it.
 */
export default function SignInRoute(): ReactNode {
  const router = useRouter();

  return <TheWayIn onSignedIn={() => router.replace(thePaywallOfTheFirstRun)} />;
}
