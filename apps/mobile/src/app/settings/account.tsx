import { useRouter } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';

import { Account } from '../../features/account/Account';
import { type HerSignIn, readHerSignIn } from '../../services/signIn/herSignIn';
import { expoKeychain } from '../../services/vault/keychain';

export default function AccountRoute(): ReactNode {
  const router = useRouter();
  const [signIn, setSignIn] = useState<HerSignIn | null>(null);

  useEffect(() => {
    let isOpen = true;

    readHerSignIn(expoKeychain())
      .then((held) => {
        if (!isOpen) {
          return;
        }

        if (held === null) {
          router.replace('/settings/sign-in');

          return;
        }

        setSignIn(held);
      })
      .catch(() => {
        if (isOpen) {
          router.replace('/settings/sign-in');
        }
      });

    return () => {
      isOpen = false;
    };
  }, [router]);

  if (signIn === null) {
    return null;
  }

  return <Account onBack={() => router.back()} signIn={signIn} />;
}
