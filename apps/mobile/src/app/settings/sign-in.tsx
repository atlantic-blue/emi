import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { TheWayIn } from '../../features/account/TheWayIn';

/**
 * A sign in replaces itself with the account screen, so the way back from there is Settings and
 * never the box for a code that is already spent.
 */
export default function SignInRoute(): ReactNode {
  const router = useRouter();

  return <TheWayIn onSignedIn={() => router.replace('/settings/account')} />;
}
