import type { Flow } from '@emi/cycle';
import { Redirect, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useReducer, useState } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { ringNow } from '../../features/cycle/ringNow';
import { LogFlow } from '../../features/log/LogFlow';
import { flowLogged, logFlow } from '../../features/log/logDay';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { localDay } from '../../features/onboarding/days';

export default function LogFlowRoute(): ReactNode {
  const database = useDatabase();
  const router = useRouter();
  const { isDone } = useFirstRun();
  const [today] = useState(() => localDay(new Date()));
  // A write lands in the database, which React cannot see, so the write says it happened and the
  // day and the ring are read again on the render that follows.
  const [, sheWrote] = useReducer((writes: number) => writes + 1, 0);

  const pick = useCallback(
    (flow: Flow) => {
      logFlow(database, { day: today, flow, now: new Date() });
      sheWrote();
    },
    [database, today],
  );

  if (!isDone) {
    return <Redirect href="/onboarding/welcome" />;
  }

  return (
    <LogFlow
      chosen={flowLogged(database, today)}
      day={today}
      onDone={() => router.back()}
      onPick={pick}
      ring={ringNow(database, today)}
      today={today}
    />
  );
}
