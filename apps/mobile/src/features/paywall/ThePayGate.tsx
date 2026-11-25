import { usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { readHerSignIn } from '../../services/signIn/herSignIn';
import { theSettingTableHolds } from '../../services/store/theAnswerThePhoneHolds';
import { expoKeychain } from '../../services/vault/keychain';
import { useFirstRun } from '../onboarding/FirstRunProvider';
import { theScreensSheReachesWithoutPaying, whereSheGoesNext } from './whereSheGoesNext';

/**
 * Draws nothing. Emi has no free content, so this sends a woman who has not paid to the sign in
 * and the paywall, wherever in the application she opened.
 *
 * It reads the screen she is on rather than the screen she opened, because a notification press
 * and a link both arrive without passing the first one. The answer comes from the row the launch
 * read left on the phone, so a store that cannot be reached costs her nothing.
 *
 * It says nothing until her answers are written. The first run asks its questions first and ends
 * on the sign in and the paywall itself, and a woman sent to pay before she has answered anything
 * would be sold a product that knows nothing about her.
 */
export function ThePayGate(): null {
  const database = useDatabase();
  const router = useRouter();
  const pathname = usePathname();
  const { isDone } = useFirstRun();

  useEffect(() => {
    if (!isDone || theScreensSheReachesWithoutPaying.includes(pathname)) {
      return undefined;
    }

    const held = theSettingTableHolds(database).read();
    let sheIsStillHere = true;

    void readHerSignIn(expoKeychain()).then((signedIn) => {
      const next = whereSheGoesNext(held, signedIn !== null);

      if (sheIsStillHere && theScreensSheReachesWithoutPaying.includes(next)) {
        router.replace(next);
      }
    });

    return () => {
      sheIsStillHere = false;
    };
  }, [database, isDone, pathname, router]);

  return null;
}
