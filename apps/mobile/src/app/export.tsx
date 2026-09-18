import { Redirect, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';

import { useDatabase } from '../data/DatabaseProvider';
import { ExportScreen } from '../features/export/ExportScreen';
import type { WrittenFile } from '../features/export/destination';
import { exportEverything } from '../features/export/exportNow';
import { expoDestination } from '../features/export/expoDestination';
import { useFirstRun } from '../features/onboarding/FirstRunProvider';
import { useVault } from '../services/vault/VaultProvider';

/**
 * The two files, made on her phone. The sharing sheet is asked whether it exists before the screen
 * offers a button to it, because a phone with nothing to share to would otherwise show a button
 * that opens nothing.
 */
export default function ExportRoute(): ReactNode {
  const database = useDatabase();
  const vault = useVault();
  const router = useRouter();
  const { isDone } = useFirstRun();
  const [destination] = useState(() => expoDestination());
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    let looking = true;

    destination
      .canShare()
      .then((answer) => {
        if (looking) {
          setCanShare(answer);
        }
      })
      .catch(() => undefined);

    return () => {
      looking = false;
    };
  }, [destination]);

  const leave = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }, [router]);

  const make = useCallback(
    () => exportEverything(database, vault, destination, new Date()),
    [database, destination, vault],
  );

  const share = useCallback((file: WrittenFile) => destination.share(file), [destination]);

  if (!isDone) {
    return <Redirect href="/onboarding/welcome" />;
  }

  return <ExportScreen canShare={canShare} onBack={leave} onExport={make} onShare={share} />;
}
