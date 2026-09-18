import type { Flow } from '@emi/cycle';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useReducer, useState } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { ringNow } from '../../features/cycle/ringNow';
import { DayRefused } from '../../features/log/DayRefused';
import { LogFlow } from '../../features/log/LogFlow';
import { editFlow, flowOn, refusalFor } from '../../features/log/editDay';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { localDay } from '../../features/onboarding/days';

/**
 * A day she already lived, opened from its own address. The ring beside the picker is the cycle she
 * is in today rather than a ring for that day, because what a corrected Tuesday changes is where
 * she stands now.
 */
export default function DayRoute(): ReactNode {
  const database = useDatabase();
  const router = useRouter();
  const { isDone } = useFirstRun();
  const { date } = useLocalSearchParams<{ date: string }>();
  const [today] = useState(() => localDay(new Date()));
  // A write lands in the database, which React cannot see, so the write says it happened and the
  // day and the ring are read again on the render that follows.
  const [, sheWrote] = useReducer((writes: number) => writes + 1, 0);

  const day = String(date ?? '');
  const refusal = refusalFor({ day, today });

  const leave = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }, [router]);

  const pick = useCallback(
    (flow: Flow) => {
      editFlow(database, { day, flow, now: new Date(), today });
      sheWrote();
    },
    [database, day, today],
  );

  if (!isDone) {
    return <Redirect href="/onboarding/welcome" />;
  }

  if (refusal !== undefined) {
    return <DayRefused onBack={leave} refusal={refusal} />;
  }

  return (
    <LogFlow
      chosen={flowOn(database, { day, today })}
      day={day}
      onDone={leave}
      onPick={pick}
      ring={ringNow(database, today)}
      today={today}
    />
  );
}
