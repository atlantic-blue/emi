import type { Flow } from '@emi/cycle';
import { Redirect, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useReducer, useState } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { ringNow } from '../../features/cycle/ringNow';
import { LogFlow } from '../../features/log/LogFlow';
import { flowLogged, logFlow, unexpectedLogged } from '../../features/log/logDay';
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
      logFlow(database, {
        day: today,
        flow,
        bleedingIsUnexpected: unexpectedLogged(database, today),
        now: new Date(),
      });
      sheWrote();
    },
    [database, today],
  );

  // The write is the whole day, so a mark needs the flow it belongs to. A day she logged no flow
  // on has no bleeding to mark.
  const mark = useCallback(
    (marked: boolean) => {
      const flow = flowLogged(database, today);

      if (flow === undefined) {
        return;
      }

      logFlow(database, { day: today, flow, bleedingIsUnexpected: marked, now: new Date() });
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
      marked={unexpectedLogged(database, today)}
      onDone={() => router.back()}
      onMark={mark}
      onPick={pick}
      ring={ringNow(database, today)}
      today={today}
    />
  );
}
