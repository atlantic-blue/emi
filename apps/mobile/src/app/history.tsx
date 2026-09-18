import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

import { useDatabase } from '../data/DatabaseProvider';
import { HistoryScreen } from '../features/history/HistoryScreen';
import { historyNow } from '../features/history/historyNow';
import { useFirstRun } from '../features/onboarding/FirstRunProvider';
import { useVault } from '../services/vault/VaultProvider';

/**
 * Her cycles read back, and the symptoms that came back with them. A day she corrects from here
 * changes what the cycles say, so the rows are read again every time this screen is looked at.
 */
export default function HistoryRoute(): ReactNode {
  const database = useDatabase();
  const vault = useVault();
  const router = useRouter();
  const { isDone } = useFirstRun();
  const [history, setHistory] = useState(() => historyNow(database, vault));

  useFocusEffect(
    useCallback(() => {
      setHistory(historyNow(database, vault));
    }, [database, vault]),
  );

  const leave = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }, [router]);

  if (!isDone) {
    return <Redirect href="/onboarding/welcome" />;
  }

  return (
    <HistoryScreen
      history={history}
      onBack={leave}
      onOpenDay={(day) => router.push(`/day/${day}`)}
    />
  );
}
