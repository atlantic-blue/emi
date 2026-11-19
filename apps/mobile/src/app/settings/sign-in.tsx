import { useRouter } from 'expo-router';
import { openAuthSessionAsync } from 'expo-web-browser';
import { type ReactNode, useMemo } from 'react';

import { SignInFlow } from '../../features/account/SignInFlow';
import { localDay } from '../../features/onboarding/days';
import { theAppSignIn } from '../../services/signIn/theAppSignIn';
import { expoKeychain } from '../../services/vault/keychain';

/**
 * A sign in replaces itself with the account screen, so the way back from there is Settings and
 * never the box for a code that is already spent.
 */
export default function SignInRoute(): ReactNode {
  const router = useRouter();
  const keychain = useMemo(() => expoKeychain(), []);

  return (
    <SignInFlow
      keychain={keychain}
      onSignedIn={() => router.replace('/settings/account')}
      openTheSession={openAuthSessionAsync}
      signIn={theAppSignIn}
      today={() => localDay(new Date())}
    />
  );
}
